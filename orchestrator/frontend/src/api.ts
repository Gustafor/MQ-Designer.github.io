/** API client and WebSocket hook */

import axios, { AxiosInstance } from 'axios'
import { useEffect, useRef, useCallback, useState } from 'react'
import { useStore } from './store'
import type { 
  Task, 
  TaskType, 
  ChiefPlan, 
  GraphSnapshot, 
  StatusSummary,
  ModelConfig,
  WebSocketMessage 
} from './types'

const API_BASE = import.meta.env.VITE_API_BASE || '/api'

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
})

// Request interceptor for auth if needed
api.interceptors.request.use((config) => {
  // Add auth token if available
  const token = localStorage.getItem('orchestrator_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      localStorage.removeItem('orchestrator_token')
    }
    return Promise.reject(error)
  }
)

/** API functions */
export const orchestratorApi = {
  // Health
  health: () => api.get('/health'),
  
  // Status
  getStatus: () => api.get<StatusSummary>('/status'),
  
  // Graph
  getGraph: () => api.get<GraphSnapshot>('/graph'),
  
  // Goals
  submitGoal: (goal: string, context?: Record<string, any>) => 
    api.post<ChiefPlan>('/goal', { goal, context }),
  
  // Tasks
  listTasks: (params?: { status?: string; worker_id?: string; limit?: number }) =>
    api.get<{ tasks: Task[] }>('/tasks', { params }),
  
  getTask: (id: string) => api.get<Task>(`/tasks/${id}`),
  
  createTask: (task: Partial<Task> & { title: string; type: TaskType; prompt: string }) =>
    api.post<Task>('/tasks', task),
  
  retryTask: (id: string) => api.post(`/tasks/${id}/retry`),
  
  cancelTask: (id: string) => api.delete(`/tasks/${id}`),
  
  // Workers
  listWorkers: () => api.get<{ workers: any[] }>('/workers'),
  
  getWorker: (id: string) => api.get(`/workers/${id}`),
  
  // Models
  selectModel: (params: { task_type: TaskType; prefer_free?: boolean; privacy_required?: boolean }) =>
    api.post<ModelConfig>('/models/select', params),
  
  listModels: () => api.get<{ models: any[] }>('/models'),
  
  // Limits
  getLimits: () => api.get('/limits'),
  
  // Plan
  getPlan: () => api.get<{ plan: ChiefPlan | null }>('/plan'),
  
  reviewTask: (id: string) => api.post(`/plan/review/${id}`),
}

/** WebSocket hook */
export function useWebSocket() {
  const { setConnected, setConnecting, setError, handleMessage } = useStore()
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 10
  
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return
    
    setConnecting(true)
    setError(null)
    
    const wsUrl = `${import.meta.env.VITE_WS_BASE || 'ws://localhost:8000'}/ws`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws
    
    ws.onopen = () => {
      console.log('[WS] Connected')
      setConnected(true)
      setConnecting(false)
      reconnectAttempts.current = 0
    }
    
    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data)
        handleMessage(message)
      } catch (e) {
        console.error('[WS] Failed to parse message:', e)
      }
    }
    
    ws.onclose = () => {
      console.log('[WS] Disconnected')
      setConnected(false)
      setConnecting(false)
      
      // Reconnect with exponential backoff
      if (reconnectAttempts.current < maxReconnectAttempts) {
        const delay = Math.min(1000 * 2 ** reconnectAttempts.current, 30000)
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttempts.current++
          connect()
        }, delay)
      } else {
        setError('WebSocket connection lost. Max reconnect attempts reached.')
      }
    }
    
    ws.onerror = (error) => {
      console.error('[WS] Error:', error)
      setError('WebSocket connection error')
    }
  }, [setConnected, setConnecting, setError, handleMessage])
  
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setConnected(false)
    setConnecting(false)
  }, [setConnected, setConnecting])
  
  const send = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    }
  }, [])
  
  // Auto-connect on mount
  useEffect(() => {
    connect()
    return () => disconnect()
  }, [connect, disconnect])
  
  return { connect, disconnect, send }
}

/** Hook for fetching initial data */
export function useInitialData() {
  const { setGraph, setTasks, setWorkers, setStatusSummary, setCurrentPlan } = useStore()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    let mounted = true
    
    async function fetchInitialData() {
      try {
        setLoading(true)
        
        const [graphRes, tasksRes, workersRes, statusRes, planRes] = await Promise.all([
          orchestratorApi.getGraph(),
          orchestratorApi.listTasks({ limit: 100 }),
          orchestratorApi.listWorkers(),
          orchestratorApi.getStatus(),
          orchestratorApi.getPlan(),
        ])
        
        if (!mounted) return
        
        setGraph(graphRes.data)
        setTasks(tasksRes.data.tasks)
        setWorkers(workersRes.data.workers)
        setStatusSummary(statusRes.data)
        setCurrentPlan(planRes.data.plan)
      } catch (e) {
        if (mounted) {
          setError(e instanceof Error ? e.message : 'Failed to fetch initial data')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }
    
    fetchInitialData()
    
    return () => { mounted = false }
  }, [setGraph, setTasks, setWorkers, setStatusSummary, setCurrentPlan])
  
  return { loading, error }
}