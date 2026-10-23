/** Custom Edge Components */

import { Edge, EdgeProps, MarkerType } from 'reactflow'

/** Delegation edge (Chief -> Worker) */
export function DelegationEdge({ 
  id, 
  sourceX, 
  sourceY, 
  targetX, 
  targetY, 
  animated, 
  ...props 
}: EdgeProps) {
  return (
    <Edge
      id={id}
      sourceX={sourceX}
      sourceY={sourceY}
      targetX={targetX}
      targetY={targetY}
      type="smoothstep"
      animated={animated}
      markerEnd={MarkerType.ArrowClosed}
      strokeWidth={2}
      stroke={animated ? '#8b5cf6' : '#8b5cf6/50'}
      strokeDasharray={animated ? undefined : '5,5'}
      style={{
        filter: animated ? 'drop-shadow(0 0 4px rgb(139,92,246))' : 'none',
      }}
      {...props}
    />
  )
}

/** Dependency edge (Task -> Task) */
export function DependencyEdge({ 
  id, 
  sourceX, 
  sourceY, 
  targetX, 
  targetY, 
  ...props 
}: EdgeProps) {
  return (
    <Edge
      id={id}
      sourceX={sourceX}
      sourceY={sourceY}
      targetX={targetX}
      targetY={targetY}
      type="step"
      markerEnd={MarkerType.ArrowClosed}
      strokeWidth={1.5}
      stroke='#94a3b8'
      strokeDasharray="3,3"
      style={{
        opacity: 0.7,
      }}
      {...props}
    />
  )
}

/** Artifact edge (Task -> Artifact) */
export function ArtifactEdge({ 
  id, 
  sourceX, 
  sourceY, 
  targetX, 
  targetY, 
  ...props 
}: EdgeProps) {
  return (
    <Edge
      id={id}
      sourceX={sourceX}
      sourceY={sourceY}
      targetX={targetX}
      targetY={targetY}
      type="smoothstep"
      markerEnd={MarkerType.ArrowClosed}
      strokeWidth={1.5}
      stroke='#06b6d4'
      strokeDasharray="2,4"
      style={{
        opacity: 0.8,
      }}
      {...props}
    />
  )
}

/** Default edge */
export function DefaultEdge(props: EdgeProps) {
  return (
    <Edge
      {...props}
      type="smoothstep"
      markerEnd={MarkerType.ArrowClosed}
      strokeWidth={1.5}
      stroke='#64748b'
    />
  )
}

/** Edge type map for React Flow */
export const edgeTypes = {
  delegation: DelegationEdge,
  dependency: DependencyEdge,
  artifact: ArtifactEdge,
  default: DefaultEdge,
}