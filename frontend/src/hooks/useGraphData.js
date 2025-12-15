import { useState, useEffect, useCallback } from 'react'

function useGraphData() {
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [projectMetadata, setProjectMetadata] = useState(null)
  const [sseConnected, setSseConnected] = useState(false)
  const [progress, setProgress] = useState({ status: 'idle', message: '', percentage: 0 })

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

  const loadGraphData = useCallback(async () => {
    try {
      const response = await fetch('/graph.json')
      if (response.ok) {
        const data = await response.json()
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
        return true
      }
    } catch (err) {
      console.error('Error loading graph data:', err)
    }
    return false
  }, [])

  const reindexProject = useCallback(async () => {
    setLoading(true)
    try {
      await fetch('/api/reindex')
      await loadGraphData()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [loadGraphData])

  const analyzePath = useCallback(async (path) => {
    setLoading(true)
    setError(null)
    try {
      // Note: This endpoint doesn't exist yet, but we can implement it later
      const response = await fetch(`/api/analyze?path=${encodeURIComponent(path)}`)
      if (!response.ok) {
        throw new Error('Analysis failed')
      }
      await loadGraphData()
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }, [loadGraphData])

  return {
    graphData,
    loading,
    error,
    projectMetadata,
    progress,
    reindexProject,
    analyzePath,
    loadGraphData
  }
}

export default useGraphData
