import { useState, useEffect, useCallback, useRef } from 'react'
import { useWorkspaceStore } from '../../../store/workspace'

// ── Types ────────────────────────────────────────────────────────────

interface FileEntry {
  name: string
  path: string
  isDirectory: boolean
  isSymlink: boolean
  size: number
  modified: number
}

interface TreeNode extends FileEntry {
  children?: TreeNode[]
  isExpanded: boolean
  isLoading: boolean
  depth: number
}

// ── File icon helper ─────────────────────────────────────────────────

function fileIcon(name: string, isDir: boolean, isExpanded: boolean): string {
  if (isDir) return isExpanded ? '▾' : '▸'
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  switch (ext) {
    case 'ts': case 'tsx': return '◇'
    case 'js': case 'jsx': return '◆'
    case 'json': return '{ }'[0] ?? '{'
    case 'md': case 'mdx': return '¶'
    case 'css': case 'scss': case 'less': return '#'
    case 'html': return '<'
    case 'svg': case 'png': case 'jpg': case 'gif': case 'webp': return '◻'
    case 'sh': case 'bash': case 'zsh': return '$'
    case 'yaml': case 'yml': case 'toml': return '≡'
    case 'lock': return '⊘'
    default: return '·'
  }
}

function iconColor(name: string, isDir: boolean): string {
  if (isDir) return '#d4a040'
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  switch (ext) {
    case 'ts': case 'tsx': return '#548C5A'
    case 'js': case 'jsx': return '#d4a040'
    case 'json': return '#c87830'
    case 'md': case 'mdx': return '#74747C'
    case 'css': case 'scss': return '#6b8fa3'
    case 'html': return '#c45050'
    default: return '#595653'
  }
}

function formatSize(bytes: number): string {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)}M`
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(1)}K`
  return `${bytes}B`
}

// ── Props ────────────────────────────────────────────────────────────

interface Props {
  onOpenFile?: (filePath: string) => void
}

// ── Component ────────────────────────────────────────────────────────

