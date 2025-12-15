import PropTypes from 'prop-types'

function Header({ projectMetadata, onReindex, progress, children, graphData }) {
  return (
    <div className="header">
      <div className="header-content">
        <div>
          <h1>Codebase Visualizer</h1>
          {projectMetadata && (
            <p className="project-info">
              Project: <strong>{projectMetadata.project_name}</strong> |
              Generated: {new Date(projectMetadata.generated_at * 1000).toLocaleString()} |
              Nodes: {projectMetadata.file_count} | Edges: {projectMetadata.connection_count}
            </p>
          )}
          {!projectMetadata && graphData && (
            <p>Nodes: {graphData.nodes?.length || 0} | Edges: {graphData.edges?.length || 0}</p>
          )}
        </div>

        {children}

        {projectMetadata && (
          <button
            onClick={onReindex}
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
  )
}

Header.propTypes = {
  projectMetadata: PropTypes.shape({
    project_name: PropTypes.string,
    generated_at: PropTypes.number,
    file_count: PropTypes.number,
    connection_count: PropTypes.number
  }),
  onReindex: PropTypes.func.isRequired,
  progress: PropTypes.shape({
    status: PropTypes.string,
    message: PropTypes.string,
    percentage: PropTypes.number
  }).isRequired,
  children: PropTypes.node,
  graphData: PropTypes.shape({
    nodes: PropTypes.array,
    edges: PropTypes.array
  })
}

export default Header
