import { useState } from 'react'
import PropTypes from 'prop-types'

function PathSelection({ onPathSubmit }) {
  const [selectedPath, setSelectedPath] = useState('')

  const handleSubmit = () => {
    if (selectedPath.trim()) {
      onPathSubmit(selectedPath.trim())
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit()
    }
  }

  return (
    <div className="path-selection">
      <h1>Codebase Visualizer</h1>
      <p>Enter the path to the codebase you want to analyze:</p>
      <div className="path-input-container">
        <input
          type="text"
          value={selectedPath}
          onChange={(e) => setSelectedPath(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="/path/to/your/project"
          className="path-input"
        />
        <button
          onClick={handleSubmit}
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

PathSelection.propTypes = {
  onPathSubmit: PropTypes.func.isRequired
}

export default PathSelection
