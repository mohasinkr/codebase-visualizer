import { useState, useEffect, useCallback } from 'react'
import ReactFlow, { Controls, Background, applyNodeChanges, applyEdgeChanges } from 'reactflow'
import 'reactflow/dist/style.css'
import './App.css'

function App() {
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedNode, setSelectedNode] = useState(null)
  const [selectedNodeData, setSelectedNodeData] = useState(null)
  const [highlightedNodes, setHighlightedNodes] = useState(new Set())
  const [progress, setProgress] = useState({ status: 'idle', message: '', percentage: 0 })
  const [sseConnected, setSseConnected] = useState(false)

  // Listen for progress updates via SSE
  useEffect(() => {
    const eventSource = new EventSource('/progress')

    eventSource.onopen = () => {
      console.log('SSE connection established')
      setSseConnected(true)
    }

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)
      setProgress(data)
      console.log('Progress update:', data)
    }

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error)
    }

    return () => {
      eventSource.close()
    }
  }, [])

  // Fetch graph data only after SSE is connected
  useEffect(() => {
    if (!sseConnected) return

    fetch('/graph.json')
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to fetch graph data')
        }
        return response.json()
      })
      .then(data => {
        // Convert to React Flow format (positions calculated in backend)
        const nodes = data.nodes.map((node) => ({
          id: node.id,
          position: node.position,
          data: { label: node.label, type: node.type, path: node.path },
          type: 'default',
          style: {}
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
  }, [sseConnected])



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
      setSelectedNodeData(null)
      setHighlightedNodes(new Set())
    } else {
      setSelectedNode(node.id)
      setSelectedNodeData(node.data)
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
    return (
      <div className="loading-screen">
        <h1>Codebase Visualizer</h1>
        <p>Loading codebase visualization...</p>
        {progress.status !== 'idle' && progress.status !== 'complete' && (
          <div className="progress-info">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${progress.percentage}%` }}
              ></div>
            </div>
            <p>{progress.message}</p>
          </div>
        )}
        {progress.status === 'complete' && (
          <div className="progress-complete">
            ✓ {progress.message}
          </div>
        )}
      </div>
    )
  }

  if (error) {
    return <div className="error">Error: {error}</div>
  }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <div className="header">
        <h1>Codebase Visualizer</h1>
        <p>Nodes: {graphData.nodes.length} | Edges: {graphData.edges.length}</p>
        {progress.status !== 'idle' && progress.status !== 'complete' && (
          <div className="progress-info">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${progress.percentage}%` }}
              ></div>
            </div>
            <p>{progress.message}</p>
          </div>
        )}
        {progress.status === 'complete' && (
          <div className="progress-complete">
            ✓ {progress.message}
          </div>
        )}
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
        minZoom={0.01}
        maxZoom={2}
        style={{ width: selectedNodeData ? 'calc(100vw - 300px)' : '100vw' }}
      >
        <Controls />
        <Background />
      </ReactFlow>

      {selectedNodeData && (
        <div className="node-details-panel">
          <h3>File Details</h3>
          <div className="detail-item">
            <strong>Name:</strong> {selectedNodeData.label}
          </div>
          <div className="detail-item">
            <strong>Path:</strong> {selectedNodeData.path}
          </div>
          <div className="detail-item">
            <strong>Type:</strong> {selectedNodeData.type}
          </div>
          <div className="detail-item">
            <strong>Connections:</strong> {graphData.edges.filter(edge =>
              edge.source === selectedNode || edge.target === selectedNode
            ).length}
          </div>
        </div>
      )}
    </div>
  )
}

export default App
