#!/usr/bin/env python3
import os
import sys
import json
import ast
import re
import webbrowser
import threading
import time
from flask import Flask, jsonify, send_from_directory, Response
from flask_cors import CORS
from queue import Queue

app = Flask(__name__, static_folder='frontend/dist', static_url_path='')
CORS(app)

# Store the initial path for graph generation
INITIAL_PATH = None

# Global progress tracking
progress_clients = []
current_progress = {'status': 'idle', 'message': '', 'percentage': 0}

def load_gitignore_patterns(path):
    """Load patterns from .gitignore file."""
    gitignore_path = os.path.join(path, '.gitignore')
    patterns = []
    if os.path.exists(gitignore_path):
        try:
            with open(gitignore_path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#'):
                        patterns.append(line.rstrip('/'))
        except Exception as e:
            print(f"Error reading .gitignore: {e}")
    return patterns

def scan_directory(path, ignore_patterns=None):
    """Scan directory for files, excluding ignored patterns and filtering by allowed extensions."""
    if ignore_patterns is None:
        # Default patterns plus from .gitignore
        default_patterns = ['.git', 'node_modules', '__pycache__', '.vscode', 'dist', 'build', '.husky', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', '.npmrc', '.yarnrc', '.prettierrc', '.eslintrc', 'prettier.config.js', 'eslint.config.js', '.prettierignore', '.editorconfig']
        gitignore_patterns = load_gitignore_patterns(path)
        ignore_patterns = default_patterns + gitignore_patterns

    # Only allow these file extensions
    allowed_extensions = ['.js', '.json', '.jsx', '.tsx', '.jpg', '.ts', '.py', '.c']

    files = []
    for root, dirs, files_list in os.walk(path):
        # Remove ignored directories
        dirs[:] = [d for d in dirs if not any(d == pattern or d.startswith(pattern + '/') for pattern in ignore_patterns)]

        for file in files_list:
            # Skip files starting with .
            if file.startswith('.'):
                continue
            # Only include files with allowed extensions
            if not any(file.endswith(ext) for ext in allowed_extensions):
                continue
            if not any(pattern in os.path.join(root, file) for pattern in ignore_patterns):
                full_path = os.path.join(root, file)
                # Skip binary files or very large files (except for small images)
                if os.path.getsize(full_path) < 1024 * 1024:  # 1MB limit
                    files.append(full_path)

    return files

def parse_python_dependencies(file_path):
    """Parse Python file for import dependencies."""
    dependencies = []
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            tree = ast.parse(content, filename=file_path)

            for node in ast.walk(tree):
                if isinstance(node, ast.Import):
                    for alias in node.names:
                        # Convert module name to potential file path
                        dep = alias.name.replace('.', '/') + '.py'
                        dependencies.append(dep)
                elif isinstance(node, ast.ImportFrom):
                    if node.module:
                        dep = node.module.replace('.', '/') + '.py'
                        dependencies.append(dep)
    except Exception as e:
        print(f"Error parsing {file_path}: {e}")

    return dependencies

def parse_html_dependencies(file_path):
    """Parse HTML file for link/script/img dependencies."""
    dependencies = []
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

            # Match href in link tags, src in script/img tags
            patterns = [
                r'<link[^>]*href=["\']([^"\']+)["\']',
                r'<script[^>]*src=["\']([^"\']+)["\']',
                r'<img[^>]*src=["\']([^"\']+)["\']',
                r'<source[^>]*src=["\']([^"\']+)["\']',
                r'<iframe[^>]*src=["\']([^"\']+)["\']'
            ]

            for pattern in patterns:
                matches = re.findall(pattern, content, re.IGNORECASE)
                for match in matches:
                    if match.startswith('./') or match.startswith('../') or (not match.startswith('http') and not match.startswith('//') and not match.startswith('data:')):
                        dependencies.append(match)
    except Exception as e:
        print(f"Error parsing {file_path}: {e}")

    return dependencies

def parse_css_dependencies(file_path):
    """Parse CSS file for @import and url() dependencies."""
    dependencies = []
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

            # Match @import and url()
            patterns = [
                r'@import\s+["\']([^"\']+)["\']',
                r'url\(["\']?([^"\']+)["\']?\)'
            ]

            for pattern in patterns:
                matches = re.findall(pattern, content)
                for match in matches:
                    if match.startswith('./') or match.startswith('../') or (not match.startswith('http') and not match.startswith('//') and not match.startswith('data:')):
                        dependencies.append(match)
    except Exception as e:
        print(f"Error parsing {file_path}: {e}")

    return dependencies

def parse_json_dependencies(file_path):
    """Parse JSON file for relative path references."""
    dependencies = []
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            # Find all quoted strings that look like relative paths
            matches = re.findall(r'["\']((?:\./|\.\./)[^"\']+)["\']', content)
            for match in matches:
                dependencies.append(match)
    except Exception as e:
        print(f"Error parsing {file_path}: {e}")

    return dependencies

def parse_svg_dependencies(file_path):
    """Parse SVG file for image href references."""
    dependencies = []
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            # Match image href in SVG
            matches = re.findall(r'<image[^>]*href=["\']([^"\']+)["\']', content, re.IGNORECASE)
            for match in matches:
                if match.startswith('./') or match.startswith('../') or (not match.startswith('http') and not match.startswith('//') and not match.startswith('data:')):
                    dependencies.append(match)
    except Exception as e:
        print(f"Error parsing {file_path}: {e}")

    return dependencies

def parse_md_dependencies(file_path):
    """Parse Markdown file for image references."""
    dependencies = []
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            # Match ![alt](path) and <img src="path">
            patterns = [
                r'!\[.*?\]\(([^)]+)\)',
                r'<img[^>]*src=["\']([^"\']+)["\']'
            ]
            for pattern in patterns:
                matches = re.findall(pattern, content, re.IGNORECASE)
                for match in matches:
                    if match.startswith('./') or match.startswith('../') or (not match.startswith('http') and not match.startswith('//') and not match.startswith('data:')):
                        dependencies.append(match)
    except Exception as e:
        print(f"Error parsing {file_path}: {e}")

    return dependencies

def parse_general_dependencies(file_path):
    """Parse any text file for relative path references."""
    dependencies = []
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            # Find all relative paths like ./path or ../path
            matches = re.findall(r'["\']?((?:\./|\.\./)[^"\']*?)["\']?', content)
            for match in matches:
                # Clean up the match (remove quotes if present)
                path = match.strip('"\'')
                if path and not path.startswith('http') and not path.startswith('//') and not path.startswith('data:'):
                    dependencies.append(path)
    except Exception as e:
        # Silently ignore binary files or encoding errors
        pass

    return dependencies

def parse_js_dependencies(file_path):
    """Parse JavaScript/TypeScript file for import dependencies."""
    dependencies = []
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

            # Match import statements
            import_patterns = [
                r'import\s+.*?\s+from\s+[\'"]([^\'"]+)[\'"]',
                r'import\s+[\'"]([^\'"]+)[\'"]',
                r'require\s*\(\s*[\'"]([^\'"]+)[\'"]\s*\)',
                r'import\s*\(\s*[\'"]([^\'"]+)[\'"]\s*\)'  # Dynamic imports
            ]

            for pattern in import_patterns:
                matches = re.findall(pattern, content)
                for match in matches:
                    # Convert relative imports to file paths
                    if match.startswith('./') or match.startswith('../'):
                        dep = match
                        if '.' not in os.path.basename(dep):
                            dep += '.js'  # Assume .js if no extension
                        dependencies.append(dep)
    except Exception as e:
        print(f"Error parsing {file_path}: {e}")

    return dependencies

def update_progress(status, message, percentage=0):
    """Update global progress and notify all SSE clients."""
    global current_progress
    current_progress = {'status': status, 'message': message, 'percentage': percentage}

    # Send update to all SSE clients
    for client in progress_clients[:]:  # Copy list to avoid modification during iteration
        try:
            client.put(f"data: {json.dumps(current_progress)}\n\n")
        except:
            # Remove disconnected clients
            if client in progress_clients:
                progress_clients.remove(client)

def build_graph(files, root_path):
    """Build graph data by searching for file references across all files."""
    nodes = []
    edges = []

    update_progress('scanning', 'Scanning directory for files...', 10)

    # Sort files by relative path for better layout grouping
    sorted_files = sorted(files, key=lambda f: os.path.relpath(f, root_path))

    # Create nodes with calculated positions
    for index, file_path in enumerate(sorted_files):
        rel_path = os.path.relpath(file_path, root_path)
        file_ext = os.path.splitext(file_path)[1].lower()

        # Calculate position with sufficient spacing (6 per row, larger gaps)
        row = index // 6
        col = index % 6
        x = col * 280  # Increased horizontal spacing
        y = row * 180  # Increased vertical spacing

        node = {
            'id': rel_path,
            'label': os.path.basename(file_path),
            'type': file_ext,
            'path': rel_path,
            'position': {'x': x, 'y': y}
        }
        nodes.append(node)

    update_progress('reading', 'Reading file contents...', 30)

    # Read all file contents
    file_contents = {}
    for file_path in files:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                file_contents[file_path] = f.read()
        except Exception:
            # Skip binary files or encoding errors
            file_contents[file_path] = ''

    update_progress('analyzing', 'Analyzing file relationships...', 50)

    # For each target file, search all source files for references
    total_files = len(files)
    for i, target_path in enumerate(files):
        if i % 5 == 0:  # Progress every 5 files for more frequent updates
            progress_pct = 50 + int((i / total_files) * 40)  # 50-90% range
            update_progress('analyzing', f'Processing file {i+1}/{total_files}: {os.path.basename(target_path)}', progress_pct)

        target_rel = os.path.relpath(target_path, root_path)
        target_name = os.path.basename(target_path)
        target_path_no_ext = target_rel.rsplit('.', 1)[0] if '.' in target_rel else target_rel

        # Also include dotted versions for Python-style imports
        target_rel_dotted = target_rel.replace('/', '.')
        target_path_no_ext_dotted = target_path_no_ext.replace('/', '.')

        # Also include @ alias versions (assuming @ points to src)
        target_rel_at = target_rel.replace('src/', '@/', 1) if target_rel.startswith('src/') else None
        target_path_no_ext_at = target_path_no_ext.replace('src/', '@/', 1) if target_path_no_ext.startswith('src/') else None

        search_terms = [target_name, target_rel, target_path_no_ext, target_rel_dotted, target_path_no_ext_dotted]
        if target_rel_at:
            search_terms.extend([target_rel_at, target_path_no_ext_at])

        for source_path in files:
            if source_path != target_path:
                source_rel = os.path.relpath(source_path, root_path)
                content = file_contents[source_path]

                # Also compute relative path from source to target
                source_dir = os.path.dirname(source_path)
                try:
                    rel_import = os.path.relpath(target_path, source_dir)
                    # Normalize to use forward slashes
                    rel_import = rel_import.replace(os.sep, '/')
                    # For same directory, make it ./filename
                    if not rel_import.startswith('.'):
                        rel_import = './' + rel_import
                    search_terms.append(rel_import)
                    # Also add without extension
                    rel_import_no_ext = rel_import.rsplit('.', 1)[0] if '.' in rel_import else rel_import
                    search_terms.append(rel_import_no_ext)
                except ValueError:
                    # Paths on different drives, skip
                    pass

                # Check if any reference to the target file appears in source content
                if any(term in content for term in search_terms):
                    edges.append({
                        'from': source_rel,
                        'to': target_rel
                    })

    update_progress('complete', f'Analysis complete! Found {len(nodes)} files and {len(edges)} connections.', 100)

    return {
        'metadata': {
            'project_path': root_path,
            'project_name': os.path.basename(os.path.abspath(root_path)),
            'generated_at': time.time(),
            'file_count': len(nodes),
            'connection_count': len(edges)
        },
        'nodes': nodes,
        'edges': edges
    }

def resolve_dependency(dep, current_file, file_map):
    """Resolve a dependency path to an actual file in the map."""
    current_dir = os.path.dirname(current_file)

    if dep.startswith('./') or dep.startswith('../'):
        # Relative import
        full_path = os.path.normpath(os.path.join(current_dir, dep))

        # Try different extensions if no extension provided
        if '.' not in os.path.basename(full_path):
            for ext in ['.js', '.ts', '.jsx', '.tsx', '.py', '.html', '.css']:
                test_path = full_path + ext
                if test_path in file_map:
                    return test_path
        else:
            if full_path in file_map:
                return full_path
    elif dep.startswith('@/'):
        # @ alias (commonly points to src directory)
        rel_dep = dep[2:]  # Remove @/
        # Assume @ points to src directory
        src_path = os.path.join('src', rel_dep)
        full_path = os.path.normpath(src_path)

        # Try different extensions if no extension provided
        if '.' not in os.path.basename(full_path):
            for ext in ['.js', '.ts', '.jsx', '.tsx', '.py', '.html', '.css']:
                test_path = full_path + ext
                if test_path in file_map:
                    return test_path
        else:
            if full_path in file_map:
                return full_path
    elif dep.startswith('/'):
        # Absolute path (from HTML base)
        rel_dep = dep[1:]
        full_path = os.path.normpath(os.path.join(current_dir, rel_dep))
        if full_path in file_map:
            return full_path

    return None

@app.route('/api/graph')
def get_graph():
    path = sys.argv[1] if len(sys.argv) > 1 else '.'
    abs_path = os.path.abspath(path)

    if not os.path.exists(abs_path):
        return jsonify({'error': 'Directory not found'}), 404

    files = scan_directory(abs_path)
    graph = build_graph(files, abs_path)

    print(f"Generated graph with {len(graph['nodes'])} nodes and {len(graph['edges'])} edges")

    # Save graph data to JSON file in frontend public directory
    graph_path = 'frontend/dist/graph.json'
    with open(graph_path, 'w') as f:
        json.dump(graph, f, indent=2)
    print(f"Graph data saved to {graph_path}")

    return jsonify(graph)

@app.route('/')
def index():
    return send_from_directory('frontend/dist', 'index.html')

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('frontend/dist', path)

@app.route('/graph.json')
def serve_graph_json():
    """Serve the generated graph JSON file, regenerating if needed."""
    # Regenerate graph for the specified directory
    abs_path = os.path.abspath(INITIAL_PATH)

    if not os.path.exists(abs_path):
        return jsonify({'error': 'Directory not found'}), 404

    files = scan_directory(abs_path)
    graph = build_graph(files, abs_path)

    # Save updated graph data
    with open('graph.json', 'w') as f:
        json.dump(graph, f, indent=2)

    try:
        return send_from_directory('.', 'graph.json', mimetype='application/json')
    except FileNotFoundError:
        return jsonify({'error': 'Graph generation failed'}), 500

@app.route('/api/reindex')
def reindex_codebase():
    """Force regeneration of the graph for the current project."""
    graph_path = 'frontend/dist/graph.json'

    if not os.path.exists(graph_path):
        return jsonify({'error': 'No existing graph to reindex'}), 404

    # Load existing metadata to get the path
    try:
        with open(graph_path, 'r') as f:
            existing_data = json.load(f)
            project_path = existing_data.get('metadata', {}).get('project_path', '.')
    except:
        return jsonify({'error': 'Could not read existing graph'}), 500

    abs_path = os.path.abspath(project_path)

    if not os.path.exists(abs_path):
        return jsonify({'error': 'Project directory no longer exists'}), 404

    files = scan_directory(abs_path)
    graph = build_graph(files, abs_path)

    # Save updated graph data
    with open(graph_path, 'w') as f:
        json.dump(graph, f, indent=2)

    return jsonify({'status': 'reindexed', 'nodes': len(graph['nodes']), 'edges': len(graph['edges'])})

@app.route('/api/open-in-vscode/<path:file_path>')
def open_in_vscode(file_path):
    """Open a file in VS Code editor."""
    try:
        # Get the project path from the graph.json file (same one the frontend uses)
        graph_path = 'graph.json'
        if os.path.exists(graph_path):
            with open(graph_path, 'r') as f:
                existing_data = json.load(f)
                project_path = existing_data.get('metadata', {}).get('project_path', '.')
        else:
            # Fallback to INITIAL_PATH if graph.json doesn't exist
            global INITIAL_PATH
            project_path = INITIAL_PATH if INITIAL_PATH else '.'

        abs_project_path = os.path.abspath(project_path)
        abs_file_path = os.path.join(abs_project_path, file_path)

        # Verify the file exists and is within the project directory
        if not os.path.exists(abs_file_path):
            return jsonify({'error': f'File not found: {abs_file_path}'}), 404

        # Ensure the file is within the project directory for security
        if not os.path.abspath(abs_file_path).startswith(os.path.abspath(abs_project_path)):
            return jsonify({'error': 'Access denied'}), 403

        # Open the file in VS Code
        import subprocess
        result = subprocess.run(['code', abs_file_path], capture_output=True, text=True)
        if result.returncode != 0:
            print(f"VS Code command failed: {result.stderr}")
            return jsonify({'error': f'Failed to open in VS Code: {result.stderr}'}), 500

        return jsonify({'status': 'opened', 'file': file_path, 'project_path': project_path})

    except Exception as e:
        print(f"Error opening file in VS Code: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/progress')
def progress():
    """Server-Sent Events endpoint for progress updates."""
    def generate():
        q = Queue()
        progress_clients.append(q)

        try:
            # Send current progress immediately
            yield f"data: {json.dumps(current_progress)}\n\n"

            # Keep connection alive and send updates
            while True:
                try:
                    message = q.get(timeout=30)  # 30 second timeout
                    yield message
                except:
                    # Send keepalive
                    yield f"data: {json.dumps({'status': 'keepalive'})}\n\n"
        except GeneratorExit:
            # Client disconnected
            if q in progress_clients:
                progress_clients.remove(q)

    return Response(generate(), mimetype='text/event-stream')

def open_browser():
    time.sleep(1)  # Wait for server to start
    webbrowser.open('http://localhost:5000')

if __name__ == '__main__':
    print("Starting Codebase Visualizer...")

    # Set the initial path for graph generation
    INITIAL_PATH = sys.argv[1] if len(sys.argv) > 1 else '.'

    print(f"Configured to analyze path: {INITIAL_PATH}")
    print("Open http://localhost:5000 in your browser")

    # Open browser in a separate thread
    threading.Thread(target=open_browser).start()

    app.run(debug=True, host='0.0.0.0', port=5000)
