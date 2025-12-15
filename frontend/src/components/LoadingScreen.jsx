import PropTypes from 'prop-types'

function LoadingScreen({ progress }) {
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

LoadingScreen.propTypes = {
  progress: PropTypes.shape({
    status: PropTypes.string,
    message: PropTypes.string,
    percentage: PropTypes.number
  }).isRequired
}

export default LoadingScreen
