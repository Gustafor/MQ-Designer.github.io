/** Main App Component */

import { useState, useEffect } from 'react'
import { 
  Layout, 
  ListTodo, 
  Bot, 
  CreditCard, 
  Terminal,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Settings,
  Zap,
  Brain,
  Activity,
} from 'lucide-react'
import { useStore } from './store'
import { useWebSocket, useInitialData } from './api'
import { GraphView } from './views/GraphView'
import { TasksView } from './views/TasksView'
import { WorkersView } from './views/WorkersView'
import { LimitsView } from './views/LimitsView'
import { LogsView } from './views/LogsView'
import { TaskDetailPanel } from './panels/TaskDetailPanel'
import { WorkerDetailPanel } from './panels/WorkerDetailPanel'
import { LimitsPanel } from './panels/LimitsPanel'
import { QueuePanel } from './panels/QueuePanel'
import { LogsPanel } from './panels/LogsPanel'
import type { ViewMode } from './store'

const viewConfig = {
  graph: { label: 'Graph', icon: Layout, href: '/graph' },
  tasks: { label: 'Tasks', icon: ListTodo, href: '/tasks' },
  workers: { label: 'Workers', icon: Bot, href: '/workers' },
  limits: { label: 'Limits', icon: CreditCard, href: '/limits' },
  logs: { label: 'Logs', icon: Terminal, href: '/logs' },
} as const

type ViewMode = keyof typeof viewConfig

