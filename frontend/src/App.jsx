import { useState, useEffect, useCallback } from 'react'
import ReactFlow, { Controls, Background, applyNodeChanges, applyEdgeChanges } from 'reactflow'
import { forceSimulation, forceManyBody, forceCenter, forceLink } from 'd3-force'
import 'reactflow/dist/style.css'
import './App.css'

function App() {
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedNode, setSelectedNode] = useState(null)
  const [highlightedNodes, setHighlightedNodes] = useState(new Set())

  useEffect(() => {
    fetch('/api/graph')
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to fetch graph data')
        }
        return response.json()
      })
      .then(data => {
        // Convert to d3-force compatible format
        const nodes = data?.nodes?.map((node, index) => ({
          id: node.id,
          data: { label: node.label, type: node.type, path: node.path },
          type: 'default',
          index: index
        }))

        // Create id to index mapping
        const idToIndex = new Map(data?.nodes?.map((node, index) => [node.id, index]))

        const links = data.edges.map((edge) => ({
          source: idToIndex.get(edge.from),
          target: idToIndex.get(edge.to)
        }))

        // Apply force-directed layout
        const simulation = forceSimulation(nodes)
          .force('charge', forceManyBody().strength(-800))
          .force('center', forceCenter(1000, 800))
          .force('link', forceLink(links).distance(150).id(d => d.id))
          .stop()

        // Run simulation
        for (let i = 0; i < 300; i++) {
          simulation.tick()
        }

        // Convert back to React Flow format with calculated positions
        const reactFlowNodes = nodes.map((node) => ({
          id: node.id,
          position: { x: node.x || 0, y: node.y || 0 },
          data: node.data,
          type: 'default'
        }))

        const reactFlowEdges = data.edges.map((edge, index) => ({
          id: `e${index}`,
          source: edge.from,
          target: edge.to,
          type: 'default'
        }))

        setGraphData({ nodes: reactFlowNodes, edges: reactFlowEdges })
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

  const onNodeClick = useCallback((event, node) => {
    if (selectedNode === node.id) {
      // Deselect if clicking the same node
      setSelectedNode(null)
      setHighlightedNodes(new Set())
    } else {
      setSelectedNode(node.id)
      // Find all connected nodes
      const connected = new Set([node.id])
      graphData.edges.forEach(edge => {
        if (edge.source === node.id) {
          connected.add(edge.target)
        }
        if (edge.target === node.id) {
          connected.add(edge.source)
        }
      })
      setHighlightedNodes(connected)
    }
  }, [selectedNode, graphData.edges])

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
        nodes={graphData.nodes.map(node => ({
          ...node,
          style: node.id === selectedNode
            ? { background: '#ffebee', borderColor: '#f44336', borderWidth: 3 }
            : highlightedNodes.has(node.id)
            ? { background: '#e3f2fd', borderColor: '#2196f3', borderWidth: 2 }
            : {}
        }))}
        edges={graphData.edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        fitView
      >
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  )
}

export default App
