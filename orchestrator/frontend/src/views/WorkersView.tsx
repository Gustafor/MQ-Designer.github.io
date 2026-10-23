/** Workers View */

import { useStore } from '../store'
import { WorkerDetailPanel } from '../panels/WorkerDetailPanel'
import { 
  Bot, 
  Cpu, 
  CheckCircle, 
  XCircle, 
  Clock,
  Zap,
  DollarSign,
  Brain,
  Activity,
} from 'lucide-react'
import { format } from 'date-fns'
import type { WorkerState, WorkerStatus } from '../types'

const statusConfig = {
  idle: { label: 'Idle', color: 'bg-green-500/10 text-green-500', icon: CheckCircle },
  busy: { label: 'Busy', color: 'bg-yellow-500/10 text-yellow-500 animate-pulse', icon: Activity },
  offline: { label: 'Offline', color: 'bg-gray-500/10 text-gray-500', icon: XCircle },
  error: { label: 'Error', color: 'bg-red-500/10 text-red-500', icon: XCircle },
} as const

const typeIcons = {
  researcher: Search,
  coder: Code,
  reviewer: Shield,
  tester: TestTube,
  documenter: FileText,
  chief: Crown,
}

import { Search, Code, Shield, TestTube, FileText, Crown } from 'lucide-react'

export function WorkersView() {
  const { workers, setSidebarOpen } = useStore()
  
  return (
    <div className="flex h-full flex-col">
      <div className="p-4 border-b border-dark-200 dark:border-dark-700">
        <h2 className="font-semibold text-lg flex items-center gap-2">
          <Bot className="w-5 h-5" />
          Worker Pool
          <span className="badge-info">{workers.length}</span>
        </h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {workers.map((worker) => {
          const cfg = statusConfig[worker.status]
          const Icon = cfg.icon
          const TypeIcon = typeIcons[worker.config.type as keyof typeof typeIcons] || Bot
          const isBusy = worker.status === 'busy'
          
          return (
            <div 
              key={worker.id}
              className={`card p-4 hover:shadow-md transition-shadow cursor-pointer ${
                isBusy ? 'ring-2 ring-yellow-500/50' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${getTypeGradient(worker.config.type)}`}>
                    <TypeIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-lg text-dark-900 dark:text-dark-100">{worker.config.name}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                        <Icon className="w-3 h-3 mr-1" />
                        {cfg.label}
                      </span>
                      <span className="badge badge-purple">{worker.config.variant}</span>
                    </div>
                    <p className="text-sm text-dark-500 dark:text-dark-400 mt-1">{worker.config.type}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-dark-500 dark:text-dark-400">
                  <div className="flex items-center gap-1">
                    <Brain className="w-4 h-4" />
                    <span className="font-mono truncate max-w-[150px]">{worker.config.model.split('/').pop()}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Zap className="w-4 h-4" />
                    <span>{worker.total_tokens.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-4 h-4" />
                    <span>${worker.total_cost_usd.toFixed(4)}</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t border-dark-200 dark:border-dark-700">
                <div>
                  <p className="text-xs text-dark-500 dark:text-dark-400">Completed</p>
                  <p className="font-bold text-2xl text-green-600 dark:text-green-400">{worker.tasks_completed}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-500 dark:text-dark-400">Failed</p>
                  <p className="font-bold text-2xl text-red-600 dark:text-red-400">{worker.tasks_failed}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-500 dark:text-dark-400">Last Active</p>
                  <p className="font-bold text-lg text-dark-900 dark:text-dark-100">
                    {worker.last_heartbeat ? format(new Date(worker.last_heartbeat), 'HH:mm:ss') : '—'}
                  </p>
                </div>
              </div>
              
              {worker.current_task_id && (
                <div className="mt-3 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-yellow-600 dark:text-yellow-400 animate-spin" />
                    <span className="font-medium text-sm text-yellow-800 dark:text-yellow-400">Working on</span>
                    <span className="font-mono text-sm text-yellow-700 dark:text-yellow-300">{worker.current_task_id}</span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
        
        {workers.length === 0 && (
          <div className="text-center py-12 text-dark-500 dark:text-dark-400">
            <Bot className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>No workers configured</p>
          </div>
        )}
      </div>
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