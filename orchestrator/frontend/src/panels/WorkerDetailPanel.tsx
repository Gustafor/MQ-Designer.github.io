/** Worker Detail Panel */

import { useStore } from '../store'
import { 
  Bot, 
  Cpu, 
  Zap, 
  DollarSign, 
  CheckCircle, 
  XCircle,
  Clock,
  Settings,
  Brain,
} from 'lucide-react'
import { format } from 'date-fns'
import type { WorkerState, WorkerStatus } from '../types'

const statusConfig = {
  idle: { label: 'Idle', color: 'text-green-500 bg-green-500/10', icon: CheckCircle },
  busy: { label: 'Busy', color: 'text-yellow-500 bg-yellow-500/10', icon: Clock },
  offline: { label: 'Offline', color: 'text-gray-500 bg-gray-500/10', icon: XCircle },
  error: { label: 'Error', color: 'text-red-500 bg-red-500/10', icon: XCircle },
} as const

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  researcher: Search,
  coder: Code,
  reviewer: Shield,
  tester: TestTube,
  documenter: FileText,
  chief: Crown,
}

import { Search, Code, Shield, TestTube, FileText, Crown } from 'lucide-react'

export function WorkerDetailPanel() {
  const { selectedNodeId, workers, setSidebarOpen } = useStore()
  
  // Find worker by node ID
  const workerId = selectedNodeId?.replace('worker-', '')
  const worker = workers.find(w => w.id === workerId)
  
  if (!worker) {
    return (
      <div className="panel flex flex-col items-center justify-center h-64 text-center">
        <Bot className="w-16 h-16 text-dark-300 dark:text-dark-600 mb-4" />
        <h3 className="font-medium text-dark-900 dark:text-dark-100">No Worker Selected</h3>
        <p className="text-dark-500 dark:text-dark-400 text-sm mt-1">
          Click on a worker node to view details
        </p>
      </div>
    )
  }
  
  const config = statusConfig[worker.status]
  const Icon = config.icon
  const TypeIcon = typeIcons[worker.config.type] || Bot
  
  return (
    <div className="panel flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl bg-gradient-to-br ${getTypeGradient(worker.config.type)}`}>
            <TypeIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-dark-900 dark:text-dark-100">{worker.config.name}</h3>
            <p className="text-sm text-dark-500 dark:text-dark-400 capitalize">{worker.config.type}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
            <Icon className="w-3 h-3 mr-1" />
            {config.label}
          </span>
          <button onClick={() => setSidebarOpen(false)} className="btn-ghost p-2">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Model info */}
      <div className="mb-4 p-3 rounded-lg bg-dark-50 dark:bg-dark-800/50 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-dark-500 dark:text-dark-400" />
            <span className="text-sm font-medium text-dark-900 dark:text-dark-100">Model</span>
          </div>
          <span className="font-mono text-xs px-2 py-0.5 rounded bg-dark-100 dark:bg-dark-700">
            {worker.config.model}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-dark-500 dark:text-dark-400" />
            <span className="text-sm font-medium text-dark-900 dark:text-dark-100">Variant</span>
          </div>
          <span className="badge badge-purple">{worker.config.variant}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-dark-500 dark:text-dark-400" />
            <span className="text-sm font-medium text-dark-900 dark:text-dark-100">Max Concurrent</span>
          </div>
          <span className="font-mono text-sm">{worker.config.max_concurrent}</span>
        </div>
      </div>
      
      {/* Metrics */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        <MetricCard 
          label="Completed" 
          value={worker.tasks_completed} 
          icon={CheckCircle} 
          color="green" 
        />
        <MetricCard 
          label="Failed" 
          value={worker.tasks_failed} 
          icon={XCircle} 
          color="red" 
        />
        <MetricCard 
          label="Cost" 
          value={`$${worker.total_cost_usd.toFixed(4)}`} 
          icon={DollarSign} 
          color="blue" 
        />
      </div>
      
      <div className="grid grid-cols-3 gap-3 mb-4">
        <MetricCard 
          label="Tokens" 
          value={worker.total_tokens.toLocaleString()} 
          icon={Zap} 
          color="purple" 
        />
        <MetricCard 
          label="Avg Latency" 
          value="—" // Would need to calculate from metrics
          icon={Clock} 
          color="orange" 
        />
        <MetricCard 
          label="Last Active" 
          value={worker.last_heartbeat ? format(new Date(worker.last_heartbeat), 'HH:mm:ss') : '—'} 
          icon={Clock} 
          color="gray" 
        />
      </div>
      
      {/* Current task */}
      {worker.current_task_id && (
        <div className="mb-4 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
            <span className="font-medium text-sm text-yellow-800 dark:text-yellow-400">Current Task</span>
          </div>
          <span className="font-mono text-sm text-yellow-700 dark:text-yellow-300">{worker.current_task_id}</span>
        </div>
      )}
      
      {/* Capabilities */}
      <div className="flex-1 overflow-y-auto">
        <h4 className="font-medium text-sm text-dark-500 dark:text-dark-400 mb-2">Capabilities</h4>
        <div className="flex flex-wrap gap-1">
          {worker.config.capabilities.map((cap) => (
            <span key={cap} className="badge badge-secondary text-xs">{cap}</span>
          ))}
        </div>
        
        <h4 className="font-medium text-sm text-dark-500 dark:text-dark-400 mt-4 mb-2">System Prompt</h4>
        <div className="p-3 rounded-lg bg-dark-100 dark:bg-dark-800 text-xs text-dark-600 dark:text-dark-400 max-h-40 overflow-y-auto">
          {worker.config.system_prompt}
        </div>
      </div>
    </div>
  )
}

function MetricCard({ label, value, icon: Icon, color }: { 
  label: string; 
  value: string | number; 
  icon: React.ComponentType<{ className?: string }>;
  color: 'green' | 'red' | 'blue' | 'purple' | 'orange' | 'gray';
}) {
  const colorMap = {
    green: 'text-green-500 bg-green-500/10',
    red: 'text-red-500 bg-red-500/10',
    blue: 'text-blue-500 bg-blue-500/10',
    purple: 'text-purple-500 bg-purple-500/10',
    orange: 'text-orange-500 bg-orange-500/10',
    gray: 'text-gray-500 bg-gray-500/10',
  }
  
  return (
    <div className="p-3 rounded-lg bg-dark-50 dark:bg-dark-800/50">
      <div className="flex items-center gap-2 mb-1">
        <span className={`p-1.5 rounded ${colorMap[color]}`}>
          <Icon className="w-4 h-4" />
        </span>
        <span className="text-xs text-dark-500 dark:text-dark-400">{label}</span>
      </div>
      <p className="font-bold text-lg text-dark-900 dark:text-dark-100">{value}</p>
    </div>
  )
}

function getTypeGradient(type: string): string {
  const gradients: Record<string, string> = {
    researcher: 'from-blue-500 to-blue-700',
    coder: 'from-green-500 to-green-700',
    reviewer: 'from-orange-500 to-orange-700',
    tester: 'from-cyan-500 to-cyan-700',
    documenter: 'from-indigo-500 to-indigo-700',
    chief: 'from-purple-500 to-purple-700',
  }
  return gradients[type] || 'from-gray-500 to-gray-700'
}