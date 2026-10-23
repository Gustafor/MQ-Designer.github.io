/** Type definitions matching backend models */

export type TaskStatus = 
  | 'pending' 
  | 'assigned' 
  | 'running' 
  | 'completed' 
  | 'failed' 
  | 'cancelled' 
  | 'needs_review' 
  | 'revision_requested';

export type TaskType = 
  | 'research' 
  | 'architecture' 
  | 'coding' 
  | 'review' 
  | 'testing' 
  | 'documentation' 
  | 'quick_fix' 
  | 'vision' 
  | 'refactoring' 
  | 'strategy' 
  | 'data_pipeline' 
  | 'core_implementation';

export type WorkerType = 
  | 'chief' 
  | 'researcher' 
  | 'coder' 
  | 'reviewer' 
  | 'tester' 
  | 'documenter';

export type WorkerStatus = 'idle' | 'busy' | 'offline' | 'error';

export interface TaskInput {
  prompt: string;
  context_files: string[];
  dependencies: string[];
  metadata: Record<string, any>;
}

export interface TaskOutput {
  files_created: string[];
  files_modified: string[];
  summary: string;
  artifacts: Record<string, any>;
  tokens_used: number;
  cost_usd: number;
  model_used: string;
  variant_used: string;
}

export interface Task {
  id: string;
  title: string;
  type: TaskType;
  status: TaskStatus;
  priority: number;
  input: TaskInput;
  output: TaskOutput | null;
  assigned_worker: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  error: string | null;
  retry_count: number;
  max_retries: number;
}

export interface WorkerConfig {
  id: string;
  name: string;
  type: WorkerType;
  model: string;
  variant: string;
  system_prompt: string;
  capabilities: string[];
  max_concurrent: number;
}

export interface WorkerState {
  id: string;
  config: WorkerConfig;
  status: WorkerStatus;
  current_task_id: string | null;
  tasks_completed: number;
  tasks_failed: number;
  total_tokens: number;
  total_cost_usd: number;
  last_heartbeat: string;
}

export interface GraphNode {
  id: string;
  type: 'chief' | 'worker' | 'task' | 'artifact';
  position: { x: number; y: number };
  data: Record<string, any>;
  style?: Record<string, any>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: 'default' | 'delegation' | 'dependency' | 'artifact';
  animated: boolean;
  label?: string;
  style?: Record<string, any>;
}

export interface QueueStats {
  pending: number;
  assigned: number;
  running: number;
  completed: number;
  failed: number;
  needs_review: number;
  total: number;
}

export interface LimitsState {
  go_monthly_limit_usd: number;
  go_spent_usd: number;
  free_models_unlimited: boolean;
  alert_threshold_pct: number;
  auto_fallback: boolean;
  by_model: Record<string, { tokens: number; cost: number; requests: number }>;
  remaining_usd: number;
  usage_pct: number;
  is_alert: boolean;
}

export interface GraphSnapshot {
  nodes: GraphNode[];
  edges: GraphEdge[];
  limits: LimitsState;
  queue_stats: QueueStats;
  timestamp: string;
}

export interface ChiefPlan {
  goal: string;
  tasks: Task[];
  created_at: string;
  updated_at: string;
  status: string;
}

export interface WebSocketMessage {
  type: 'graph_update' | 'task_update' | 'limits_update' | 'log' | 'worker_status' | 'plan_created' | 'task_created';
  payload: any;
  timestamp: string;
}

export interface ModelConfig {
  model_id: string;
  variant: string;
  context_window: number;
  privacy_required: boolean;
  estimated_cost_usd: number;
  max_tokens_per_request: number;
}

export interface StatusSummary {
  chief: {
    has_plan: boolean;
    plan_tasks: number;
  };
  workers: {
    workers_total: number;
    workers_idle: number;
    workers_busy: number;
    workers_offline: number;
    active_tasks: number;
    total_completed: number;
    total_failed: number;
    total_cost_usd: number;
    total_tokens: number;
    by_worker: Record<string, any>;
  };
  queue: QueueStats;
  limits: LimitsState;
  timestamp: string;
}