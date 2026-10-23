/** Chief Architect Node Component */

import { Handle, Position, NodeProps } from 'reactflow'
import { Brain, Zap, Crown } from 'lucide-react'
import { useStore } from '../store'

interface ChiefNodeData {
  label: string
  model: string
  variant: string
  status: 'active' | 'idle'
}

export function ChiefNode({ data }: NodeProps<ChiefNodeData>) {
  const { label, model, variant, status } = data
  const { selectedNodeId, setSelectedNodeId } = useStore()
  
  const isSelected = selectedNodeId === 'chief'
  const isActive = status === 'active'
  
  return (
    <div
      className={`group relative w-56 h-28 rounded-xl border-2 transition-all duration-300 ${
        isSelected 
          ? 'border-primary-500 shadow-[0_0_0_2px_rgb(139,92,246)] shadow-lg' 
          : 'border-purple-500/50 dark:border-purple-900/50'
      } ${isActive ? 'animate-pulse-slow' : ''} bg-gradient-to-br from-purple-600 to-purple-800 text-white`}
      onClick={() => setSelectedNodeId(isSelected ? null : 'chief')}
    >
      {/* Status indicator */}
      <div className="absolute top-2 right-2 flex items-center gap-1">
        <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
        <Crown className="w-4 h-4 text-yellow-300" />
      </div>
      
      {/* Content */}
      <div className="p-4 h-full flex flex-col justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-6 h-6 text-purple-200" />
          <div>
            <p className="font-semibold text-lg">{label}</p>
            <p className="text-xs text-purple-200/80">Chief Architect</p>
          </div>
        </div>
        
        <div className="flex items-center justify-between text-xs text-purple-200/70">
          <div className="flex items-center gap-1">
            <Zap className="w-3 h-3" />
            <span>{model.split('/').pop()}</span>
          </div>
          <span className="px-2 py-0.5 rounded bg-white/10 backdrop-blur-sm">
            {variant}
          </span>
        </div>
      </div>
      
      {/* Handles */}
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-purple-500 border-2 border-white" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-purple-500 border-2 border-white" />
      <Handle type="source" position={Position.Left} className="w-3 h-3 bg-purple-500 border-2 border-white" />
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-purple-500 border-2 border-white" />
    </div>
  )
}