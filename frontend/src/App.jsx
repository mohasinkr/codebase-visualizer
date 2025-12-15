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
  const [projectMetadata, setProjectMetadata] = useState(null)
  const [selectedPath, setSelectedPath] = useState('')

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

  // Check for existing graph or show path selection
  useEffect(() => {
    if (!sseConnected) return

    fetch('/graph.json')
      .then(response => {
        if (response.ok) {
          return response.json()
        } else {
          // No existing graph, show path selection
          setLoading(false)
          return null
        }
      })
      .then(data => {
        if (data) {
          // Existing graph found
          setProjectMetadata(data.metadata)

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
        }
      })
      .catch(err => {
        // No graph exists, show path selection
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

  // Show path selection if no graph data loaded
  if (!graphData.nodes.length && !loading) {
    return (
      <div className="path-selection">
        <h1>Codebase Visualizer</h1>
        <p>Enter the path to the codebase you want to analyze:</p>
        <div className="path-input-container">
          <input
            type="text"
            value={selectedPath}
            onChange={(e) => setSelectedPath(e.target.value)}
            placeholder="/path/to/your/project"
            className="path-input"
          />
          <button
            onClick={() => {
              if (selectedPath.trim()) {
                setLoading(true)
                // Trigger analysis with selected path
                fetch(`/api/analyze?path=${encodeURIComponent(selectedPath)}`)
                  .then(() => {
                    // After triggering analysis, fetch the graph
                    return fetch('/graph.json')
                  })
                  .then(response => response.json())
                  .then(data => {
                    setProjectMetadata(data.metadata)
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
              }
            }}
            disabled={!selectedPath.trim()}
            className="analyze-button"
          >
            Analyze Codebase
          </button>
        </div>
        <div className="instructions">
          <h3>How it works:</h3>
          <ul>
            <li>Scans for JavaScript, TypeScript, Python, and other source files</li>
            <li>Analyzes import relationships and dependencies</li>
            <li>Creates an interactive graph visualization</li>
            <li>Supports absolute imports (@/path) and relative imports</li>
          </ul>
        </div>
      </div>
    )
  }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <div className="header">
        <div className="header-content">
          <div>
            <h1>Codebase Visualizer</h1>
            {projectMetadata && (
              <p className="project-info">
                Project: <strong>{projectMetadata.project_name}</strong> |
                Generated: {new Date(projectMetadata.generated_at * 1000).toLocaleString()} |
                Nodes: {graphData.nodes.length} | Edges: {graphData.edges.length}
              </p>
            )}
            {!projectMetadata && (
              <p>Nodes: {graphData.nodes.length} | Edges: {graphData.edges.length}</p>
            )}
          </div>
          {projectMetadata && (
            <button
              onClick={() => {
                setLoading(true)
                fetch('/api/reindex')
                  .then(() => fetch('/graph.json'))
                  .then(response => response.json())
                  .then(data => {
                    setProjectMetadata(data.metadata)
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
              }}
              className="reindex-button"
            >
              Reindex Project
            </button>
          )}
        </div>
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
          <button
            onClick={() => {
              fetch(`/api/open-in-vscode/${encodeURIComponent(selectedNodeData.path)}`)
                .then(response => response.json())
                .then(data => {
                  if (data.status === 'opened') {
                    console.log(`Opened ${data.file} in VS Code`);
                  } else {
                    console.error('Error opening file:', data.error);
                  }
                })
                .catch(err => {
                  console.error('Error opening file in VS Code:', err);
                });
            }}
            className="open-vscode-button"
          >
            Open in VS Code
          </button>
        </div>
      )}
    </div>
  )
}

export default App
