/** Worker Node Component */

import { Handle, Position, NodeProps } from 'reactflow'
import { 
  Bot, 
  Search, 
  Code, 
  Shield, 
  TestTube, 
  FileText,
  Activity,
  Cpu
} from 'lucide-react'
import { useStore } from '../store'

interface WorkerNodeData {
  label: string
  type: string
  model: string
  variant: string
  status: string
  current_task: string | null
  completed: number
}

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  researcher: Search,
  coder: Code,
  reviewer: Shield,
  tester: TestTube,
  documenter: FileText,
  chief: Crown,
}

const typeColors: Record<string, string> = {
  researcher: 'bg-blue-600 border-blue-500',
  coder: 'bg-green-600 border-green-500',
  reviewer: 'bg-orange-600 border-orange-500',
  tester: 'bg-cyan-600 border-cyan-500',
  documenter: 'bg-indigo-600 border-indigo-500',
  chief: 'bg-purple-600 border-purple-500',
}

const statusColors: Record<string, string> = {
  idle: 'bg-green-500',
  busy: 'bg-yellow-500 animate-pulse',
  offline: 'bg-gray-500',
  error: 'bg-red-500',
}

export function WorkerNode({ data, id }: NodeProps<WorkerNodeData>) {
  const { label, type, model, variant, status, current_task, completed } = data
  const { selectedNodeId, setSelectedNodeId } = useStore()
  
  const isSelected = selectedNodeId === id
  const Icon = typeIcons[type] || Bot
  const bgColor = typeColors[type] || 'bg-gray-600 border-gray-500'
  const statusColor = statusColors[status] || 'bg-gray-500'
  
  return (
    <div
      className={`group relative w-48 h-32 rounded-xl border-2 transition-all duration-300 ${
        isSelected 
          ? 'shadow-[0_0_0_2px_rgb(139,92,246)] shadow-lg' 
          : ''
      } ${bgColor} text-white`}
      onClick={() => setSelectedNodeId(isSelected ? null : id)}
    >
      {/* Status indicator */}
      <div className="absolute top-2 right-2 flex items-center gap-1">
        <div className={`w-2 h-2 rounded-full ${statusColor}`} />
        <Activity className={`w-4 h-4 ${status === 'busy' ? 'animate-spin' : ''}`} />
      </div>
      
      {/* Content */}
      <div className="p-3 h-full flex flex-col justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-white/90" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold truncate">{label}</p>
            <p className="text-xs text-white/70 capitalize">{type}</p>
          </div>
        </div>
        
        <div className="flex items-center justify-between text-xs text-white/70">
          <div className="flex items-center gap-1">
            <Cpu className="w-3 h-3" />
            <span className="truncate max-w-[100px]">{model.split('/').pop()}</span>
          </div>
          <span className="px-1.5 py-0.5 rounded bg-white/10 backdrop-blur-sm">
            {variant}
          </span>
        </div>
        
        {current_task && (
          <div className="text-xs text-yellow-200 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
            Working on task...
          </div>
        )}
        
        <div className="text-xs text-white/50 flex items-center justify-between">
          <span>Completed: {completed}</span>
          {current_task && (
            <span className="px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300">
              BUSY
            </span>
          )}
        </div>
      </div>
      
      {/* Handles */}
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-white/50 border-2 border-white" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-white/50 border-2 border-white" />
      <Handle type="source" position={Position.Left} className="w-3 h-3 bg-white/50 border-2 border-white" />
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-white/50 border-2 border-white" />
    </div>
  )
}