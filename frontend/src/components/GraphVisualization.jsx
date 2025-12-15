import ReactFlow, { Controls, Background } from 'reactflow'
import 'reactflow/dist/style.css'
import PropTypes from 'prop-types'

function GraphVisualization({ nodes, edges, selectedNode, highlightedNodes, onNodesChange, onEdgesChange, onNodeClick }) {
  const styledNodes = nodes.map(node => ({
    ...node,
    className: node.id === selectedNode
      ? 'node-selected'
      : highlightedNodes.has(node.id)
      ? 'node-highlighted'
      : ''
  }))

  return (
    <ReactFlow
      nodes={styledNodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={onNodeClick}
      fitView
      minZoom={0.01}
      maxZoom={2}
      style={{ width: selectedNode ? 'calc(100vw - 300px)' : '100vw' }}
    >
      <Controls />
      <Background />
    </ReactFlow>
  )
}

GraphVisualization.propTypes = {
  nodes: PropTypes.array.isRequired,
  edges: PropTypes.array.isRequired,
  selectedNode: PropTypes.string,
  highlightedNodes: PropTypes.instanceOf(Set).isRequired,
  onNodesChange: PropTypes.func.isRequired,
  onEdgesChange: PropTypes.func.isRequired,
  onNodeClick: PropTypes.func.isRequired
}

export default GraphVisualization
