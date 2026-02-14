import { useCallback, useEffect, useRef, useState } from 'react'

interface Props {
  onSend: (message: string, files?: File[], mentions?: string[]) => void | Promise<void>
  isRunning: boolean
  onStop: () => void
  workingDirectory: string | null
}

interface MentionContext {
  query: string
  start: number
  end: number
}

interface MentionSuggestion {
  path: string
  relPath: string
  name: string
}

const MENTION_PATTERN = /(?:^|\s)@{([^}\n]+)}|(?:^|\s)@([^\s@]+)/g

function normalizeMentionPath(value: string): string {
  return value
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\.\/+/, '')
    .replace(/^\/+/, '')
}

function deriveRelativePath(rootDir: string, absolutePath: string): string {
  const normalizedRoot = rootDir.replace(/\\/g, '/').replace(/\/+$/, '')
  const normalizedPath = absolutePath.replace(/\\/g, '/')
  if (normalizedPath === normalizedRoot) return ''
  if (normalizedPath.startsWith(`${normalizedRoot}/`)) {
    return normalizedPath.slice(normalizedRoot.length + 1)
  }
  return normalizedPath
}

function extractMentions(input: string): string[] {
  const values: string[] = []
  const seen = new Set<string>()
  for (const match of input.matchAll(MENTION_PATTERN)) {
    const raw = match[1] ?? match[2] ?? ''
    const normalized = normalizeMentionPath(raw)
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    values.push(normalized)
  }
  return values
}

function getActiveMentionContext(value: string, caret: number | null): MentionContext | null {
  if (caret === null || caret < 0) return null
  const cursor = Math.min(caret, value.length)
  const beforeCursor = value.slice(0, cursor)

  let tokenStart = cursor - 1
  while (tokenStart >= 0 && !/\s/.test(beforeCursor[tokenStart])) {
    tokenStart--
  }
  tokenStart += 1
  if (tokenStart < 0 || tokenStart >= cursor) return null

  const token = beforeCursor.slice(tokenStart, cursor)
  if (!token.startsWith('@')) return null
  if (token.startsWith('@{')) {
    if (token.includes('}')) return null
    return {
      query: normalizeMentionPath(token.slice(2)),
      start: tokenStart,
      end: cursor,
    }
  }

  return {
    query: normalizeMentionPath(token.slice(1)),
    start: tokenStart,
    end: cursor,
  }
}

