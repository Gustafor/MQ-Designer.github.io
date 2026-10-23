/** Logs Panel - real-time log stream */

import { useStore } from '../store'
import { 
  Terminal, 
  Trash2, 
  Download, 
  Filter,
  X,
  Check,
  AlertTriangle,
  Info,
} from 'lucide-react'
import { useState, useMemo } from 'react'
import { format } from 'date-fns'

type LogLevel = 'info' | 'warning' | 'error' | 'debug'

const levelConfig: Record<LogLevel, { icon: React.ComponentType<{ className?: string }>; color: string; bg: string }> = {
  info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  warning: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  error: { icon: X, color: 'text-red-500', bg: 'bg-red-500/10' },
  debug: { icon: Terminal, color: 'text-gray-500', bg: 'bg-gray-500/10' },
}

export function LogsPanel() {
  const { logs, clearLogs } = useStore()
  const [filterLevel, setFilterLevel] = useState<LogLevel | 'all'>('all')
  const [autoScroll, setAutoScroll] = useState(true)
  const logContainerRef = useRef<HTMLDivElement>(null)
  
  const filteredLogs = useMemo(() => {
    if (filterLevel === 'all') return logs
    return logs.filter(log => log.level === filterLevel)
  }, [logs, filterLevel])
  
  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [filteredLogs.length, autoScroll])
  
  return (
    <div className="panel flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Terminal className="w-5 h-5" />
          Live Logs
          <span className="badge-info">{logs.length}</span>
        </h3>
        <div className="flex items-center gap-2">
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value as LogLevel | 'all')}
            className="input text-xs py-1 px-2 w-auto"
          >
            <option value="all">All Levels</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
            <option value="debug">Debug</option>
          </select>
          <label className="flex items-center gap-1 text-xs text-dark-500 dark:text-dark-400">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded border-dark-300 dark:border-dark-600"
            />
            Auto-scroll
          </label>
          <button
            onClick={clearLogs}
            className="btn-ghost text-xs p-1.5"
            title="Clear logs"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div 
        ref={logContainerRef}
        className="flex-1 overflow-y-auto font-mono text-xs bg-dark-900/50 dark:bg-dark-950 rounded-lg p-3 space-y-1"
      >
        {filteredLogs.length === 0 ? (
          <p className="text-dark-500 dark:text-dark-400 text-center py-8">
            No logs yet. Start a task to see activity.
          </p>
        ) : (
          filteredLogs.map((log, index) => (
            <div 
              key={index} 
              className="flex items-start gap-2 text-dark-100 dark:text-dark-50 border-b border-dark-800/50 pb-1 last:pb-0"
            >
              <span className="text-dark-500 dark:text-dark-400 whitespace-nowrap">
                {format(new Date(log.timestamp), 'HH:mm:ss.SSS')}
              </span>
              <span className={`flex-shrink-0 w-5 h-5 rounded ${levelConfig[log.level as LogLevel]?.bg || levelConfig.info.bg} flex items-center justify-center`}>
                <levelConfig[log.level as LogLevel]?.icon className={`w-3 h-3 ${levelConfig[log.level as LogLevel]?.color || levelConfig.info.color}`} />
              </span>
              <span className="flex-1 break-all text-dark-200 dark:text-dark-300">{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

import { useRef, useEffect } from 'react'