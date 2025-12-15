import { useState, useCallback } from 'react'
import PropTypes from 'prop-types'

function SearchBar({ nodes, onNodeSelect }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)

  const handleSearchChange = useCallback((e) => {
    const term = e.target.value.toLowerCase()
    setSearchTerm(term)

    if (term.length > 0) {
      const results = nodes.filter(node =>
        node.data.label.toLowerCase().includes(term) ||
        node.data.path.toLowerCase().includes(term)
      ).slice(0, 10) // Limit to 10 results
      setSearchResults(results)
      setShowDropdown(true)
    } else {
      setSearchResults([])
      setShowDropdown(false)
    }
  }, [nodes])

  const handleSearchKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && searchResults.length > 0) {
      // Select the first result
      const firstResult = searchResults[0]
      onNodeSelect(null, firstResult)
      setSearchTerm('')
      setSearchResults([])
      setShowDropdown(false)
    } else if (e.key === 'Escape') {
      setSearchTerm('')
      setSearchResults([])
      setShowDropdown(false)
    }
  }, [searchResults, onNodeSelect])

  const handleResultClick = useCallback((node) => {
    onNodeSelect(null, node)
    setSearchTerm('')
    setSearchResults([])
    setShowDropdown(false)
  }, [onNodeSelect])

  if (!nodes || nodes.length === 0) {
    return null
  }

  return (
    <div className="search-container">
      <input
        type="text"
        value={searchTerm}
        onChange={handleSearchChange}
        onKeyDown={handleSearchKeyDown}
        placeholder="Search files..."
        className="search-input"
      />
      {showDropdown && searchResults.length > 0 && (
        <div className="search-dropdown">
          {searchResults.map((node, index) => (
            <div
              key={node.id}
              className={`search-result ${index === 0 ? 'first-result' : ''}`}
              onClick={() => handleResultClick(node)}
            >
              <div className="search-result-label">{node.data.label}</div>
              <div className="search-result-path">{node.data.path}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

SearchBar.propTypes = {
  nodes: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    data: PropTypes.shape({
      label: PropTypes.string.isRequired,
      path: PropTypes.string.isRequired
    }).isRequired
  })),
  onNodeSelect: PropTypes.func.isRequired
}

export default SearchBar
