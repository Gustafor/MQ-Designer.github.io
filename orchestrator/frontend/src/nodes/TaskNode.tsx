/** Task Node Component */

import { Handle, Position, NodeProps } from 'reactflow'
import { 
  FileCode, 
  Search, 
  Shield, 
  TestTube, 
  FileText,
  Zap,
  Eye,
  Hammer,
  GitBranch,
  Database,
  Brain,
} from 'lucide-react'
import { useStore } from '../store'
import type { TaskStatus, TaskType } from '../types'

interface TaskNodeData {
  label: string
  full_title: string
  type: TaskType
  status: TaskStatus
  priority: number
  tokens: number
  cost: number
}

const typeIcons: Record<TaskType, React.ComponentType<{ className?: string }>> = {
  research: Search,
  architecture: Brain,
  coding: FileCode,
  review: Shield,
  testing: TestTube,
  documentation: FileText,
  quick_fix: Zap,
  vision: Eye,
  refactoring: Hammer,
  strategy: GitBranch,
  data_pipeline: Database,
  core_implementation: FileCode,
}

const statusStyles: Record<TaskStatus, { bg: string; border: string; text: string }> = {
  pending: { bg: 'bg-slate-500/20', border: 'border-slate-500', text: 'text-slate-400' },
  assigned: { bg: 'bg-blue-500/20', border: 'border-blue-500', text: 'text-blue-400' },
  running: { bg: 'bg-yellow-500/20', border: 'border-yellow-500 animate-pulse', text: 'text-yellow-400' },
  completed: { bg: 'bg-green-500/20', border: 'border-green-500', text: 'text-green-400' },
  failed: { bg: 'bg-red-500/20', border: 'border-red-500', text: 'text-red-400' },
  cancelled: { bg: 'bg-gray-500/20', border: 'border-gray-500', text: 'text-gray-400' },
  needs_review: { bg: 'bg-purple-500/20', border: 'border-purple-500', text: 'text-purple-400' },
  revision_requested: { bg: 'bg-orange-500/20', border: 'border-orange-500', text: 'text-orange-400' },
}

const priorityColors = {
  1: 'bg-red-500',
  2: 'bg-red-500',
  3: 'bg-orange-500',
  4: 'bg-orange-500',
  5: 'bg-yellow-500',
  6: 'bg-yellow-500',
  7: 'bg-green-500',
  8: 'bg-green-500',
  9: 'bg-blue-500',
  10: 'bg-blue-500',
}

export function TaskNode({ data, id }: NodeProps<TaskNodeData>) {
  const { label, full_title, type, status, priority, tokens, cost } = data
  const { selectedNodeId, setSelectedNodeId } = useStore()
  
  const isSelected = selectedNodeId === id
  const Icon = typeIcons[type] || FileCode
  const styles = statusStyles[status]
  
  return (
    <div
      className={`group relative w-60 h-36 rounded-xl border-2 transition-all duration-300 ${
        isSelected 
          ? 'shadow-[0_0_0_2px_rgb(139,92,246)] shadow-lg' 
          : ''
      } ${styles.bg} ${styles.border} dark:bg-dark-900`}
      onClick={() => setSelectedNodeId(isSelected ? null : id)}
    >
      {/* Status badge */}
      <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles.text} ${styles.bg.replace('/20', '')}`}>
          {status.replace('_', ' ').toUpperCase()}
        </span>
        <div className="flex items-center gap-1">
          <span className={`w-2 h-2 rounded-full ${priorityColors[priority as keyof typeof priorityColors] || 'bg-gray-500'}`} />
          <span className="text-xs text-dark-400 dark:text-dark-500">P{priority}</span>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-3 h-full flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Icon className={`w-5 h-5 ${styles.text}`} />
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate text-dark-900 dark:text-dark-100" title={full_title}>
                {label}
              </p>
              <p className="text-xs text-dark-500 dark:text-dark-400 capitalize">{type.replace('_', ' ')}</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between text-xs text-dark-500 dark:text-dark-400">
          <div className="flex items-center gap-1">
            <Zap className="w-3 h-3" />
            <span>{tokens.toLocaleString()} tokens</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-green-500">$</span>
            <span>{cost.toFixed(4)}</span>
          </div>
        </div>
      </div>
      
      {/* Handles */}
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-current border-2 border-white/50" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-current border-2 border-white/50" />
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-current border-2 border-white/50" />
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-current border-2 border-white/50" />
    </div>
  )
}