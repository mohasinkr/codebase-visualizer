import PropTypes from 'prop-types'

function NodeDetailsPanel({ selectedNodeData, edges, selectedNode, onOpenInVSCode }) {
  if (!selectedNodeData) {
    return null
  }

  const connectionCount = edges.filter(edge =>
    edge.source === selectedNode || edge.target === selectedNode
  ).length

  return (
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
        <strong>Connections:</strong> {connectionCount}
      </div>
      <button
        onClick={() => onOpenInVSCode(selectedNodeData.path)}
        className="open-vscode-button"
      >
        Open in VS Code
      </button>
    </div>
  )
}

NodeDetailsPanel.propTypes = {
  selectedNodeData: PropTypes.shape({
    label: PropTypes.string.isRequired,
    path: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired
  }),
  edges: PropTypes.array.isRequired,
  selectedNode: PropTypes.string,
  onOpenInVSCode: PropTypes.func.isRequired
}

export default NodeDetailsPanel
