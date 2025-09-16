import React, { useState, useEffect } from 'react'
import axios from 'axios'
import Insights from './Insights'

type AppError = {
  title?: string
  message: string
  status?: number
  method?: string
  url?: string
  response?: any
}

export default function App() {
  const [file, setFile] = useState<File | null>(null)
  const [conversations, setConversations] = useState<any[]>([])
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [expertAnswer, setExpertAnswer] = useState('')
  const [error, setError] = useState<AppError | null>(null)
  const [filterText, setFilterText] = useState('')
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({})
  const [filterStatus, setFilterStatus] = useState<'All' | 'Open' | 'Closed'>('All')
  const [filterBot, setFilterBot] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploadInfo, setUploadInfo] = useState<string | null>(null)
  const infoRef = React.useRef<HTMLDivElement | null>(null)
  const [isFetching, setIsFetching] = useState(false)
  const [sortBy, setSortBy] = useState('sent_date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const [notification, setNotification] = useState<string | null>(null)
  const [view, setView] = useState<'admin' | 'insights'>('admin')

  const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

  // When a conversation row is selected, preload its expert_answer into the textarea
  useEffect(() => {
    if (selectedIndex === null) {
      setExpertAnswer('')
      return
    }
    const c = conversations.find(r => (r.index ?? r.id) === selectedIndex)
    setExpertAnswer(c?.expert_answer ?? '')
  }, [selectedIndex, conversations])

  // helper to render lean previews in the table
  const truncate = (v: any, n = 50) => {
    if (v === null || v === undefined) return ''
    const s = String(v)
    return s.length > n ? s.slice(0, n) + '…' : s
  }

  function buildError(err: any, ctx?: { action?: string }): AppError {
    if (!err) return { message: 'Unknown error', title: ctx?.action }
    if (err.response) {
      return {
        title: ctx?.action,
        message: err.message || 'HTTP error',
        status: err.response.status,
        method: err.config?.method?.toUpperCase(),
        url: err.config?.url,
        response: err.response.data,
      }
    }
    if (err.request) {
      return {
        title: ctx?.action,
        message: 'No response received (network error)',
        method: err.config?.method?.toUpperCase(),
        url: err.config?.url,
        response: err.toString(),
      }
    }
    return { title: ctx?.action, message: err.message ?? String(err), response: err }
  }

  async function upload() {
    if (!file) return
    const form = new FormData()
    form.append('file', file)
    try {
      setError(null)
      setIsUploading(true)
      setUploadProgress(null)
      const res = await axios.post(`${API_BASE}/upload`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total)
            setUploadProgress(pct)
          }
        }
      })
      setUploadInfo(`Loaded ${res.data.count} conversations`)
      await fetchConversations()
      setTimeout(() => { try { infoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }) } catch {} }, 100)
    } catch (err: any) {
      setError(buildError(err, { action: 'Upload file' }))
    } finally {
      setIsUploading(false)
      setUploadProgress(null)
    }
  }

  // drag and drop handlers
  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) {
      setFile(f)
    }
  }
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(true)
  }
  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
  }

  async function fetchConversations() {
    try {
      setError(null)
      setIsFetching(true)
      const res = await axios.get(`${API_BASE}/conversations`)
      setConversations(res.data.rows)
    } catch (err: any) {
      setError(buildError(err, { action: 'Fetch conversations' }))
    } finally {
      setIsFetching(false)
    }
  }

  async function submitAnswer() {
    if (selectedIndex === null) return
    try {
      setError(null)
      await axios.post(`${API_BASE}/answer`, { index: selectedIndex, expert_answer: expertAnswer })
      await fetchConversations()
      setNotification('Submitted')
      setTimeout(() => setNotification(null), 1000)
    } catch (err: any) {
      setError(buildError(err, { action: 'Submit answer' }))
    }
  }

  // Filter, sort, and paginate conversations for display
  const filteredConversations = conversations.filter((c) => {
    const textMatch = (c.user_message_en ?? '').toString().toLowerCase().includes(filterText.toLowerCase())
    const botMatch = filterBot ? ((c.bot ?? '').toString() === filterBot) : true
    const statusMatch = filterStatus === 'All' ? true : ((c.status ?? 'Open') === filterStatus)
    const columnMatch = Object.entries(columnFilters).every(([col, val]) => {
      if (!val) return true
      const cell = (c[col] ?? '').toString().toLowerCase()
      return cell.includes(val.toLowerCase())
    })
    return textMatch && botMatch && columnMatch && statusMatch
  })

  const sortedConversations = [...filteredConversations].sort((a, b) => {
    const modifier = sortDir === 'asc' ? 1 : -1
    const aVal = (a[sortBy] ?? '').toString()
    const bVal = (b[sortBy] ?? '').toString()
    return aVal.localeCompare(bVal) * modifier
  })

  const totalPages = Math.max(1, Math.ceil(sortedConversations.length / pageSize))
  const pageRows = sortedConversations.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 12 }}>
        <button className="btn" onClick={() => setView('admin')} style={{ marginRight: 8, background: view === 'admin' ? '#eef2ff' : undefined }}>Admin</button>
        <button className="btn" onClick={() => setView('insights')} style={{ background: view === 'insights' ? '#eef2ff' : undefined }}>Insights</button>
      </div>
      {view === 'insights' ? (
        <Insights />
      ) : (
        // Admin view
        <>
        {error && (
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', padding: 12, marginBottom: 12, borderRadius: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ color: '#991b1b' }}>Error{error.title ? ` — ${error.title}` : ''}:</strong>
                <div style={{ marginTop: 6, color: '#991b1b' }}>{error.message}</div>
                {error.status && <div style={{ marginTop: 6 }}><em>Status:</em> {error.status}</div>}
                {error.method && error.url && (
                  <div style={{ marginTop: 6 }}><em>Request:</em> {error.method} {error.url}</div>
                )}
              </div>
              <div>
                <button onClick={() => setError(null)}>Dismiss</button>
              </div>
            </div>
            {error.response && (
              <div style={{ marginTop: 12, background: '#fff', padding: 8, borderRadius: 6, overflow: 'auto' }}>
                <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{typeof error.response === 'string' ? error.response : JSON.stringify(error.response, null, 2)}</pre>
              </div>
            )}
          </div>
        )}

        <style>{`
          .btn { background: white; border: 1px solid #d1d5db; padding: 6px 10px; border-radius: 6px; cursor: pointer; transition: transform .12s ease, box-shadow .12s ease, background .12s ease; }
          .btn:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(59,130,246,0.12); background: #f8fafc }
          .btn:active { transform: translateY(0); box-shadow: none; }
          .small-spinner { width: 14px; height: 14px; border-radius: 7px; border: 3px solid #d1d5db; border-top-color: #2563eb; animation: spin 1s linear infinite; display:inline-block; vertical-align:middle}
          @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        `}</style>

        <h1>Farmer AI Chatbot - Admin</h1>

        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          style={{ padding: 12, border: dragOver ? '2px dashed #3b82f6' : '2px dashed #e5e7eb', borderRadius: 8, display: 'block', width: '100%', maxWidth: 1000 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="file" accept=".csv,.xlsx,.xls" onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFile(e.target.files?.[0] ?? null)} />
            <button className="btn" onClick={upload} disabled={!file || isUploading}>{isUploading ? 'Uploading...' : 'Upload'}</button>
          </div>
          <div style={{ marginTop: 8 }}>
            <small>Or drag & drop a CSV/XLSX file here to select it.</small>
          </div>
          {isUploading && (
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 18, height: 18, borderRadius: 9, border: '3px solid #d1d5db', borderTopColor: '#2563eb', animation: 'spin 1s linear infinite' }} />
              <div>{uploadProgress !== null ? `Uploading ${uploadProgress}%` : 'Uploading...'}</div>
            </div>
          )}
          <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
        </div>

        {/* upload info box */}
        {uploadInfo && (
          <div ref={infoRef} style={{ marginTop: 12, padding: 10, background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 6 }}>
            <strong>Info:</strong> {uploadInfo}
          </div>
        )}

        {/* Table controls */}
        <div style={{ display: 'flex', gap: 12, marginTop: 16, alignItems: 'center' }}>
          <div>
            <label>Filter (user message): </label>
            <input value={filterText} onChange={(e) => { setFilterText(e.target.value); setPage(1); }} placeholder="search user message" />
          </div>
          <div>
            <label>Filter (bot): </label>
            <input value={filterBot} onChange={(e) => { setFilterBot(e.target.value); setPage(1); }} placeholder="filter by bot" />
          </div>
          <div>
            <label>Status: </label>
            <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value as any); setPage(1); }}>
              <option value="All">All</option>
              <option value="Open">Open</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
          <div>
            <label>Page size: </label>
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
          </div>
          <div>
            <label>Sort by: </label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="sent_date">Sent Date</option>
              <option value="user_message_en">User Message</option>
              <option value="bot">Bot</option>
            </select>
            <button onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')}>{sortDir === 'asc' ? '↑' : '↓'}</button>
          </div>
        </div>

        {/* main content: table + details */}
        {/* transient notification (bottom-right) */}
        {notification && (
          <div style={{ position: 'fixed', right: 16, bottom: 16, background: '#16a34a', color: 'white', padding: '10px 14px', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', zIndex: 9999 }}>
            {notification}
          </div>
        )}
        <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
          <div style={{ flex: 1, minWidth: 400 }}>
            <div style={{ maxHeight: 'calc(100vh - 220px)', overflow: 'auto', border: '1px solid #e5e7eb', borderRadius: 6, background: 'white' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 2 }}>
                  <tr>
                    {[
                      { key: 'select', label: 'Select' },
                      { key: 'sent_date', label: 'Sent Date' },
                      { key: 'hashedid', label: 'HashID' },
                      { key: 'user_message_en', label: 'User Message' },
                      { key: 'assistant_message_en', label: 'Assistant Message' },
                      { key: 'bot', label: 'Bot' },
                      { key: 'subject', label: 'Subject' },
                      { key: 'crop', label: 'Crop' },
                      { key: 'feedback_neg', label: 'Feedback Neg' },
                      { key: 'language', label: 'Language' },
                      { key: 'expert_answer', label: 'Expert Answer' },
                      { key: 'status', label: 'Status' },
                    ].map((col) => (
                      <th
                        key={col.key}
                        style={{ padding: 12, textAlign: 'left', cursor: col.key !== 'select' ? 'pointer' : 'default', minWidth: col.key === 'user_message_en' || col.key === 'assistant_message_en' ? 400 : 120 }}
                        onClick={() => {
                          if (col.key === 'select') return
                          if (sortBy === col.key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
                          else { setSortBy(col.key); setSortDir('asc') }
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span>{col.label}</span>
                          {col.key !== 'select' && (
                            <span style={{ fontSize: 12, color: sortBy === col.key ? '#111827' : '#9ca3af' }}>{sortBy === col.key ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}</span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                  <tr>
                    <th />
                    {['sent_date','hashedid','user_message_en','assistant_message_en','bot','subject','crop','feedback_neg','language','expert_answer','status'].map((col) => (
                      <th key={`filter-${col}`} style={{ padding: 6 }}>
                        <input
                          value={columnFilters[col] ?? ''}
                          onChange={(e) => setColumnFilters(prev => ({ ...prev, [col]: e.target.value }))}
                          placeholder={`Filter ${col}`}
                          style={{ width: '100%', fontSize: 12 }}
                        />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((c) => {
                    const rowId = c.index ?? c.id
                    return (
                      <tr
                        key={rowId}
                        style={{ borderBottom: '1px solid #eee', background: selectedIndex === rowId ? '#eef2ff' : undefined, cursor: 'pointer' }}
                        onClick={() => setSelectedIndex(rowId)}
                      >
                        <td style={{ padding: 12 }} onClick={(e) => e.stopPropagation()}>
                          <input
                            type="radio"
                            name="selected"
                            value={rowId}
                            checked={selectedIndex === rowId}
                            onChange={(e) => setSelectedIndex(Number((e.target as HTMLInputElement).value))}
                          />
                        </td>
                        <td style={{ padding: 12 }}>{c.sent_date}</td>
                        <td style={{ padding: 12 }}>{String(c.hashedid ?? '')}</td>
                        <td style={{ padding: 12, maxWidth: 400, whiteSpace: 'normal' }} title={c.user_message_en}>{truncate(c.user_message_en, 50)}</td>
                        <td style={{ padding: 12, maxWidth: 400, whiteSpace: 'normal' }} title={c.assistant_message_en}>{truncate(c.assistant_message_en, 50)}</td>
                        <td style={{ padding: 12 }}>{c.bot}</td>
                        <td style={{ padding: 12 }}>{c.subject}</td>
                        <td style={{ padding: 12 }}>{c.crop}</td>
                        <td style={{ padding: 12 }}>{String(c.feedback_neg ?? '')}</td>
                        <td style={{ padding: 12 }}>{String(c.language ?? '')}</td>
                        <td style={{ padding: 12, maxWidth: 400, whiteSpace: 'normal' }} title={c.expert_answer}>{truncate(c.expert_answer, 50)}</td>
                        <td style={{ padding: 12 }}>{c.status ?? 'Open'}</td>
                      </tr>
                    )
                  })}
                  {pageRows.length === 0 && (
                    <tr>
                      <td colSpan={12} style={{ padding: 20, textAlign: 'center', color: '#6b7280' }}>{isFetching ? 'Loading...' : 'No conversations'}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* pagination */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              <div>
                <button className="btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>Prev</button>
                <span style={{ margin: '0 8px' }}>Page {page} / {totalPages}</span>
                <button className="btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</button>
              </div>
              <div>
                <small>{sortedConversations.length} items</small>
              </div>
            </div>
          </div>

          {/* Conversation details / expert answer panel */}
          <div style={{ width: 420, minWidth: 320 }}>
            <div style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 6, background: '#fff' }}>
              <h3>Conversation Info</h3>
              {selectedIndex === null ? (
                <div style={{ color: '#6b7280' }}>Select a conversation to view details and provide an expert answer.</div>
              ) : (
                (() => {
                  const convo = conversations.find(r => (r.index ?? r.id) === selectedIndex)
                  if (!convo) return <div style={{ color: '#6b7280' }}>Selected conversation not found.</div>
                  return (
                    <div>
                      <div style={{ marginBottom: 8 }}><strong>HashID:</strong> {convo.hashedid}</div>
                      <div style={{ marginBottom: 8 }}><strong>Sent:</strong> {convo.sent_date}</div>
                      <div style={{ marginBottom: 8 }}><strong>Bot:</strong> {convo.bot}</div>
                      <div style={{ marginBottom: 8 }}><strong>Subject / Crop:</strong> {convo.subject} / {convo.crop}</div>
                      <div style={{ marginBottom: 8 }}><strong>Feedback Neg:</strong> {String(convo.feedback_neg ?? '')}</div>
                      <div style={{ marginTop: 8 }}>
                        <strong>User Message</strong>
                        <div style={{ whiteSpace: 'pre-wrap', marginTop: 6, padding: 8, background: '#f8fafc', borderRadius: 6 }}>{convo.user_message_en}</div>
                      </div>
                      <div style={{ marginTop: 8 }}>
                        <strong>Assistant Message</strong>
                        <div style={{ whiteSpace: 'pre-wrap', marginTop: 6, padding: 8, background: '#f8fafc', borderRadius: 6 }}>{convo.assistant_message_en}</div>
                      </div>
                      <div style={{ marginTop: 12 }}>
                        <label><strong>Expert Answer</strong></label>
                        <textarea value={expertAnswer} onChange={(e) => setExpertAnswer(e.target.value)} rows={6} style={{ width: '100%', marginTop: 6 }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                          <div>
                            <button className="btn" onClick={submitAnswer} disabled={!expertAnswer || isFetching}>Submit</button>
                          </div>
                          <div style={{ color: '#6b7280' }}><em>Status:</em> {convo.status ?? 'Open'}</div>
                        </div>
                      </div>
                    </div>
                  )
                })()
              )}
            </div>
          </div>
        </div>
        </>
      )}
    </div>
  )
}
