import { useState, useEffect, useCallback } from 'react'
import ReactFlow, { Controls, Background, applyNodeChanges, applyEdgeChanges } from 'reactflow'
import 'reactflow/dist/style.css'
import './App.css'

function App() {
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/graph')
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to fetch graph data')
        }
        return response.json()
      })
      .then(data => {
        // Convert to React Flow format
        const nodes = data.nodes.map((node, index) => ({
          id: node.id,
          position: { x: (index % 10) * 150, y: Math.floor(index / 10) * 100 }, // Simple grid layout
          data: { label: node.label, type: node.type, path: node.path },
          type: 'default'
        }))

        const edges = data.edges.map((edge, index) => ({
          id: `e${index}`,
          source: edge.from,
          target: edge.to,
          type: 'default'
        }))

        setGraphData({ nodes, edges })
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  const onNodesChange = useCallback(
    (changes) => setGraphData((prev) => ({ ...prev, nodes: applyNodeChanges(changes, prev.nodes) })),
    []
  )

  const onEdgesChange = useCallback(
    (changes) => setGraphData((prev) => ({ ...prev, edges: applyEdgeChanges(changes, prev.edges) })),
    []
  )

  if (loading) {
    return <div className="loading">Loading codebase visualization...</div>
  }

  if (error) {
    return <div className="error">Error: {error}</div>
  }

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <div className="header">
        <h1>Codebase Visualizer</h1>
        <p>Nodes: {graphData.nodes.length} | Edges: {graphData.edges.length}</p>
      </div>
      <ReactFlow
        nodes={graphData.nodes}
        edges={graphData.edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
      >
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  )
}

export default App
