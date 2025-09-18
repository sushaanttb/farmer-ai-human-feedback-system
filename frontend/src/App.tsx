import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { ChevronUp, ChevronDown, Upload, Search, Filter, BarChart3, Settings, Leaf, TrendingUp, Users, MessageSquare, X, Check, AlertCircle, Upload as UploadIcon, FileText, Eye, ChevronLeft, ChevronRight } from 'lucide-react'
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
  const [isFetching, setIsFetching] = useState(false)
  const [sortBy, setSortBy] = useState('sent_date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [notification, setNotification] = useState<string | null>(null)
  const [view, setView] = useState<'admin' | 'insights'>('admin')
  // track expanded/collapsed state for grouped hashedid entries
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})

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

  function toggleGroup(h: string) {
    setExpandedGroups(prev => ({ ...prev, [h]: !prev[h] }))
  }

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
      // setUploadInfo(`Loaded ${res.data.count} conversations`)
      await fetchConversations()
      setNotification(`Upload Successful Loaded ${res.data.count} conversations`)
      setTimeout(() => setNotification(null), 3000)
      // setTimeout(() => { try { infoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }) } catch {} }, 100)
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

  // Build grouped display list: for hashedid values that appear more than once, create a group entry.
  // Single conversations remain as individual entries so their UI/UX is unchanged.
  type DisplayEntry = { type: 'group', hashedid: string, items: any[] } | { type: 'row', item: any }
  const groupedDisplayList: DisplayEntry[] = (() => {
    const byHash: Record<string, any[]> = {}
    const singles: any[] = []
    for (const r of sortedConversations) {
      const h = String(r.hashedid ?? '')
      if (h) {
        byHash[h] = byHash[h] ?? []
        byHash[h].push(r)
      } else {
        singles.push(r)
      }
    }
    const out: DisplayEntry[] = []
    // add grouped hashedid entries (only when there are multiple items), otherwise push as single rows
    const processedHashes = new Set<string>()
    for (const r of sortedConversations) {
      const h = String(r.hashedid ?? '')
      if (!h) {
        out.push({ type: 'row', item: r })
        continue
      }
      if (processedHashes.has(h)) continue
      const groupItems = byHash[h] ?? []
      if (groupItems.length > 1) {
        out.push({ type: 'group', hashedid: h, items: groupItems })
      } else if (groupItems.length === 1) {
        out.push({ type: 'row', item: groupItems[0] })
      }
      processedHashes.add(h)
    }
    return out
  })()

  const totalPages = Math.max(1, Math.ceil(groupedDisplayList.length / pageSize))
  const pageRows = groupedDisplayList.slice((page - 1) * pageSize, page * pageSize)

  // const totalPages = Math.max(1, Math.ceil(sortedConversations.length / pageSize))
  // const pageRows = sortedConversations.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-full mx-auto px-2 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo and title */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-agriculture-500 rounded-lg">
                <Leaf className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Farmer AI</h1>
                <p className="text-sm text-gray-500">Human Feedback System</p>
              </div>
            </div>
            
            {/* Navigation tabs */}
            <nav className="flex space-x-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setView('admin')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  view === 'admin' 
                    ? 'bg-white text-primary-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Settings className="h-4 w-4" />
                <span>Admin</span>
              </button>
              <button
                onClick={() => setView('insights')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  view === 'insights' 
                    ? 'bg-white text-primary-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <BarChart3 className="h-4 w-4" />
                <span>Insights</span>
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-full mx-auto px-2 sm:px-4 lg:px-6 py-6">{view === 'insights' ? (
        <Insights />
      ) : (
        // Admin view
        <div className="space-y-4">
        {error && (
          <div className="error-alert">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-error-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-error-800">
                    {error.title ? `${error.title}` : 'Error'}
                  </h3>
                  <button
                    onClick={() => setError(null)}
                    className="text-error-400 hover:text-error-600 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-1 text-sm text-error-700">{error.message}</p>
                {error.status && (
                  <p className="mt-1 text-xs text-error-600">Status: {error.status}</p>
                )}
                {error.method && error.url && (
                  <p className="mt-1 text-xs text-error-600">Request: {error.method} {error.url}</p>
                )}
              </div>
            </div>
            {error.response && (
              <div className="mt-3 bg-white rounded-md p-3 border border-error-200">
                <pre className="text-xs text-gray-800 whitespace-pre-wrap overflow-auto max-h-32">
                  {typeof error.response === 'string' ? error.response : JSON.stringify(error.response, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Upload Section */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <UploadIcon className="h-5 w-5 text-primary-600" />
              <span>Upload Conversations</span>
            </h2>
            <p className="text-sm text-gray-600 mt-1">Upload CSV or XLSX files to analyze farmer conversations</p>
          </div>
          <div className="card-body">
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`upload-zone ${dragOver ? 'dragover' : ''}`}
            >
              <div className="flex flex-col items-center space-y-4">
                <div className="flex items-center space-x-4">
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFile(e.target.files?.[0] ?? null)}
                    className="input-field max-w-xs"
                  />
                  <button
                    className="btn btn-primary"
                    onClick={upload}
                    disabled={!file || isUploading}
                  >
                    {isUploading ? (
                      <div className="flex items-center space-x-2">
                        <div className="loading-spinner"></div>
                        <span>Uploading...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Upload className="h-4 w-4" />
                        <span>Upload</span>
                      </div>
                    )}
                  </button>
                </div>
                <p className="text-sm text-gray-500">Or drag & drop your file here</p>
                {isUploading && uploadProgress !== null && (
                  <div className="w-full max-w-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-600">Progress</span>
                      <span className="text-sm text-gray-600">{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <Filter className="h-5 w-5 text-primary-600" />
              <span>Filters & Controls</span>
            </h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search Messages</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    value={filterText}
                    onChange={(e) => { setFilterText(e.target.value); setPage(1); }}
                    placeholder="Search user messages..."
                    className="input-field pl-10"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bot Filter</label>
                <input
                  value={filterBot}
                  onChange={(e) => { setFilterBot(e.target.value); setPage(1); }}
                  placeholder="Filter by bot..."
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => { setFilterStatus(e.target.value as any); setPage(1); }}
                  className="input-field"
                >
                  <option value="All">All Statuses</option>
                  <option value="Open">Open</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Page Size</label>
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                  className="input-field"
                >
                  <option value={10}>10 per page</option>
                  <option value={20}>20 per page</option>
                  <option value={50}>50 per page</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                <div className="flex space-x-2">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="input-field flex-1"
                  >
                    <option value="sent_date">Sent Date</option>
                    <option value="user_message_en">User Message</option>
                    <option value="bot">Bot</option>
                  </select>
                  <button
                    onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')}
                    className="btn btn-sm px-3"
                    title={`Sort ${sortDir === 'asc' ? 'Descending' : 'Ascending'}`}
                  >
                    {sortDir === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Conversations Table */}
          <div className="xl:col-span-2">
            <div className="card">
              <div className="card-header">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                    <MessageSquare className="h-5 w-5 text-primary-600" />
                    <span>Conversations</span>
                  </h3>
                </div>
              </div>
              <div className="overflow-hidden">
                <div className="max-h-[700px] overflow-auto">
                  <table className="w-full">
                    <thead className="table-header">
                      <tr>
                        {[
                          { key: 'select', label: 'Select', icon: null },
                          { key: 'hashedid', label: 'Hash ID', icon: null },
                          { key: 'sent_date', label: 'Date', icon: null },
                          { key: 'user_message_en', label: 'User Message', icon: MessageSquare },
                          { key: 'assistant_message_en', label: 'Assistant Message', icon: MessageSquare },
                          { key: 'bot', label: 'Bot', icon: null },
                          { key: 'subject', label: 'Subject', icon: null },
                          { key: 'crop', label: 'Crop', icon: Leaf },
                          { key: 'expert_answer', label: 'Expert Answer', icon: null },
                          { key: 'status', label: 'Status', icon: null },
                        ].map((col) => (
                          <th
                            key={col.key}
                            className={`table-cell font-semibold text-gray-900 ${col.key !== 'select' ? 'cursor-pointer hover:bg-gray-100' : ''} ${col.key === 'user_message_en' || col.key === 'assistant_message_en' ? 'min-w-[300px]' : 'min-w-[120px]'}`}
                            onClick={() => {
                              if (col.key === 'select') return
                              if (sortBy === col.key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
                              else { setSortBy(col.key); setSortDir('asc') }
                            }}
                          >
                            <div className="flex items-center space-x-2">
                              {col.icon && <col.icon className="h-4 w-4 text-gray-500" />}
                              <span>{col.label}</span>
                              {col.key !== 'select' && (
                                <span className={`text-xs ${sortBy === col.key ? 'text-primary-600' : 'text-gray-400'}`}>
                                  {sortBy === col.key ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
                                </span>
                              )}
                            </div>
                          </th>
                        ))}
                      </tr>
                      <tr>
                        <th className="table-cell"></th>
                        {['hashedid','sent_date','user_message_en','assistant_message_en','bot','subject','crop','expert_answer','status'].map((col) => (
                          <th key={`filter-${col}`} className="table-cell p-2">
                            <input
                              value={columnFilters[col] ?? ''}
                              onChange={(e) => setColumnFilters(prev => ({ ...prev, [col]: e.target.value }))}
                              placeholder={`Filter...`}
                              className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                            />
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.map((entry) => {
                        if (entry.type === 'row') {
                          const c = entry.item
                          const rowId = c.index ?? c.id
                          return (
                            <tr
                              key={`row-${rowId}`}
                              className={`table-row cursor-pointer ${selectedIndex === rowId ? 'bg-primary-50 border-primary-200' : ''}`}
                              onClick={() => setSelectedIndex(rowId)}
                            >
                              <td className="table-cell" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="radio"
                                  name="selected"
                                  value={rowId}
                                  checked={selectedIndex === rowId}
                                  onChange={(e) => setSelectedIndex(Number((e.target as HTMLInputElement).value))}
                                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                                />
                              </td>
                              <td className="table-cell font-mono text-sm">{String(c.hashedid ?? '').slice(0, 12)}</td>
                              <td className="table-cell text-sm">{c.sent_date}</td>
                              <td className="table-cell max-w-[300px]">
                                <div className="truncate" title={c.user_message_en}>
                                  {truncate(c.user_message_en, 80)}
                                </div>
                              </td>
                              <td className="table-cell max-w-[300px]">
                                <div className="truncate" title={c.assistant_message_en}>
                                  {truncate(c.assistant_message_en, 80)}
                                </div>
                              </td>
                              <td className="table-cell">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {c.bot}
                                </span>
                              </td>
                              <td className="table-cell">{c.subject}</td>
                              <td className="table-cell">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-agriculture-100 text-agriculture-800">
                                  {c.crop}
                                </span>
                              </td>
                              <td className="table-cell max-w-[300px]">
                                <div className="truncate" title={c.expert_answer}>
                                  {truncate(c.expert_answer, 50)}
                                </div>
                              </td>
                              <td className="table-cell">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  (c.status ?? 'Open') === 'Open' 
                                    ? 'bg-warning-100 text-warning-800' 
                                    : 'bg-success-100 text-success-800'
                                }`}>
                                  {c.status ?? 'Open'}
                                </span>
                              </td>
                            </tr>
                          )
                        }

                        // group entry
                        const group = entry
                        const first = group.items[0]
                        const groupKey = `group-${group.hashedid}`
                        const isExpanded = !!expandedGroups[group.hashedid]
                        return (
                          <React.Fragment key={groupKey}>
                            <tr
                              className="table-row bg-gray-50 cursor-pointer"
                              onClick={(e) => { e.stopPropagation(); toggleGroup(group.hashedid) }}
                            >
                              <td className="table-cell">
                                <button className="btn btn-sm p-1">
                                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                </button>
                              </td>
                              <td className="table-cell">
                                <div className="flex items-center space-x-2">
                                  <span className="font-mono text-sm font-semibold">{group.hashedid.slice(0, 12)}</span>
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-700">
                                    {group.items.length} conversations
                                  </span>
                                </div>
                              </td>
                              <td className="table-cell text-sm text-gray-600">{first.sent_date}</td>
                              <td className="table-cell max-w-[300px]">
                                <div className="truncate text-gray-600 text-sm" title={first.user_message_en}>
                                  {truncate(first.user_message_en, 120)}
                                </div>
                              </td>
                              <td className="table-cell" colSpan={8}></td>
                            </tr>
                            {isExpanded && group.items.map((c: any) => {
                              const rowId = c.index ?? c.id
                              return (
                                <tr
                                  key={`row-${rowId}`}
                                  className={`table-row cursor-pointer ${selectedIndex === rowId ? 'bg-primary-50 border-primary-200' : ''}`}
                                  onClick={() => setSelectedIndex(rowId)}
                                >
                                  <td className="table-cell pl-8" onClick={(e) => e.stopPropagation()}>
                                    <input
                                      type="radio"
                                      name="selected"
                                      value={rowId}
                                      checked={selectedIndex === rowId}
                                      onChange={(e) => setSelectedIndex(Number((e.target as HTMLInputElement).value))}
                                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                                    />
                                  </td>
                                  <td className="table-cell font-mono text-sm">{String(c.hashedid ?? '').slice(0, 12)}</td>
                                  <td className="table-cell text-sm">{c.sent_date}</td>
                                  <td className="table-cell max-w-[300px]">
                                    <div className="truncate" title={c.user_message_en}>
                                      {truncate(c.user_message_en, 80)}
                                    </div>
                                  </td>
                                  <td className="table-cell max-w-[300px]">
                                    <div className="truncate" title={c.assistant_message_en}>
                                      {truncate(c.assistant_message_en, 80)}
                                    </div>
                                  </td>
                                  <td className="table-cell">
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                      {c.bot}
                                    </span>
                                  </td>
                                  <td className="table-cell">{c.subject}</td>
                                  <td className="table-cell">
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-agriculture-100 text-agriculture-800">
                                      {c.crop}
                                    </span>
                                  </td>
                                  <td className="table-cell max-w-[300px]">
                                    <div className="truncate" title={c.expert_answer}>
                                      {truncate(c.expert_answer, 50)}
                                    </div>
                                  </td>
                                  <td className="table-cell">
                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                      (c.status ?? 'Open') === 'Open' 
                                        ? 'bg-warning-100 text-warning-800' 
                                        : 'bg-success-100 text-success-800'
                                    }`}>
                                      {c.status ?? 'Open'}
                                    </span>
                                  </td>
                                </tr>
                              )
                            })}
                          </React.Fragment>
                        )
                      })}
                      {pageRows.length === 0 && (
                        <tr>
                          <td colSpan={12} className="table-cell text-center py-8 text-gray-500">
                            {isFetching ? (
                              <div className="flex items-center justify-center space-x-2">
                                <div className="loading-spinner"></div>
                                <span>Loading conversations...</span>
                              </div>
                            ) : (
                              'No conversations found'
                            )}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="btn btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </button>
                  <span className="text-sm text-gray-700">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="btn btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </button>
                </div>
                <div className="text-sm text-gray-500">
                  {sortedConversations.length} conversations total
                </div>
              </div>
            </div>
          </div>

          {/* Conversation Details Sidebar */}
          <div className="xl:col-span-1">
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                  <Eye className="h-5 w-5 text-primary-600" />
                  <span>Conversation Details</span>
                </h3>
              </div>
              <div className="card-body">
                {selectedIndex === null ? (
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">Select a conversation to view details and provide an expert answer.</p>
                  </div>
                ) : (
                  (() => {
                    const convo = conversations.find(r => (r.index ?? r.id) === selectedIndex)
                    if (!convo) {
                      return (
                        <div className="text-center py-8">
                          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
                          <p className="text-red-500">Selected conversation not found.</p>
                        </div>
                      )
                    }
                    return (
                      <div className="space-y-4">
                        {/* Conversation Metadata */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <label className="font-medium text-gray-700">Hash ID</label>
                            <p className="text-gray-900 font-mono text-sm">{convo.hashedid}</p>
                          </div>
                          <div>
                            <label className="font-medium text-gray-700">Date</label>
                            <p className="text-gray-900">{convo.sent_date}</p>
                          </div>
                          <div>
                            <label className="font-medium text-gray-700">Bot</label>
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {convo.bot}
                            </span>
                          </div>
                          <div>
                            <label className="font-medium text-gray-700">Status</label>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              (convo.status ?? 'Open') === 'Open' 
                                ? 'bg-warning-100 text-warning-800' 
                                : 'bg-success-100 text-success-800'
                            }`}>
                              {convo.status ?? 'Open'}
                            </span>
                          </div>
                          <div>
                            <label className="font-medium text-gray-700">Subject</label>
                            <p className="text-gray-900">{convo.subject}</p>
                          </div>
                          <div>
                            <label className="font-medium text-gray-700">Crop</label>
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-agriculture-100 text-agriculture-800">
                              <Leaf className="h-3 w-3 mr-1" />
                              {convo.crop}
                            </span>
                          </div>
                        </div>

                        {/* Messages */}
                        <div className="space-y-3">
                          <div>
                            <label className="block font-medium text-gray-700 mb-2">User Message</label>
                            <div className="bg-gray-50 rounded-lg p-3 text-sm whitespace-pre-wrap border">
                              {convo.user_message_en}
                            </div>
                          </div>
                          <div>
                            <label className="block font-medium text-gray-700 mb-2">Assistant Message</label>
                            <div className="bg-blue-50 rounded-lg p-3 text-sm whitespace-pre-wrap border border-blue-200">
                              {convo.assistant_message_en}
                            </div>
                          </div>
                        </div>

                        {/* Expert Answer Section */}
                        <div>
                          <label className="block font-medium text-gray-700 mb-2">Expert Answer</label>
                          <textarea
                            value={expertAnswer}
                            onChange={(e) => setExpertAnswer(e.target.value)}
                            rows={6}
                            className="input-field resize-none"
                            placeholder="Provide your expert analysis and recommendations..."
                          />
                          <div className="flex justify-between items-center mt-3">
                            <button
                              className="btn btn-primary"
                              onClick={submitAnswer}
                              disabled={!expertAnswer || isFetching}
                            >
                              {isFetching ? (
                                <div className="flex items-center space-x-2">
                                  <div className="loading-spinner"></div>
                                  <span>Submitting...</span>
                                </div>
                              ) : (
                                <div className="flex items-center space-x-2">
                                  <Check className="h-4 w-4" />
                                  <span>Submit Answer</span>
                                </div>
                              )}
                            </button>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              (convo.status ?? 'Open') === 'Open' 
                                ? 'bg-warning-100 text-warning-800' 
                                : 'bg-success-100 text-success-800'
                            }`}>
                              {convo.status ?? 'Open'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })()
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Notification */}
        {notification && (
          <div className="notification">
            <div className="flex items-center space-x-2">
              <Check className="h-4 w-4" />
              <span>{notification}</span>
            </div>
          </div>
        )}
        </div>
      )}
      </main>
    </div>
  )
}