export function FileExplorerPanel({ onOpenFile }: Props) {
  const workspaceRoot = useWorkspaceStore((s) => s.rootPath)
  const openFolder = useWorkspaceStore((s) => s.openFolder)
  const recentFolders = useWorkspaceStore((s) => s.recentFolders)

  // browsePath is the currently displayed directory — starts at workspace root
  const [browsePath, setBrowsePath] = useState<string>('')
  const [tree, setTree] = useState<TreeNode[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Sync browsePath with workspace root
  useEffect(() => {
    if (workspaceRoot) setBrowsePath(workspaceRoot)
  }, [workspaceRoot])

  // Handle "Open Folder" via native dialog
  const handleOpenFolder = useCallback(async () => {
    try {
      const selected = await window.electronAPI.fs.openFolderDialog()
      if (selected) openFolder(selected)
    } catch (err) {
      console.error('[FileExplorer] Open folder dialog failed:', err)
    }
  }, [openFolder])

  // Listen for menu-driven "Open Folder" IPC
  useEffect(() => {
    const unsub = window.electronAPI.fs.onOpenFolder((folderPath: string) => {
      openFolder(folderPath)
    })
    return unsub
  }, [openFolder])

  // Load displayed directory
  useEffect(() => {
    if (!browsePath) return
    async function load(): Promise<void> {
      setIsLoading(true)
      setError(null)
      try {
        const entries = await window.electronAPI.fs.readDir(browsePath)
        setTree(entries.map((e) => ({
          ...e,
          isExpanded: false,
          isLoading: false,
          depth: 0,
        })))
      } catch (err) {
        console.error('[FileExplorer] Failed to read directory:', err)
        setError(`Failed to read: ${browsePath}`)
      } finally {
        setIsLoading(false)
      }
    }
    void load()
  }, [browsePath])

  const toggleExpand = useCallback(async (node: TreeNode) => {
    if (!node.isDirectory) {
      setSelectedPath(node.path)
      onOpenFile?.(node.path)
      return
    }

    // If already loaded, just toggle
    if (node.children !== undefined) {
      setTree((prev) => updateNodeInTree(prev, node.path, { isExpanded: !node.isExpanded }))
      return
    }

    // Load children
    setTree((prev) => updateNodeInTree(prev, node.path, { isLoading: true, isExpanded: true }))
    try {
      const entries = await window.electronAPI.fs.readDir(node.path)
      const children: TreeNode[] = entries.map((e) => ({
        ...e,
        isExpanded: false,
        isLoading: false,
        depth: node.depth + 1,
      }))
      setTree((prev) => updateNodeInTree(prev, node.path, { children, isLoading: false }))
    } catch (err) {
      console.error('[FileExplorer] Failed to expand:', err)
      setTree((prev) => updateNodeInTree(prev, node.path, { isLoading: false, isExpanded: false }))
    }
  }, [onOpenFile])

  const handleNavigateUp = useCallback(() => {
    if (!browsePath) return
    const parent = browsePath.split('/').slice(0, -1).join('/') || '/'
    setBrowsePath(parent)
  }, [browsePath])

  const handleNavigateTo = useCallback((dirPath: string) => {
    setBrowsePath(dirPath)
  }, [])

  // Flatten tree for rendering
  const flatNodes = flattenTree(tree)

  // No folder open — show welcome state
  if (!browsePath) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0E0E0D', color: '#9A9692' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 20 }}>
          <span style={{ fontSize: 28, color: '#3a3a38' }}>⊞</span>
          <span style={{ color: '#595653', fontSize: 12, textAlign: 'center' }}>No folder open</span>
          <button
            onClick={() => void handleOpenFolder()}
            style={{
              background: '#548C5A', color: '#0E0E0D', border: 'none', borderRadius: 4,
              padding: '6px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Open Folder
          </button>
          {recentFolders.length > 0 && (
            <div style={{ marginTop: 8, width: '100%' }}>
              <div style={{ color: '#595653', fontSize: 10, fontWeight: 600, letterSpacing: 1, marginBottom: 6, paddingLeft: 4 }}>
                RECENT
              </div>
              {recentFolders.slice(0, 5).map((folder) => {
                const name = folder.split('/').pop() ?? folder
                return (
                  <div
                    key={folder}
                    className="hover-row"
                    onClick={() => openFolder(folder)}
                    style={{ padding: '4px 8px', cursor: 'pointer', fontSize: 12, display: 'flex', flexDirection: 'column', gap: 1 }}
                  >
                    <span style={{ color: '#9A9692' }}>{name}</span>
                    <span style={{ color: '#3a3a38', fontSize: 10 }}>{folder}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0E0E0D', color: '#9A9692' }}>
      {/* Breadcrumb bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px',
        borderBottom: '1px solid rgba(89,86,83,0.2)', flexShrink: 0, fontSize: 11,
      }}>
        <button
          onClick={handleNavigateUp}
          style={{ background: 'transparent', border: 'none', color: '#595653', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, padding: '0 4px' }}
          title="Go up"
        >
          ↑
        </button>
        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, color: '#74747C' }}>
          {browsePath.split('/').filter(Boolean).map((seg, i, arr) => {
            const segPath = '/' + arr.slice(0, i + 1).join('/')
            const isLast = i === arr.length - 1
            return (
              <span key={segPath}>
                <span
                  onClick={() => handleNavigateTo(segPath)}
                  style={{ cursor: 'pointer', color: isLast ? '#9A9692' : '#595653' }}
                >
                  {seg}
                </span>
                {!isLast && <span style={{ color: '#3a3a38', margin: '0 3px' }}>/</span>}
              </span>
            )
          })}
        </div>
        <button
          onClick={() => void handleOpenFolder()}
          style={{ background: 'transparent', border: 'none', color: '#595653', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, padding: '0 4px' }}
          title="Open different folder (⌘O)"
        >
          ⊞
        </button>
      </div>

      {/* File tree */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: 16, color: '#595653', fontSize: 12 }}>Loading...</div>
        ) : error ? (
          <div style={{ padding: 16, color: '#c45050', fontSize: 12 }}>{error}</div>
        ) : flatNodes.length === 0 ? (
          <div style={{ padding: 16, color: '#595653', fontSize: 12 }}>Empty directory</div>
        ) : (
          flatNodes.map((node) => (
            <div
              key={node.path}
              className="hover-row"
              onClick={() => void toggleExpand(node)}
              onDoubleClick={() => {
                if (node.isDirectory) handleNavigateTo(node.path)
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: `2px 8px 2px ${8 + node.depth * 16}px`,
                cursor: 'pointer', fontSize: 12, minHeight: 24,
                background: selectedPath === node.path ? 'rgba(84,140,90,0.1)' : 'transparent',
              }}
            >
              <span style={{ color: iconColor(node.name, node.isDirectory), width: 14, textAlign: 'center', flexShrink: 0, fontSize: node.isDirectory ? 10 : 12 }}>
                {node.isLoading ? '⟳' : fileIcon(node.name, node.isDirectory, node.isExpanded)}
              </span>
              <span style={{
                flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                color: node.isDirectory ? '#9A9692' : '#74747C',
                fontWeight: node.isDirectory ? 500 : 400,
              }}>
                {node.name}
              </span>
              {!node.isDirectory && (
                <span style={{ color: '#3a3a38', fontSize: 10, flexShrink: 0 }}>
                  {formatSize(node.size)}
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ── Tree helpers ──────────────────────────────────────────────────────

function flattenTree(nodes: TreeNode[]): TreeNode[] {
  const result: TreeNode[] = []
  for (const node of nodes) {
    result.push(node)
    if (node.isDirectory && node.isExpanded && node.children) {
      result.push(...flattenTree(node.children))
    }
  }
  return result
}

function updateNodeInTree(nodes: TreeNode[], targetPath: string, updates: Partial<TreeNode>): TreeNode[] {
  return nodes.map((node) => {
    if (node.path === targetPath) {
      return { ...node, ...updates }
    }
    if (node.children) {
      return { ...node, children: updateNodeInTree(node.children, targetPath, updates) }
    }
    return node
  })
}