export function ChatInput({ onSend, isRunning, onStop, workingDirectory }: Props) {
  const [input, setInput] = useState('')
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const [mentionContext, setMentionContext] = useState<MentionContext | null>(null)
  const [mentionSuggestions, setMentionSuggestions] = useState<MentionSuggestion[]>([])
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0)
  const [mentionLoading, setMentionLoading] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mentionRequestRef = useRef(0)

  const updateMentionContextFromCursor = useCallback((value: string, caret: number | null) => {
    if (isRunning || !workingDirectory) {
      setMentionContext(null)
      return
    }
    setMentionContext(getActiveMentionContext(value, caret))
  }, [isRunning, workingDirectory])

  useEffect(() => {
    if (!workingDirectory || !mentionContext?.query) {
      setMentionSuggestions([])
      setMentionLoading(false)
      setSelectedMentionIndex(0)
      return
    }

    let cancelled = false
    const requestId = ++mentionRequestRef.current
    setMentionLoading(true)

    void window.electronAPI.fs.search(workingDirectory, mentionContext.query, 10)
      .then((results) => {
        if (cancelled || requestId !== mentionRequestRef.current) return

        const deduped = new Set<string>()
        const suggestions: MentionSuggestion[] = []
        for (const hit of results) {
          if (hit.isDirectory) continue
          const relPath = deriveRelativePath(workingDirectory, hit.path)
          const normalizedRelPath = normalizeMentionPath(relPath)
          if (!normalizedRelPath || deduped.has(normalizedRelPath)) continue
          deduped.add(normalizedRelPath)
          suggestions.push({
            path: hit.path,
            relPath: normalizedRelPath,
            name: hit.name,
          })
        }

        setMentionSuggestions(suggestions)
        setSelectedMentionIndex(0)
      })
      .catch((err) => {
        if (cancelled || requestId !== mentionRequestRef.current) return
        console.error('[ChatInput] mention search failed:', err)
        setMentionSuggestions([])
      })
      .finally(() => {
        if (cancelled || requestId !== mentionRequestRef.current) return
        setMentionLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [mentionContext?.query, workingDirectory])

  const insertMention = useCallback((suggestion: MentionSuggestion) => {
    if (!mentionContext) return

    const token = suggestion.relPath.includes(' ')
      ? `@{${suggestion.relPath}}`
      : `@${suggestion.relPath}`

    const before = input.slice(0, mentionContext.start)
    const after = input.slice(mentionContext.end)
    const needsTrailingSpace = after.length > 0 && !/^\s/.test(after)
    const nextValue = `${before}${token}${needsTrailingSpace ? ' ' : ''}${after}`
    const nextCursor = mentionContext.start + token.length + (needsTrailingSpace ? 1 : 0)

    setInput(nextValue)
    setMentionContext(null)
    setMentionSuggestions([])
    setSelectedMentionIndex(0)
    setMentionLoading(false)

    requestAnimationFrame(() => {
      const textarea = textareaRef.current
      if (!textarea) return
      textarea.focus()
      textarea.setSelectionRange(nextCursor, nextCursor)
    })
  }, [input, mentionContext])

  const handleSend = useCallback(() => {
    const trimmed = input.trim()
    if (!trimmed && attachedFiles.length === 0) return

    const mentions = extractMentions(input)
    void onSend(
      trimmed,
      attachedFiles.length > 0 ? attachedFiles : undefined,
      mentions.length > 0 ? mentions : undefined
    )
    setInput('')
    setAttachedFiles([])
    setMentionContext(null)
    setMentionSuggestions([])
    setSelectedMentionIndex(0)
    setMentionLoading(false)

    // Re-focus the textarea
    setTimeout(() => textareaRef.current?.focus(), 0)
  }, [input, attachedFiles, onSend])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!isRunning && mentionContext) {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          if (mentionSuggestions.length > 0) {
            setSelectedMentionIndex((prev) => (prev + 1) % mentionSuggestions.length)
          }
          return
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          if (mentionSuggestions.length > 0) {
            setSelectedMentionIndex((prev) => (prev - 1 + mentionSuggestions.length) % mentionSuggestions.length)
          }
          return
        }
        if ((e.key === 'Enter' || e.key === 'Tab') && mentionSuggestions.length > 0) {
          e.preventDefault()
          const selected = mentionSuggestions[selectedMentionIndex] ?? mentionSuggestions[0]
          if (selected) insertMention(selected)
          return
        }
        if (e.key === 'Escape') {
          e.preventDefault()
          setMentionContext(null)
          setMentionSuggestions([])
          setSelectedMentionIndex(0)
          setMentionLoading(false)
          return
        }
      }

      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        if (!isRunning) {
          handleSend()
        }
      }
    },
    [handleSend, insertMention, isRunning, mentionContext, mentionSuggestions, selectedMentionIndex]
  )

  const handleFileSelect = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    setAttachedFiles((prev) => [...prev, ...files])
    e.target.value = ''
  }, [])

  const removeFile = useCallback((index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (isRunning) return

    const imageFiles: File[] = []
    const items = Array.from(e.clipboardData.items)
    for (const item of items) {
      if (item.kind !== 'file' || !item.type.startsWith('image/')) continue
      const rawFile = item.getAsFile()
      if (!rawFile) continue
      const extension = rawFile.type.split('/')[1] ?? 'png'
      const fallbackName = `pasted-image-${Date.now()}-${imageFiles.length + 1}.${extension}`
      const normalizedName = rawFile.name && rawFile.name.trim() ? rawFile.name : fallbackName
      imageFiles.push(new File([rawFile], normalizedName, {
        type: rawFile.type || 'image/png',
        lastModified: Date.now(),
      }))
    }

    if (imageFiles.length === 0) return
    e.preventDefault()
    setAttachedFiles((prev) => [...prev, ...imageFiles])
  }, [isRunning])

  const hasContent = input.trim().length > 0 || attachedFiles.length > 0
  const showMentionMenu = Boolean(
    mentionContext
      && workingDirectory
      && (mentionLoading || mentionSuggestions.length > 0 || mentionContext.query.length > 0)
  )

  return (
    <div
      className="glass-panel"
      style={{
        borderTop: 'none',
        borderBottom: 'none',
        borderLeft: 'none',
        borderRight: 'none',
        padding: '10px 16px',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Attached files */}
      {attachedFiles.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8, paddingLeft: 18 }}>
          {attachedFiles.map((file, i) => (
            <div
              key={`${file.name}-${i}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'rgba(89, 86, 83, 0.15)',
                borderRadius: 3,
                padding: '2px 8px',
                fontSize: 12,
                color: '#9A9692',
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>
                {file.name}
              </span>
              <button
                onClick={() => removeFile(i)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#595653',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontFamily: 'inherit',
                  padding: 0,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flex: 1 }}>
        {/* File attach / play icon */}
        {isRunning ? (
          <button
            onClick={onStop}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#c45050',
              cursor: 'pointer',
              fontSize: 12,
              fontFamily: 'inherit',
              paddingTop: 4,
              padding: '4px 2px 0 0',
            }}
            title="Stop (kill session)"
          >
            &#9632;
          </button>
        ) : (
          <button
            onClick={handleFileSelect}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#595653',
              cursor: 'pointer',
              fontSize: 10,
              fontFamily: 'inherit',
              paddingTop: 4,
              padding: '4px 2px 0 0',
            }}
            title="Attach file"
          >
            ⛶
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        {/* Text input */}
        <div style={{ flex: 1, position: 'relative' }}>
          <textarea
            ref={textareaRef}
            data-chat-input
            value={input}
            onChange={(e) => {
              const nextValue = e.target.value
              setInput(nextValue)
              updateMentionContextFromCursor(nextValue, e.target.selectionStart)
            }}
            onSelect={(e) => {
              updateMentionContextFromCursor(e.currentTarget.value, e.currentTarget.selectionStart)
            }}
            onPaste={handlePaste}
            onKeyDown={handleKeyDown}
            placeholder={isRunning ? 'Claude is working...' : 'Message ...'}
            disabled={isRunning}
            style={{
              flex: 1,
              width: '100%',
              background: 'transparent',
              border: 'none',
              color: '#9A9692',
              fontSize: 'inherit',
              fontFamily: 'inherit',
              outline: 'none',
              resize: 'none',
              lineHeight: 1.5,
              minHeight: 24,
              maxHeight: 120,
              opacity: isRunning ? 0.4 : 1,
            }}
            rows={1}
            onInput={(e) => {
              const target = e.currentTarget
              target.style.height = 'auto'
              target.style.height = `${Math.min(target.scrollHeight, 120)}px`
            }}
          />

          {showMentionMenu && (
            <div
              className="glass-panel"
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 'calc(100% + 8px)',
                borderRadius: 8,
                overflow: 'hidden',
                boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                zIndex: 40,
              }}
            >
              {mentionLoading && (
                <div style={{ padding: '6px 10px', fontSize: 11, color: '#74747C' }}>
                  searching files...
                </div>
              )}
              {!mentionLoading && mentionSuggestions.length === 0 && (
                <div style={{ padding: '6px 10px', fontSize: 11, color: '#595653' }}>
                  No matches for @{mentionContext?.query}
                </div>
              )}
              {!mentionLoading && mentionSuggestions.map((suggestion, index) => (
                <button
                  key={suggestion.path}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    insertMention(suggestion)
                  }}
                  className="hover-row"
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '6px 10px',
                    border: 'none',
                    background: index === selectedMentionIndex ? 'rgba(84,140,90,0.12)' : 'transparent',
                    color: '#9A9692',
                    fontFamily: 'inherit',
                    fontSize: 11,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                  title={suggestion.relPath}
                >
                  <span style={{ color: '#548C5A', fontWeight: 700, width: 12, textAlign: 'center' }}>@</span>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {suggestion.relPath}
                  </span>
                  <span style={{ color: '#595653', fontSize: 10 }}>{suggestion.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Send button */}
        <button
          onClick={isRunning ? onStop : handleSend}
          disabled={!isRunning && !hasContent}
          style={{
            background: 'transparent',
            border: 'none',
            color: isRunning ? '#c45050' : hasContent ? '#548C5A' : '#74747C',
            cursor: hasContent || isRunning ? 'pointer' : 'default',
            fontSize: 16,
            fontFamily: 'inherit',
            transition: 'color 0.2s ease, text-shadow 0.2s ease',
            textShadow: hasContent ? '0 0 8px rgba(84, 140, 90, 0.4)' : 'none',
            paddingBottom: 4,
            opacity: !isRunning && !hasContent ? 0.4 : 1,
          }}
          title={isRunning ? 'Stop' : 'Send (Enter)'}
        >
          {isRunning ? '■' : '▶'}
        </button>
      </div>

      <div style={{ color: '#595653', fontSize: 10, marginTop: 6, textAlign: 'center', opacity: 0.4 }}>
        Enter send &middot; Shift+Enter newline &middot; Paste images &middot; @file to reference
      </div>
    </div>
  )
}
