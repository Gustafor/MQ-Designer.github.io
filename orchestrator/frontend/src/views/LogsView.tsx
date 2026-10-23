/** Logs View - full screen log viewer */

import { useStore } from '../store'
import { LogsPanel } from '../panels/LogsPanel'
import { Terminal, Trash2, Download, Filter, X, Check, AlertTriangle, Info, Copy } from 'lucide-react'
import { useState, useMemo, useRef, useEffect } from 'react'
import { format } from 'date-fns'

type LogLevel = 'info' | 'warning' | 'error' | 'debug'

const levelConfig: Record<LogLevel, { icon: React.ComponentType<{ className?: string }>; color: string; bg: string }> = {
  info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  warning: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  error: { icon: X, color: 'text-red-500', bg: 'bg-red-500/10' },
  debug: { icon: Terminal, color: 'text-gray-500', bg: 'bg-gray-500/10' },
}

export function LogsView() {
  const { logs, clearLogs } = useStore()
  const [filterLevel, setFilterLevel] = useState<LogLevel | 'all'>('all')
  const [search, setSearch] = useState('')
  const [autoScroll, setAutoScroll] = useState(true)
  const [showTimestamps, setShowTimestamps] = useState(true)
  const logContainerRef = useRef<HTMLDivElement>(null)
  
  const filteredLogs = useMemo(() => {
    return logs
      .filter(log => {
        if (filterLevel !== 'all' && log.level !== filterLevel) return false
        if (search && !log.message.toLowerCase().includes(search.toLowerCase())) return false
        return true
      })
  }, [logs, filterLevel, search])
  
  // Auto-scroll
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [filteredLogs.length, autoScroll])
  
  const copyLogs = () => {
    const text = filteredLogs.map(log => 
      `${showTimestamps ? format(new Date(log.timestamp), 'HH:mm:ss.SSS') : ''} [${log.level.toUpperCase()}] ${log.message}`
    ).join('\n')
    navigator.clipboard.writeText(text)
  }
  
  return (
    <div className="flex-1 flex flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 p-4 border-b border-dark-200 dark:border-dark-700">
        <h2 className="font-semibold text-lg flex items-center gap-2">
          <Terminal className="w-5 h-5" />
          Live Logs
          <span className="badge-info">{logs.length} total</span>
          <span className="badge-secondary">{filteredLogs.length} filtered</span>
        </h2>
        
        <div className="relative flex-1 max-w-md">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
          <input
            type="text"
            placeholder="Filter logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
        
        <select
          value={filterLevel}
          onChange={(e) => setFilterLevel(e.target.value as LogLevel | 'all')}
          className="input w-auto"
        >
          <option value="all">All Levels</option>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="error">Error</option>
          <option value="debug">Debug</option>
        </select>
        
        <div className="flex items-center gap-2 border-l border-dark-200 dark:border-dark-700 pl-4">
          <label className="flex items-center gap-1 text-xs text-dark-500 dark:text-dark-400">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded border-dark-300 dark:border-dark-600"
            />
            Auto-scroll
          </label>
          <label className="flex items-center gap-1 text-xs text-dark-500 dark:text-dark-400">
            <input
              type="checkbox"
              checked={showTimestamps}
              onChange={(e) => setShowTimestamps(e.target.checked)}
              className="rounded border-dark-300 dark:border-dark-600"
            />
            Timestamps
          </label>
        </div>
        
        <div className="flex items-center gap-2 ml-auto">
          <button onClick={copyLogs} className="btn-secondary text-sm" title="Copy filtered logs">
            <Copy className="w-4 h-4 mr-1" />
            Copy
          </button>
          <button onClick={clearLogs} className="btn-ghost text-sm" title="Clear all logs">
            <Trash2 className="w-4 h-4" />
          </button>
          <button className="btn-secondary text-sm" title="Download logs">
            <Download className="w-4 h-4 mr-1" />
            Save
          </button>
        </div>
      </div>
      
      {/* Log Stream */}
      <div 
        ref={logContainerRef}
        className="flex-1 overflow-y-auto font-mono text-xs bg-dark-900/50 dark:bg-dark-950 m-4 rounded-lg"
      >
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-dark-500 dark:text-dark-400">
            <Terminal className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-center">No logs match your filters</p>
            <p className="text-sm mt-1">Start a task or adjust filters</p>
          </div>
        ) : (
          <div className="p-4 space-y-1" role="log" aria-live="polite">
            {filteredLogs.map((log, index) => {
              const cfg = levelConfig[log.level as LogLevel] || levelConfig.info
              const Icon = cfg.icon
              return (
                <div 
                  key={index} 
                  className="flex items-start gap-3 text-dark-100 dark:text-dark-50 border-b border-dark-800/50 pb-1 last:pb-0 hover:bg-dark-800/50 rounded px-2 py-1 transition-colors"
                >
                  {showTimestamps && (
                    <span className="text-dark-500 dark:text-dark-400 whitespace-nowrap font-mono text-[11px]">
                      {format(new Date(log.timestamp), 'HH:mm:ss.SSS')}
                    </span>
                  )}
                  <span className={`flex-shrink-0 w-5 h-5 rounded ${cfg.bg} flex items-center justify-center mt-0.5`}>
                    <Icon className={`w-3 h-3 ${cfg.color}`} />
                  </span>
                  <span className="flex-1 break-all text-dark-200 dark:text-dark-300 leading-relaxed">{log.message}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}