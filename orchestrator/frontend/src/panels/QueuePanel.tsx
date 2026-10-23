/** Queue Panel - shows task queue statistics */

import { useStore } from '../store'
import { 
  Clock, 
  PlayCircle, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Hourglass,
  RotateCcw,
} from 'lucide-react'

const statusConfig = {
  pending: { label: 'Pending', icon: Hourglass, color: 'text-slate-500 bg-slate-500/10', dark: 'text-slate-400 bg-slate-500/10' },
  assigned: { label: 'Assigned', icon: RotateCcw, color: 'text-blue-500 bg-blue-500/10', dark: 'text-blue-400 bg-blue-500/10' },
  running: { label: 'Running', icon: PlayCircle, color: 'text-yellow-500 bg-yellow-500/10 animate-pulse', dark: 'text-yellow-400 bg-yellow-500/10 animate-pulse' },
  completed: { label: 'Completed', icon: CheckCircle, color: 'text-green-500 bg-green-500/10', dark: 'text-green-400 bg-green-500/10' },
  failed: { label: 'Failed', icon: XCircle, color: 'text-red-500 bg-red-500/10', dark: 'text-red-400 bg-red-500/10' },
  cancelled: { label: 'Cancelled', icon: AlertCircle, color: 'text-gray-500 bg-gray-500/10', dark: 'text-gray-400 bg-gray-500/10' },
  needs_review: { label: 'Needs Review', icon: AlertCircle, color: 'text-purple-500 bg-purple-500/10', dark: 'text-purple-400 bg-purple-500/10' },
  revision_requested: { label: 'Revision', icon: RotateCcw, color: 'text-orange-500 bg-orange-500/10', dark: 'text-orange-400 bg-orange-500/10' },
} as const

type TaskStatus = keyof typeof statusConfig

export function QueuePanel() {
  const { queueStats, tasks, setSelectedTask } = useStore()
  
  if (!queueStats) return <div className="panel">Loading queue...</div>
  
  const statusOrder: TaskStatus[] = ['running', 'assigned', 'pending', 'needs_review', 'revision_requested', 'completed', 'failed', 'cancelled']
  
  return (
    <div className="panel space-y-4">
      <h3 className="font-semibold text-lg flex items-center gap-2">
        <Clock className="w-5 h-5" />
        Task Queue
        <span className="badge-info">{queueStats.total}</span>
      </h3>
      
      {/* Status cards */}
      <div className="space-y-2">
        {statusOrder.map((status) => {
          const count = queueStats[status]
          if (count === 0) return null
          
          const config = statusConfig[status]
          const Icon = config.icon
          
          return (
            <div key={status} className="flex items-center gap-3 p-3 rounded-lg hover:bg-dark-50 dark:hover:bg-dark-800/50 transition-colors">
              <div className={`p-2 rounded-lg ${config.color} ${config.dark}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-dark-900 dark:text-dark-100">{config.label}</p>
                <div className="h-1.5 bg-dark-100 dark:bg-dark-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-300"
                    style={{ 
                      width: `${queueStats.total > 0 ? (count / queueStats.total) * 100 : 0}%`,
                      backgroundColor: config.color.split(' ')[0].replace('text-', ''),
                    }}
                  />
                </div>
              </div>
              <span className="font-bold text-lg text-dark-900 dark:text-dark-100">{count}</span>
            </div>
          )
        })}
      </div>
      
      {/* Recent tasks */}
      <div className="border-t border-dark-200 dark:border-dark-700 pt-4">
        <h4 className="font-medium text-sm text-dark-500 dark:text-dark-400 mb-3">Recent Tasks</h4>
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {tasks.slice(0, 20).map((task) => {
            const config = statusConfig[task.status]
            const Icon = config.icon
            
            return (
              <div
                key={task.id}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-dark-50 dark:hover:bg-dark-800/50 cursor-pointer transition-colors group"
                onClick={() => setSelectedTask(task)}
              >
                <div className={`p-1.5 rounded ${config.color} ${config.dark}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-dark-900 dark:text-dark-100 group-hover:text-primary-600 dark:group-hover:text-primary-400">
                    {task.title}
                  </p>
                  <p className="text-xs text-dark-500 dark:text-dark-400 truncate">
                    {task.type.replace('_', ' ')} • {task.assigned_worker || 'unassigned'}
                  </p>
                </div>
                <span className={`badge ${config.color.replace('text-', 'bg-').replace('bg-', '').replace('/10', '')} text-xs`}>
                  {config.label}
                </span>
              </div>
            )
          })}
          {tasks.length === 0 && (
            <p className="text-center text-dark-500 dark:text-dark-400 py-8 text-sm">No tasks yet</p>
          )}
        </div>
      </div>
    </div>
  )
}