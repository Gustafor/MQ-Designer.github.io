/** Tasks List View */

import { useStore } from '../store'
import { TaskDetailPanel } from '../panels/TaskDetailPanel'
import { 
  Search, 
  Filter, 
  Download, 
  Plus,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import type { Task, TaskStatus, TaskType } from '../types'

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-slate-500/10 text-slate-500', icon: '⏳' },
  assigned: { label: 'Assigned', color: 'bg-blue-500/10 text-blue-500', icon: '👤' },
  running: { label: 'Running', color: 'bg-yellow-500/10 text-yellow-500', icon: '▶️' },
  completed: { label: 'Completed', color: 'bg-green-500/10 text-green-500', icon: '✅' },
  failed: { label: 'Failed', color: 'bg-red-500/10 text-red-500', icon: '❌' },
  cancelled: { label: 'Cancelled', color: 'bg-gray-500/10 text-gray-500', icon: '🚫' },
  needs_review: { label: 'Needs Review', color: 'bg-purple-500/10 text-purple-500', icon: '👁️' },
  revision_requested: { label: 'Revision', color: 'bg-orange-500/10 text-orange-500', icon: '🔄' },
} as const

export function TasksView() {
  const { tasks, selectedTask, setSelectedTask, setSidebarOpen } = useStore()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<TaskType | 'all'>('all')
  const [sortBy, setSortBy] = useState<'created' | 'priority' | 'status'>('created')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  
  const filteredTasks = useMemo(() => {
    return tasks
      .filter(t => {
        if (statusFilter !== 'all' && t.status !== statusFilter) return false
        if (typeFilter !== 'all' && t.type !== typeFilter) return false
        if (search && !t.title.toLowerCase().includes(search.toLowerCase()) &&
            !t.input.prompt.toLowerCase().includes(search.toLowerCase())) return false
        return true
      })
      .sort((a, b) => {
        let cmp = 0
        switch (sortBy) {
          case 'created':
            cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            break
          case 'priority':
            cmp = a.priority - b.priority
            break
          case 'status':
            cmp = a.status.localeCompare(b.status)
            break
        }
        return sortDir === 'asc' ? cmp : -cmp
      })
  }, [tasks, search, statusFilter, typeFilter, sortBy, sortDir])
  
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    tasks.forEach(t => { counts[t.status] = (counts[t.status] || 0) + 1 })
    return counts
  }, [tasks])
  
  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 p-4 border-b border-dark-200 dark:border-dark-700">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
        
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as TaskStatus | 'all')}
          className="input w-auto"
        >
          <option value="all">All Statuses</option>
          {Object.entries(statusConfig).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.icon} {cfg.label} ({statusCounts[key] || 0})</option>
          ))}
        </select>
        
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as TaskType | 'all')}
          className="input w-auto"
        >
          <option value="all">All Types</option>
          {(['research', 'architecture', 'coding', 'review', 'testing', 'documentation', 'quick_fix', 'vision', 'refactoring', 'strategy', 'data_pipeline', 'core_implementation'] as TaskType[]).map(t => (
            <option key={t} value={t}>{t.replace('_', ' ')}</option>
          ))}
        </select>
        
        <button
          onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')}
          className="btn-secondary text-sm"
        >
          Sort: {sortBy} {sortDir === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        
        <button className="btn-primary ml-auto">
          <Plus className="w-4 h-4 mr-1" />
          New Task
        </button>
      </div>
      
      {/* Task List */}
      <div className="flex-1 overflow-y-auto">
        <div className="divide-y divide-dark-200 dark:divide-dark-700">
          {filteredTasks.map((task) => {
            const cfg = statusConfig[task.status]
            return (
              <div
                key={task.id}
                className={`p-4 hover:bg-dark-50 dark:hover:bg-dark-800/50 transition-colors cursor-pointer ${
                  selectedTask?.id === task.id ? 'bg-primary-50/50 dark:bg-primary-900/20 border-l-4 border-primary-500' : ''
                }`}
                onClick={() => setSelectedTask(selectedTask?.id === task.id ? null : task)}
              >
                <div className="flex items-start gap-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${cfg.color} whitespace-nowrap`}>
                    {cfg.icon} {cfg.label}
                  </span>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-dark-900 dark:text-dark-100 truncate">{task.title}</h4>
                      <span className="badge badge-purple text-xs">P{task.priority}</span>
                      <span className="badge badge-secondary text-xs">{task.type.replace('_', ' ')}</span>
                    </div>
                    <p className="text-sm text-dark-500 dark:text-dark-400 truncate mt-1">{task.input.prompt.slice(0, 150)}...</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-dark-500 dark:text-dark-400">
                      <span>{task.assigned_worker || 'unassigned'}</span>
                      <span>{format(new Date(task.created_at), 'MMM d, HH:mm')}</span>
                      {task.output && (
                        <>
                          <span>{task.output.tokens_used.toLocaleString()} tok</span>
                          <span>${task.output.cost_usd.toFixed(4)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {task.error && (
                    <span className="badge badge-danger text-xs">Error</span>
                  )}
                </div>
              </div>
            )
          })}
          
          {filteredTasks.length === 0 && (
            <div className="p-12 text-center text-dark-500 dark:text-dark-400">
              <Filter className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No tasks match your filters</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

import { ChevronUp, ChevronDown } from 'lucide-react'