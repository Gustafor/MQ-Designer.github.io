/** Zustand store for orchestrator frontend state */

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type {
  GraphSnapshot,
  GraphNode,
  GraphEdge,
  Task,
  WorkerState,
  ChiefPlan,
  LimitsState,
  QueueStats,
  StatusSummary,
  WebSocketMessage,
  TaskType,
  TaskStatus,
  WorkerStatus,
} from './types'

interface OrchestratorState {
  // Graph
  graph: GraphSnapshot | null
  nodes: GraphNode[]
  edges: GraphEdge[]
  
  // Tasks
  tasks: Task[]
  selectedTask: Task | null
  
  // Workers
  workers: WorkerState[]
  
  // Chief
  currentPlan: ChiefPlan | null
  
  // Limits & Stats
  limits: LimitsState | null
  queueStats: QueueStats | null
  statusSummary: StatusSummary | null
  
  // Logs
  logs: Array<{ level: string; message: string; timestamp: string }>
  
  // Connection
  connected: boolean
  connecting: boolean
  error: string | null
  
  // UI
  sidebarOpen: boolean
  selectedNodeId: string | null
  viewMode: 'graph' | 'tasks' | 'workers' | 'limits' | 'logs'
  
  // Actions
  setGraph: (graph: GraphSnapshot) => void
  setTasks: (tasks: Task[]) => void
  setSelectedTask: (task: Task | null) => void
  setWorkers: (workers: WorkerState[]) => void
  setCurrentPlan: (plan: ChiefPlan | null) => void
  setLimits: (limits: LimitsState) => void
  setQueueStats: (stats: QueueStats) => void
  setStatusSummary: (summary: StatusSummary) => void
  addLog: (log: { level: string; message: string; timestamp: string }) => void
  clearLogs: () => void
  setConnected: (connected: boolean) => void
  setConnecting: (connecting: boolean) => void
  setError: (error: string | null) => void
  setSidebarOpen: (open: boolean) => void
  setSelectedNodeId: (id: string | null) => void
  setViewMode: (mode: OrchestratorState['viewMode']) => void
  handleMessage: (message: WebSocketMessage) => void
}

export const useStore = create<OrchestratorState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    graph: null,
    nodes: [],
    edges: [],
    tasks: [],
    selectedTask: null,
    workers: [],
    currentPlan: null,
    limits: null,
    queueStats: null,
    statusSummary: null,
    logs: [],
    connected: false,
    connecting: false,
    error: null,
    sidebarOpen: true,
    selectedNodeId: null,
    viewMode: 'graph',
    
    // Actions
    setGraph: (graph) => set({ 
      graph, 
      nodes: graph.nodes, 
      edges: graph.edges,
      queueStats: graph.queue_stats,
      limits: graph.limits,
    }),
    
    setTasks: (tasks) => set({ tasks }),
    
    setSelectedTask: (task) => set({ selectedTask: task }),
    
    setWorkers: (workers) => set({ workers }),
    
    setCurrentPlan: (plan) => set({ currentPlan: plan }),
    
    setLimits: (limits) => set({ limits }),
    
    setQueueStats: (stats) => set({ queueStats: stats }),
    
    setStatusSummary: (summary) => set({ statusSummary: summary }),
    
    addLog: (log) => set((state) => ({ 
      logs: [...state.logs.slice(-499), log] 
    })),
    
    clearLogs: () => set({ logs: [] }),
    
    setConnected: (connected) => set({ connected }),
    
    setConnecting: (connecting) => set({ connecting }),
    
    setError: (error) => set({ error }),
    
    setSidebarOpen: (open) => set({ sidebarOpen: open }),
    
    setSelectedNodeId: (id) => set({ selectedNodeId: id }),
    
    setViewMode: (mode) => set({ viewMode: mode }),
    
    handleMessage: (message) => {
      const state = get()
      
      switch (message.type) {
        case 'graph_update':
          set({ 
            graph: message.payload,
            nodes: message.payload.nodes,
            edges: message.payload.edges,
            queueStats: message.payload.queue_stats,
            limits: message.payload.limits,
          })
          break
          
        case 'task_update':
          set((s) => ({
            tasks: s.tasks.map(t => t.id === message.payload.task.id ? message.payload.task : t),
            selectedTask: s.selectedTask?.id === message.payload.task.id ? message.payload.task : s.selectedTask,
          }))
          break
          
        case 'worker_status':
          set((s) => ({
            workers: s.workers.map(w => w.id === message.payload.worker.id ? message.payload.worker : w),
          }))
          break
          
        case 'log':
          set((s) => ({
            logs: [...s.logs.slice(-499), {
              level: message.payload.level,
              message: message.payload.message,
              timestamp: message.timestamp,
            }],
          }))
          break
          
        case 'plan_created':
          set({ currentPlan: message.payload.plan })
          break
          
        case 'task_created':
          set((s) => ({
            tasks: [message.payload.task, ...s.tasks],
          }))
          break
      }
    },
  }))
)

/** Selectors for derived state */
export const selectNodesByType = (type: GraphNode['type']) => (state: OrchestratorState) =>
  state.nodes.filter(n => n.type === type)

export const selectTasksByStatus = (status: TaskStatus) => (state: OrchestratorState) =>
  state.tasks.filter(t => t.status === status)

export const selectWorkersByStatus = (status: WorkerStatus) => (state: OrchestratorState) =>
  state.workers.filter(w => w.status === status)

export const selectTaskById = (id: string) => (state: OrchestratorState) =>
  state.tasks.find(t => t.id === id)

export const selectWorkerById = (id: string) => (state: OrchestratorState) =>
  state.workers.find(w => w.id === id)