/** Task Detail Panel - shows selected task details */

import { useStore } from '../store'
import { 
  FileCode, 
  Clock, 
  User, 
  Zap, 
  DollarSign,
  ArrowLeft,
  RotateCcw,
  X,
  Check,
  AlertCircle,
  ExternalLink,
} from 'lucide-react'
import { format } from 'date-fns'
import type { Task, TaskStatus } from '../types'

const statusConfig = {
  pending: { label: 'Pending', color: 'text-slate-500 bg-slate-500/10', icon: Clock },
  assigned: { label: 'Assigned', color: 'text-blue-500 bg-blue-500/10', icon: User },
  running: { label: 'Running', color: 'text-yellow-500 bg-yellow-500/10', icon: Zap },
  completed: { label: 'Completed', color: 'text-green-500 bg-green-500/10', icon: Check },
  failed: { label: 'Failed', color: 'text-red-500 bg-red-500/10', icon: X },
  cancelled: { label: 'Cancelled', color: 'text-gray-500 bg-gray-500/10', icon: AlertCircle },
  needs_review: { label: 'Needs Review', color: 'text-purple-500 bg-purple-500/10', icon: AlertCircle },
  revision_requested: { label: 'Revision', color: 'text-orange-500 bg-orange-500/10', icon: RotateCcw },
} as const

type TaskStatus = keyof typeof statusConfig

