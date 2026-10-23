/** Main Graph View with React Flow */

import { 
  ReactFlow, 
  Background, 
  Controls, 
  MiniMap, 
  useNodesState, 
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  OnNodesChange,
  OnEdgesChange,
  Viewport,
} from 'reactflow'
import { useEffect, useCallback, useMemo } from 'react'
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Maximize2, 
  Minimize2,
  Layout,
  Settings,
} from 'lucide-react'
import { useStore } from '../store'
import { ChiefNode } from '../nodes/ChiefNode'
import { WorkerNode } from '../nodes/WorkerNode'
import { TaskNode } from '../nodes/TaskNode'
import { ArtifactNode } from '../nodes/ArtifactNode'
import { edgeTypes } from '../edges/CustomEdges'
import type { GraphNode, GraphEdge } from '../types'

export function GraphView() {
  const { nodes: storeNodes, edges: storeEdges, setSelectedNodeId, selectedNodeId } = useStore()
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 })
  const [fitView, setFitView] = useState(false)
  
  // Sync with store
  useEffect(() => {
    setNodes(storeNodes)
    setEdges(storeEdges)
  }, [storeNodes, storeEdges, setNodes, setEdges])
  
  // Fit view on first load
  useEffect(() => {
    if (fitView && nodes.length > 0) {
      // ReactFlow will auto-fit via the fitView prop
    }
  }, [])
  
  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge({ ...params, type: 'default' }, eds))
  }, [setEdges])
  
  const nodeTypes = useMemo(() => ({
    chief: ChiefNode,
    worker: WorkerNode,
    task: TaskNode,
    artifact: ArtifactNode,
  }), [])
  
  return (
    <div className="flex-1 relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onViewportChange={setViewport}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView={fitView}
        viewport={viewport}
        minZoom={0.1}
        maxZoom={2}
        snapToGrid={false}
        snapGrid={[15, 15]}
        connectionMode="loose"
        defaultMarkerEnd={MarkerType.ArrowClosed}
        nodesDraggable={true}
        nodesConnectable={true}
        elementsSelectable={true}
        selectNodesOnDrag={false}
        multiSelectionActive={false}
        attributionPosition="bottom-right"
      >
        <Background 
          color="#94a3b8" 
          gap={16} 
          size={1} 
          variant="dots"
          style={{ opacity: 0.3 }}
        />
        <Controls 
          position="top-right"
          showZoom={true}
          showFitView={true}
          showInteractive={true}
        />
        <MiniMap 
          position="bottom-right"
          nodeColor={(node) => {
            const colors: Record<string, string> = {
              chief: '#8b5cf6',
              worker: '#22c55e',
              task: '#3b82f6',
              artifact: '#06b6d4',
            }
            return colors[node.type] || '#64748b'
          }}
          maskColor="rgba(139, 92, 246, 0.2)"
        />
      </ReactFlow>
      
      {/* Toolbar */}
      <div className="absolute bottom-4 left-4 flex flex-col gap-2 z-10">
        <button
          className="btn-secondary p-2 rounded-xl shadow-lg"
          onClick={() => setFitView(true)}
          title="Fit View"
        >
          <Maximize2 className="w-5 h-5" />
        </button>
        <button
          className="btn-secondary p-2 rounded-xl shadow-lg"
          onClick={() => {
            // Reset viewport
          }}
          title="Reset View"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
        <button
          className="btn-secondary p-2 rounded-xl shadow-lg"
          title="Layout"
        >
          <Layout className="w-5 h-5" />
        </button>
      </div>
      
      {/* Legend */}
      <div className="absolute bottom-4 right-4 z-10">
        <div className="card p-3 shadow-lg min-w-[180px] animate-slide-up">
          <p className="font-medium text-sm mb-2 text-dark-900 dark:text-dark-100">Legend</p>
          <div className="space-y-1.5 text-xs">
            <LegendItem color="#8b5cf6" label="Chief Architect" />
            <LegendItem color="#22c55e" label="Workers" />
            <LegendItem color="#3b82f6" label="Tasks" />
            <LegendItem color="#06b6d4" label="Artifacts" shape="diamond" />
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-dashed border-dark-400 rounded" />
              <span className="text-dark-500 dark:text-dark-400">Dependencies</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-1 bg-purple-500 rounded animate-pulse" />
              <span className="text-dark-500 dark:text-dark-400">Active Delegation</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function LegendItem({ color, label, shape = 'square' }: { color: string; label: string; shape?: 'square' | 'diamond' }) {
  return (
    <div className="flex items-center gap-2">
      <div 
        className={`w-3 h-3 rounded ${shape === 'diamond' ? 'rotate-45' : ''}`} 
        style={{ backgroundColor: color }}
      />
      <span className="text-dark-600 dark:text-dark-400">{label}</span>
    </div>
  )
}

import { useState } from 'react'
import { MarkerType } from 'reactflow'