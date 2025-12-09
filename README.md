# Codebase Visualizer

A simple Python script that scans a codebase directory and generates an interactive graph visualization showing file dependencies and architecture.

## Features

- Scans Python, JavaScript, and TypeScript files
- Parses import/dependency relationships
- Interactive graph visualization with React Flow
- Automatic browser opening
- CLI interface for specifying directory paths

## Requirements

- Python 3.7+
- Node.js (for building the frontend)
- pnpm (recommended) or npm

## Installation

1. Clone or download this repository
2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Install Node.js dependencies and build the frontend:
   ```bash
   cd frontend
   pnpm install
   pnpm build
   cd ..
   ```

## Usage

### Basic Usage (scan current directory)
```bash
python visualizer.py
```

### Scan a specific directory
```bash
python visualizer.py /path/to/your/codebase
```

The script will:
1. Scan the specified directory for supported files
2. Analyze dependencies and build a graph
3. Start a web server on http://localhost:5000
4. Automatically open your browser to view the visualization

## Supported File Types

- **Python** (.py): Parses `import` and `from ... import` statements
- **JavaScript/TypeScript** (.js, .ts, .jsx, .tsx): Parses ES6 imports and CommonJS require statements

## How It Works

1. **File Scanning**: Recursively scans the directory, excluding common ignore patterns (.git, node_modules, etc.)
2. **Dependency Analysis**: Uses AST parsing for Python and regex for JavaScript to extract import relationships
3. **Graph Construction**: Creates nodes for files and edges for dependencies
4. **Visualization**: Serves an interactive React Flow graph showing the codebase architecture

## Architecture

```
Python Script (Flask)
├── File Scanner → Dependency Parser → Graph Builder
└── Web Server (serves React frontend)

React Frontend (React Flow)
├── Fetches graph data from /api/graph
├── Renders interactive node-based graph
└── Provides zoom, pan, and selection controls
```

## Development

To modify the frontend:
```bash
cd frontend
pnpm dev  # Start development server
```

To rebuild after changes:
```bash
cd frontend
pnpm build
```

## Limitations

- Currently supports Python and JavaScript/TypeScript files
- Dependency resolution is basic and may not handle all import patterns
- Large codebases may require performance optimizations
- Graph layout is simple grid-based (can be improved with layout algorithms)

## Contributing

Feel free to add support for more languages, improve dependency parsing, or enhance the visualization features!