export function App() {
  const { 
    viewMode, 
    setViewMode, 
    sidebarOpen, 
    setSidebarOpen,
    connected,
    connecting,
    error,
    currentPlan,
    statusSummary,
  } = useStore()
  
  const { connect, disconnect } = useWebSocket()
  const { loading, error: initError } = useInitialData()
  
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  
  // Reconnect on error
  useEffect(() => {
    if (error && !connecting) {
      connect()
    }
  }, [error, connecting, connect])
  
  const ViewComponent = useMemo(() => {
    switch (viewMode) {
      case 'graph': return GraphView
      case 'tasks': return TasksView
      case 'workers': return WorkersView
      case 'limits': return LimitsView
      case 'logs': return LogsView
      default: return GraphView
    }
  }, [viewMode])
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-50 dark:bg-dark-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-dark-500 dark:text-dark-400">Loading Orchestrator...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-dark-50 dark:bg-dark-950 flex">
      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside 
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white dark:bg-dark-900 border-r border-dark-200 dark:border-dark-700 transform transition-transform duration-300 ease-in-out flex flex-col ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-dark-200 dark:border-dark-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-purple-600 to-purple-800">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-dark-900 dark:text-dark-100">Orchestrator</h1>
              <p className="text-xs text-dark-500 dark:text-dark-400">Crypto Trading Bot</p>
            </div>
          </div>
          <button 
            className="lg:hidden btn-ghost p-2"
            onClick={() => setMobileSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Connection Status */}
        <div className="px-4 py-3 border-b border-dark-200 dark:border-dark-700">
          <div className="flex items-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : connecting ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`} />
            <span className={connected ? 'text-green-600' : connecting ? 'text-yellow-600' : 'text-red-600'}>
              {connected ? 'Connected' : connecting ? 'Connecting...' : 'Disconnected'}
            </span>
          </div>
          {error && (
            <p className="text-xs text-red-500 mt-1 truncate">{error}</p>
          )}
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {Object.entries(viewConfig).map(([key, config]) => {
            const Icon = config.icon
            const isActive = viewMode === key
            return (
              <button
                key={key}
                onClick={() => { setViewMode(key as ViewMode); setMobileSidebarOpen(false) }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive 
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 shadow-sm' 
                    : 'text-dark-600 dark:text-dark-400 hover:bg-dark-100 dark:hover:bg-dark-800'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span>{config.label}</span>
              </button>
            )
          })}
        </nav>
        
        {/* Quick Stats */}
        {statusSummary && (
          <div className="p-4 border-t border-dark-200 dark:border-dark-700 space-y-3">
            <p className="text-xs font-medium text-dark-500 dark:text-dark-400 uppercase tracking-wider">Quick Stats</p>
            <div className="grid grid-cols-2 gap-2">
              <StatMini label="Tasks" value={statusSummary.queue.total} icon={ListTodo} color="blue" />
              <StatMini label="Running" value={statusSummary.queue.running} icon={Activity} color="yellow" />
              <StatMini label="Workers" value={statusSummary.workers.workers_total} icon={Bot} color="green" />
              <StatMini label="Cost" value={`$${statusSummary.workers.total_cost_usd.toFixed(2)}`} icon={CreditCard} color="purple" />
            </div>
            {statusSummary.limits.is_alert && (
              <div className="p-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                <p className="text-xs text-yellow-800 dark:text-yellow-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Budget: {statusSummary.limits.usage_pct.toFixed(1)}% used
                </p>
              </div>
            )}
          </div>
        )}
        
        {/* Footer */}
        <div className="p-4 border-t border-dark-200 dark:border-dark-700">
          <button className="btn-secondary w-full justify-center gap-2">
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </div>
      </aside>
      
      {/* Main Content */}
      <main className="flex-1 lg:ml-0 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white dark:bg-dark-900 border-b border-dark-200 dark:border-dark-700">
          <div className="flex items-center justify-between h-16 px-4">
            <button className="btn-ghost p-2" onClick={() => setMobileSidebarOpen(true)}>
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="font-semibold text-lg">Orchestrator</h1>
            <div className="w-10" />
          </div>
        </header>
        
        <div className="flex-1 flex flex-col lg:pt-0 pt-16">
          {/* Plan Banner */}
          {currentPlan && (
            <div className="bg-primary-50 dark:bg-primary-900/20 border-b border-primary-200 dark:border-primary-800 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  <div>
                    <p className="font-medium text-primary-800 dark:text-primary-300">Active Plan</p>
                    <p className="text-sm text-primary-600 dark:text-primary-400 truncate max-w-md">
                      {currentPlan.goal}
                    </p>
                  </div>
                </div>
                <span className="badge badge-purple">{currentPlan.tasks.length} tasks</span>
              </div>
            </div>
          )}
          
          {/* View Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <ViewComponent />
          </div>
        </div>
      </main>
      
      {/* Right Sidebar */}
      <aside className={`fixed lg:static inset-y-0 right-0 z-40 w-80 bg-white dark:bg-dark-900 border-l border-dark-200 dark:border-dark-700 transform transition-transform duration-300 ${
        sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
      }`}>
        <div className="flex h-full flex-col">
          {/* Sidebar Tabs */}
          <div className="flex border-b border-dark-200 dark:border-dark-700 px-2">
            {[
              { id: 'detail', label: 'Detail', icon: Layout },
              { id: 'queue', label: 'Queue', icon: ListTodo },
              { id: 'limits', label: 'Limits', icon: CreditCard },
              { id: 'logs', label: 'Logs', icon: Terminal },
            ].map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                    sidebarTab === tab.id
                      ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500 bg-primary-50/50 dark:bg-primary-900/10'
                      : 'text-dark-500 dark:text-dark-400 hover:text-dark-700 dark:hover:text-dark-200 hover:bg-dark-50 dark:hover:bg-dark-800/50'
                  }`}
                  onClick={() => setSidebarTab(tab.id)}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
          
          {/* Sidebar Content */}
          <div className="flex-1 overflow-y-auto">
            {sidebarTab === 'detail' && (
              <>
                {selectedTask ? <TaskDetailPanel /> : selectedWorker ? <WorkerDetailPanel /> : <EmptyDetail />}
              </>
            )}
            {sidebarTab === 'queue' && <QueuePanel />}
            {sidebarTab === 'limits' && <LimitsPanel />}
            {sidebarTab === 'logs' && <LogsPanel />}
          </div>
        </div>
      </aside>
      
      {/* Sidebar Toggle Button (mobile) */}
      <button
        className="fixed bottom-4 right-4 lg:hidden z-50 btn-primary shadow-lg"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
      </button>
    </div>
  )
}

const [sidebarTab, setSidebarTab] = useState<'detail' | 'queue' | 'limits' | 'logs'>('detail')
const [selectedTask, setSelectedTask] = useStore((s) => s.selectedTask)
const [selectedWorker, setSelectedWorker] = useStore((s) => s.selectedWorker ? s.workers.find(w => w.id === s.selectedNodeId?.replace('worker-', '')) : null)
const [selectedNodeId] = useStore((s) => s.selectedNodeId)

function StatMini({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ComponentType<{ className?: string }>; color: string }) {
  return (
    <div className="p-2 rounded-lg bg-dark-50 dark:bg-dark-800/50">
      <div className="flex items-center justify-between mb-1">
        <Icon className={`w-4 h-4 text-${color}-500`} />
      </div>
      <p className="font-bold text-lg text-dark-900 dark:text-dark-100">{value}</p>
      <p className="text-[10px] text-dark-500 dark:text-dark-400">{label}</p>
    </div>
  )
}

function EmptyDetail() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <Layout className="w-16 h-16 text-dark-300 dark:text-dark-600 mb-4" />
      <h3 className="font-medium text-dark-900 dark:text-dark-100">Select an Item</h3>
      <p className="text-dark-500 dark:text-dark-400 text-sm mt-1">
        Click on a task, worker, or node to view details
      </p>
    </div>
  )
}