export function TaskDetailPanel() {
  const { selectedTask, setSelectedTask, setSidebarOpen } = useStore()
  
  if (!selectedTask) {
    return (
      <div className="panel flex flex-col items-center justify-center h-64 text-center">
        <FileCode className="w-16 h-16 text-dark-300 dark:text-dark-600 mb-4" />
        <h3 className="font-medium text-dark-900 dark:text-dark-100">No Task Selected</h3>
        <p className="text-dark-500 dark:text-dark-400 text-sm mt-1">
          Click on a task node or queue item to view details
        </p>
      </div>
    )
  }
  
  const task = selectedTask
  const config = statusConfig[task.status]
  const Icon = config.icon
  
  return (
    <div className="panel flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
              {config.label}
            </span>
            <span className="badge badge-purple">P{task.priority}</span>
          </div>
          <h3 className="font-semibold text-lg text-dark-900 dark:text-dark-100">{task.title}</h3>
          <p className="text-sm text-dark-500 dark:text-dark-400 capitalize">{task.type.replace('_', ' ')}</p>
        </div>
        <button
          onClick={() => setSelectedTask(null)}
          className="btn-ghost p-2"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
      </div>
      
      {/* Meta info */}
      <div className="grid grid-cols-2 gap-3 mb-4 p-3 rounded-lg bg-dark-50 dark:bg-dark-800/50">
        <div>
          <p className="text-xs text-dark-500 dark:text-dark-400">Created</p>
          <p className="font-mono text-sm">{format(new Date(task.created_at), 'MMM d, HH:mm:ss')}</p>
        </div>
        <div>
          <p className="text-xs text-dark-500 dark:text-dark-400">Worker</p>
          <p className="font-mono text-sm">{task.assigned_worker || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-dark-500 dark:text-dark-400">Started</p>
          <p className="font-mono text-sm">{task.started_at ? format(new Date(task.started_at), 'MMM d, HH:mm:ss') : '—'}</p>
        </div>
        <div>
          <p className="text-xs text-dark-500 dark:text-dark-400">Completed</p>
          <p className="font-mono text-sm">{task.completed_at ? format(new Date(task.completed_at), 'MMM d, HH:mm:ss') : '—'}</p>
        </div>
        <div>
          <p className="text-xs text-dark-500 dark:text-dark-400">Retries</p>
          <p className="font-mono text-sm">{task.retry_count}/{task.max_retries}</p>
        </div>
        <div>
          <p className="text-xs text-dark-500 dark:text-dark-400">Tokens</p>
          <p className="font-mono text-sm">{task.output?.tokens_used.toLocaleString() || 0}</p>
        </div>
        <div>
          <p className="text-xs text-dark-500 dark:text-dark-400">Cost</p>
          <p className="font-mono text-sm">${task.output?.cost_usd.toFixed(6) || 0}</p>
        </div>
        <div>
          <p className="text-xs text-dark-500 dark:text-dark-400">Model</p>
          <p className="font-mono text-sm text-xs truncate">{task.output?.model_used || '—'}</p>
        </div>
      </div>
      
      {/* Dependencies */}
      {task.input.dependencies.length > 0 && (
        <div className="mb-4">
          <h4 className="font-medium text-sm text-dark-500 dark:text-dark-400 mb-2">Dependencies</h4>
          <div className="flex flex-wrap gap-1">
            {task.input.dependencies.map((depId) => (
              <span key={depId} className="badge badge-info text-xs font-mono">{depId}</span>
            ))}
          </div>
        </div>
      )}
      
      {/* Context files */}
      {task.input.context_files.length > 0 && (
        <div className="mb-4">
          <h4 className="font-medium text-sm text-dark-500 dark:text-dark-400 mb-2">Context Files</h4>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {task.input.context_files.map((file) => (
              <span key={file} className="badge badge-secondary text-xs font-mono block">{file}</span>
            ))}
          </div>
        </div>
      )}
      
      {/* Prompt */}
      <div className="mb-4">
        <h4 className="font-medium text-sm text-dark-500 dark:text-dark-400 mb-2">Prompt</h4>
        <div className="p-3 rounded-lg bg-dark-100 dark:bg-dark-800 max-h-40 overflow-y-auto font-mono text-xs text-dark-700 dark:text-dark-300 whitespace-pre-wrap">
          {task.input.prompt}
        </div>
      </div>
      
      {/* Output */}
      {task.output && (
        <div className="mb-4 flex-1 overflow-y-auto">
          <h4 className="font-medium text-sm text-dark-500 dark:text-dark-400 mb-2">Output Summary</h4>
          <div className="p-3 rounded-lg bg-dark-100 dark:bg-dark-800 text-sm text-dark-700 dark:text-dark-300 whitespace-pre-wrap">
            {task.output.summary}
          </div>
          
          {task.output.files_created.length > 0 && (
            <div className="mt-3">
              <h5 className="font-medium text-xs text-dark-500 dark:text-dark-400 mb-1">Files Created</h5>
              <div className="space-y-1">
                {task.output.files_created.map((file) => (
                  <span key={file} className="badge badge-success text-xs font-mono block">{file}</span>
                ))}
              </div>
            </div>
          )}
          
          {task.output.files_modified.length > 0 && (
            <div className="mt-3">
              <h5 className="font-medium text-xs text-dark-500 dark:text-dark-400 mb-1">Files Modified</h5>
              <div className="space-y-1">
                {task.output.files_modified.map((file) => (
                  <span key={file} className="badge badge-warning text-xs font-mono block">{file}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Error */}
      {task.error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <h4 className="font-medium text-sm text-red-800 dark:text-red-400 mb-1 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            Error
          </h4>
          <p className="text-sm text-red-700 dark:text-red-300 font-mono">{task.error}</p>
        </div>
      )}
      
      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-3 border-t border-dark-200 dark:border-dark-700">
        {task.status === 'failed' && task.retry_count < task.max_retries && (
          <button className="btn-primary text-sm flex-1" onClick={() => {
            // Retry action would call API
          }}>
            <RotateCcw className="w-4 h-4 mr-1" />
            Retry
          </button>
        )}
        {task.status === 'failed' && (
          <button className="btn-danger text-sm flex-1">
            <X className="w-4 h-4 mr-1" />
            Cancel
          </button>
        )}
        {task.status === 'needs_review' && (
          <button className="btn-primary text-sm flex-1">
            <Check className="w-4 h-4 mr-1" />
            Approve
          </button>
        )}
      </div>
    </div>
  )
}