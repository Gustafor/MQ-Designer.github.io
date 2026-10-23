/** Artifact Node Component (Diamond shape for files) */

import { Handle, Position, NodeProps } from 'reactflow'
import { FileCode, FileText, FileJson, FileImage, File, Download } from 'lucide-react'
import { useStore } from '../store'

interface ArtifactNodeData {
  label: string
  path: string
  task_id: string
}

const fileIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  py: FileCode,
  js: FileCode,
  ts: FileCode,
  tsx: FileCode,
  json: FileJson,
  md: FileText,
  txt: FileText,
  yaml: FileText,
  yml: FileText,
  png: FileImage,
  jpg: FileImage,
  jpeg: FileImage,
  svg: FileImage,
}

export function ArtifactNode({ data, id }: NodeProps<ArtifactNodeData>) {
  const { label, path, task_id } = data
  const { selectedNodeId, setSelectedNodeId } = useStore()
  
  const isSelected = selectedNodeId === id
  const ext = path.split('.').pop()?.toLowerCase() || ''
  const Icon = fileIcons[ext] || File
  
  return (
    <div
      className={`group relative w-40 h-40 transition-all duration-300 ${
        isSelected 
          ? 'shadow-[0_0_0_2px_rgb(6,182,212)] shadow-lg' 
          : ''
      } transform rotate-45 cursor-pointer`}
      onClick={() => setSelectedNodeId(isSelected ? null : id)}
      style={{ transformOrigin: 'center center' }}
    >
      {/* Diamond shape */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-cyan-700 border-2 border-cyan-400/50 rounded-[4px] opacity-90 hover:opacity-100 transition-opacity" />
      
      {/* Content - counter-rotated */}
      <div className="absolute inset-0 flex flex-col items-center justify-center p-2 -rotate-45 text-white">
        <Icon className="w-8 h-8 mb-1 drop-shadow-lg" />
        <p className="text-xs font-medium truncate w-full text-center drop-shadow">{label}</p>
        <p className="text-[10px] truncate w-full text-center text-cyan-100/80">{path}</p>
      </div>
      
      {/* Handles - positioned at diamond corners */}
      <Handle 
        type="target" 
        position={Position.Top} 
        className="w-3 h-3 bg-cyan-400 border-2 border-white -translate-x-1/2 -translate-y-1/2 left-1/2 top-0" 
        style={{ transform: 'translate(-50%, -50%) rotate(-45deg)' }}
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="w-3 h-3 bg-cyan-400 border-2 border-white -translate-x-1/2 -translate-y-1/2 left-1/2 bottom-0" 
        style={{ transform: 'translate(-50%, 50%) rotate(-45deg)' }}
      />
      <Handle 
        type="target" 
        position={Position.Left} 
        className="w-3 h-3 bg-cyan-400 border-2 border-white -translate-x-1/2 -translate-y-1/2 left-0 top-1/2" 
        style={{ transform: 'translate(-50%, -50%) rotate(-45deg)' }}
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        className="w-3 h-3 bg-cyan-400 border-2 border-white -translate-x-1/2 -translate-y-1/2 right-0 top-1/2" 
        style={{ transform: 'translate(50%, -50%) rotate(-45deg)' }}
      />
    </div>
  )
}