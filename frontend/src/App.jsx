import { useState, useCallback } from 'react'
import { applyNodeChanges, applyEdgeChanges } from 'reactflow'
import './App.css'

import LoadingScreen from './components/LoadingScreen'
import PathSelection from './components/PathSelection'
import Header from './components/Header'
import SearchBar from './components/SearchBar'
import GraphVisualization from './components/GraphVisualization'
import NodeDetailsPanel from './components/NodeDetailsPanel'
import useGraphData from './hooks/useGraphData'

function App() {
  const {
    graphData,
    loading,
    error,
    projectMetadata,
    progress,
    reindexProject,
    analyzePath
  } = useGraphData()

  const [selectedNode, setSelectedNode] = useState(null)
  const [selectedNodeData, setSelectedNodeData] = useState(null)
  const [highlightedNodes, setHighlightedNodes] = useState(new Set())

  const onNodesChange = useCallback(
    (changes) => applyNodeChanges(changes, graphData.nodes),
    [graphData.nodes]
  )

  const onEdgesChange = useCallback(
    (changes) => applyEdgeChanges(changes, graphData.edges),
    [graphData.edges]
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

  const handleOpenInVSCode = useCallback(async (filePath) => {
    try {
      const response = await fetch(`/api/open-in-vscode/${encodeURIComponent(filePath)}`)
      const data = await response.json()
      if (data.status === 'opened') {
        console.log(`Opened ${data.file} in VS Code`)
      } else {
        console.error('Error opening file:', data.error)
      }
    } catch (err) {
      console.error('Error opening file in VS Code:', err)
    }
  }, [])

  if (loading) {
    return <LoadingScreen progress={progress} />
  }

  if (error) {
    return <div className="error">Error: {error}</div>
  }

  // Show path selection if no graph data loaded
  if (!graphData.nodes.length && !loading) {
    return <PathSelection onPathSubmit={analyzePath} />
  }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Header
        projectMetadata={projectMetadata}
        onReindex={reindexProject}
        progress={progress}
        graphData={graphData}
      >
        <SearchBar
          nodes={graphData.nodes}
          onNodeSelect={onNodeClick}
        />
      </Header>

      <GraphVisualization
        nodes={graphData.nodes}
        edges={graphData.edges}
        selectedNode={selectedNode}
        highlightedNodes={highlightedNodes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
      />

      <NodeDetailsPanel
        selectedNodeData={selectedNodeData}
        edges={graphData.edges}
        selectedNode={selectedNode}
        onOpenInVSCode={handleOpenInVSCode}
      />
    </div>
  )
}

export default App
