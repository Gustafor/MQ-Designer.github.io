"""OpenCode Wrapper - executes OpenCode CLI with specified model/variant and captures results."""

from __future__ import annotations

import asyncio
import json
import os
import subprocess
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import structlog

from .models import ModelConfig, OpencodeResult

logger = structlog.get_logger(__name__)


@dataclass
class OpencodeConfig:
    """OpenCode execution configuration."""
    binary: str = "opencode"
    working_dir: Path = Path.cwd()
    timeout_seconds: int = 300
    env: Optional[Dict[str, str]] = None


class OpencodeWrapper:
    """Wrapper for OpenCode CLI execution."""
    
    def __init__(self, config: Optional[OpencodeConfig] = None):
        self.config = config or OpencodeConfig()
        self._env = os.environ.copy()
        if config and config.env:
            self._env.update(config.env)
    
    async def execute(
        self,
        prompt: str,
        model: ModelConfig,
        context_files: Optional[List[str]] = None,
        system_prompt: Optional[str] = None,
    ) -> OpencodeResult:
        """Execute OpenCode with given prompt and model."""
        start_time = time.perf_counter()
        
        # Build command
        cmd = [
            self.config.binary,
            "-m", model.model_id,
        ]
        
        if model.variant and model.variant != "medium":
            cmd.extend(["-v", model.variant])
        
        # Prepare prompt with context
        full_prompt = self._build_prompt(prompt, context_files, system_prompt)
        
        # Write prompt to temp file for large prompts
        prompt_file = self.config.working_dir / ".opencode_prompt_tmp.md"
        prompt_file.write_text(full_prompt, encoding="utf-8")
        
        try:
            # Execute
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=self.config.working_dir,
                env=self._env,
            )
            
            try:
                stdout, stderr = await asyncio.wait_for(
                    process.communicate(input=full_prompt.encode()),
                    timeout=self.config.timeout_seconds,
                )
            except asyncio.TimeoutError:
                process.kill()
                await process.wait()
                return OpencodeResult(
                    success=False,
                    stdout="",
                    stderr=f"Timeout after {self.config.timeout_seconds}s",
                    returncode=-1,
                    execution_time_ms=int((time.perf_counter() - start_time) * 1000),
                )
            
            execution_time = int((time.perf_counter() - start_time) * 1000)
            
            # Parse output for token usage (if available in output)
            tokens_input, tokens_output, tokens_cached = self._parse_token_usage(stdout.decode())
            cost_usd = self._estimate_cost(model.model_id, tokens_input, tokens_output, tokens_cached)
            
            return OpencodeResult(
                success=process.returncode == 0,
                stdout=stdout.decode(),
                stderr=stderr.decode(),
                returncode=process.returncode,
                tokens_input=tokens_input,
                tokens_output=tokens_output,
                tokens_cached=tokens_cached,
                cost_usd=cost_usd,
                model_used=model.model_id,
                variant_used=model.variant,
                execution_time_ms=execution_time,
            )
            
        finally:
            # Cleanup temp file
            try:
                prompt_file.unlink(missing_ok=True)
            except Exception:
                pass
    
    def _build_prompt(
        self,
        prompt: str,
        context_files: Optional[List[str]] = None,
        system_prompt: Optional[str] = None,
    ) -> str:
        """Build full prompt with context files and system prompt."""
        parts = []
        
        if system_prompt:
            parts.append(f"<system>\n{system_prompt}\n</system>\n")
        
        if context_files:
            parts.append("<context_files>")
            for file_path in context_files:
                try:
                    path = Path(file_path)
                    if path.exists() and path.is_file():
                        content = path.read_text(encoding="utf-8")
                        parts.append(f"\n<file path=\"{file_path}\">\n{content}\n</file>\n")
                except Exception as e:
                    logger.warning("failed_to_read_context_file", file=file_path, error=str(e))
            parts.append("</context_files>\n")
        
        parts.append(f"<task>\n{prompt}\n</task>")
        
        return "\n".join(parts)
    
    def _parse_token_usage(self, output: str) -> Tuple[int, int, int]:
        """Parse token usage from OpenCode output if available."""
        # OpenCode may output token usage in various formats
        # This is a best-effort parsing
        tokens_input = 0
        tokens_output = 0
        tokens_cached = 0
        
        # Look for patterns like "Tokens: 1,234 in / 567 out / 89 cached"
        import re
        patterns = [
            r"Tokens?:\s*(\d+)\s*(?:in|input)\s*/\s*(\d+)\s*(?:out|output)\s*(?:/\s*(\d+)\s*cached)?",
            r"Input:\s*(\d+)\s*Output:\s*(\d+)\s*Cached:\s*(\d+)",
            r"(\d+)\s*input\s*/\s*(\d+)\s*output",
        ]
        
        for pattern in patterns:
            match = re.search(pattern, output, re.IGNORECASE)
            if match:
                tokens_input = int(match.group(1))
                tokens_output = int(match.group(2))
                tokens_cached = int(match.group(3)) if match.lastindex >= 3 and match.group(3) else 0
                break
        
        return tokens_input, tokens_output, tokens_cached
    
    def _estimate_cost(self, model_id: str, input_tokens: int, output_tokens: int, cached_tokens: int) -> float:
        """Estimate cost based on known pricing."""
        # Pricing per 1M tokens (same as ModelRegistry)
        pricing: Dict[str, Tuple[float, float, float]] = {
            "opencode-go/glm-5.3-flash": (0.15, 0.50, 0.03),
            "opencode-go/glm-5.3": (1.40, 4.40, 0.26),
            "opencode-go/glm-5.2": (1.40, 4.40, 0.26),
            "opencode-go/kimi-k3": (3.00, 15.00, 0.30),
            "opencode-go/kimi-k2.7-code": (0.95, 4.00, 0.19),
            "opencode-go/deepseek-v4.1-flash": (0.30, 1.20, 0.006),
            "opencode-go/deepseek-v4-pro": (1.32, 3.96, 0.044),
            "opencode-go/minimax-m3": (0.30, 1.20, 0.06),
            "opencode-go/minimax-m3.1-flash": (0.15, 0.60, 0.015),
            "opencode-go/longcat-2.0": (0.30, 1.20, 0.006),
            "opencode-go/grok-4.7": (2.00, 6.00, 0.50),
            "opencode-go/gpt-6-luna": (0.10, 0.50, 0.01),
            "opencode-go/gpt-5.6-luna": (0.20, 1.20, 0.02),
            "opencode-go/claude-haiku-5-5": (0.10, 0.50, 0.01),
            "opencode-go/gemini-4-argon-contributor": (4.00, 20.00, 0.20),
            "opencode-go/muse-spark-1.3-contributor": (0.10, 0.20, 0.002),
            "opencode-go/muse-spark-1.2-contributor": (0.10, 0.20, 0.002),
            # Free models
            "opencode/beam-free": (0.0, 0.0, 0.0),
            "opencode/nemotron-3-ultra-free": (0.0, 0.0, 0.0),
            "opencode/nemotron-3.5-super-vl-free": (0.0, 0.0, 0.0),
            "opencode/nemotron-3.5-lightning-free": (0.0, 0.0, 0.0),
            "opencode/flint-40b-free": (0.0, 0.0, 0.0),
            "opencode/deepseek-v4.1-flash-free": (0.0, 0.0, 0.0),
            "opencode/glm-5.3-flash-free": (0.0, 0.0, 0.0),
            "opencode/mimo-v2.6-flash-free": (0.0, 0.0, 0.0),
            "opencode/big-pickle": (0.0, 0.0, 0.0),
        }
        
        input_price, output_price, cached_price = pricing.get(model_id, (0.0, 0.0, 0.0))
        cost = (
            (input_tokens / 1_000_000) * input_price +
            (output_tokens / 1_000_000) * output_price +
            (cached_tokens / 1_000_000) * cached_price
        )
        return round(cost, 6)
    
    async def check_available(self) -> bool:
        """Check if OpenCode CLI is available."""
        try:
            process = await asyncio.create_subprocess_exec(
                self.config.binary, "--version",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            await process.wait()
            return process.returncode == 0
        except Exception:
            return False
    
    async def list_models(self) -> List[str]:
        """List available models from OpenCode."""
        try:
            process = await asyncio.create_subprocess_exec(
                self.config.binary, "models", "--json",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await process.communicate()
            if process.returncode == 0:
                data = json.loads(stdout.decode())
                return [m.get("id", "") for m in data.get("models", [])]
        except Exception:
            pass
        return []


class MockOpencodeWrapper(OpencodeWrapper):
    """Mock wrapper for testing without OpenCode CLI."""
    
    async def execute(
        self,
        prompt: str,
        model: ModelConfig,
        context_files: Optional[List[str]] = None,
        system_prompt: Optional[str] = None,
    ) -> OpencodeResult:
        """Mock execution - returns simulated result."""
        await asyncio.sleep(0.1)  # Simulate latency
        
        # Generate mock response based on prompt
        mock_response = f"""# Mock Response from {model.model_id} ({model.variant})

## Task Analysis
{prompt[:200]}...

## Generated Output
This is a simulated response for testing the orchestrator.
In production, this would be actual code/files from OpenCode.

## Files Created
- `src/generated_example.py` (simulated)

## Summary
Task completed successfully with {model.model_id} variant {model.variant}.
"""
        
        return OpencodeResult(
            success=True,
            stdout=mock_response,
            stderr="",
            returncode=0,
            tokens_input=len(prompt) // 4,
            tokens_output=len(mock_response) // 4,
            tokens_cached=0,
            cost_usd=0.0,
            model_used=model.model_id,
            variant_used=model.variant,
            execution_time_ms=100,
        )