import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { BarChart3, TrendingUp, Users, MessageSquare, Bot, Sprout, AlertCircle } from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts'

export default function Insights() {
  const EDA_BASE = (import.meta.env as any).VITE_EDA_URL ?? 'http://localhost:5175'
  const [insights, setInsights] = useState<any | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const res = await axios.get(`${EDA_BASE}/insights`)
        setInsights(res.data)
      } catch (err: any) {
        setError(err?.message || 'Failed to fetch insights')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="loading-spinner w-8 h-8 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading insights...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card">
        <div className="card-body">
          <div className="flex items-center space-x-3 text-red-600">
            <AlertCircle className="h-6 w-6" />
            <div>
              <h3 className="font-semibold">Error Loading Insights</h3>
              <p className="text-sm text-red-500">{error}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!insights) {
    return (
      <div className="card">
        <div className="card-body text-center py-12">
          <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">No insights available.</p>
        </div>
      </div>
    )
  }

  // helper to convert an object like {k: v} to array sorted by value desc
  const toSortedArray = (obj: Record<string, number> | undefined, limit = 20) => {
    if (!obj) return []
    return Object.entries(obj).map(([k, v]) => ({ name: k, value: Number(v) })).sort((a, b) => b.value - a.value).slice(0, limit)
  }

  const topBots = toSortedArray(insights.top_bots)
  const topSubjects = toSortedArray(insights.top_subjects)
  const topCrops = toSortedArray(insights.top_crops)
  const monthly = Object.entries(insights.monthly_counts || {}).map(([k, v]) => ({ month: k, value: Number(v) })).sort((a, b) => a.month.localeCompare(b.month))

  const COLORS = ['#2563eb', '#10b981', '#f97316', '#ef4444', '#8b5cf6', '#06b6d4', '#f59e0b', '#84cc16', '#7c3aed', '#db2777']

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
          <BarChart3 className="h-8 w-8 text-primary-600" />
          <span>Analytics Dashboard</span>
        </h2>
        <p className="text-gray-600 mt-1">Comprehensive insights into farmer conversations and AI interactions</p>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 bg-blue-100 rounded-lg">
                <MessageSquare className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Conversations</p>
                <p className="text-2xl font-bold text-gray-900">{String(insights.total_conversations || 0)}</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 bg-green-100 rounded-lg">
                <Bot className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Bots</p>
                <p className="text-2xl font-bold text-gray-900">{Object.keys(insights.top_bots || {}).length}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 bg-agriculture-100 rounded-lg">
                <Sprout className="h-6 w-6 text-agriculture-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Crops Discussed</p>
                <p className="text-2xl font-bold text-gray-900">{Object.keys(insights.top_crops || {}).length}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 bg-yellow-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Feedback Items</p>
                <p className="text-2xl font-bold text-gray-900">{Object.values(insights.feedback_stats || {}).reduce((a: any, b: any) => Number(a) + Number(b), 0)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Top Bots Chart */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <Bot className="h-5 w-5 text-blue-600" />
              <span>Top Bots</span>
            </h3>
            <p className="text-sm text-gray-600">Most active AI assistants</p>
          </div>
          <div className="card-body">
            {topBots.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No data available</div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topBots} layout="vertical" margin={{ left: 8, right: 8 }}>
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e5e7eb', 
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }} 
                    />
                    <Bar dataKey="value" fill="#2563eb" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Top Subjects Chart */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <MessageSquare className="h-5 w-5 text-green-600" />
              <span>Top Subjects</span>
            </h3>
            <p className="text-sm text-gray-600">Most discussed topics</p>
          </div>
          <div className="card-body">
            {topSubjects.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No data available</div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topSubjects} layout="vertical" margin={{ left: 8, right: 8 }}>
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={120} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e5e7eb', 
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }} 
                    />
                    <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Top Crops Chart */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <Sprout className="h-5 w-5 text-agriculture-600" />
              <span>Top Crops</span>
            </h3>
            <p className="text-sm text-gray-600">Most discussed agricultural products</p>
          </div>
          <div className="card-body">
            {topCrops.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No data available</div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topCrops} layout="vertical" margin={{ left: 8, right: 8 }}>
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={120} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e5e7eb', 
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }} 
                    />
                    <Bar dataKey="value" fill="#84cc16" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Feedback Distribution */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-yellow-600" />
              <span>Feedback Distribution</span>
            </h3>
            <p className="text-sm text-gray-600">User satisfaction metrics</p>
          </div>
          <div className="card-body">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={Object.entries(insights.feedback_stats || {}).map(([k, v]) => ({ name: k, value: Number(v) }))}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={40}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {Object.entries(insights.feedback_stats || {}).map(([k, v], i) => (
                      <Cell key={k} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb', 
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }} 
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    wrapperStyle={{ paddingTop: '20px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Trends */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-primary-600" />
            <span>Monthly Conversation Trends</span>
          </h3>
          <p className="text-sm text-gray-600">Conversation volume over time</p>
        </div>
        <div className="card-body">
          {monthly.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No data available</div>
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthly} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="month" 
                    stroke="#64748b"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="#64748b"
                    fontSize={12}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb', 
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#0ea5e9" 
                    strokeWidth={3}
                    dot={{ fill: '#0ea5e9', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#0ea5e9', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Word Cloud */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
            <MessageSquare className="h-5 w-5 text-purple-600" />
            <span>Top Words in User Messages</span>
          </h3>
          <p className="text-sm text-gray-600">Most frequently mentioned terms</p>
        </div>
        <div className="card-body">
          {(!insights.top_words || insights.top_words.length === 0) ? (
            <div className="text-center py-8 text-gray-500">No word data available</div>
          ) : (
            (() => {
              const words: { word: string; count: number }[] = (insights.top_words || []).map((p: any[]) => ({ word: String(p[0]), count: Number(p[1]) }))
              const max = Math.max(...words.map(w => w.count), 1)
              const min = Math.min(...words.map(w => w.count), 0)
              const minSize = 14
              const maxSize = 48
              const colorPalette = ['#1f2937','#2563eb','#10b981','#f97316','#ef4444','#8b5cf6','#06b6d4','#f59e0b']
              return (
                <div className="max-h-64 overflow-auto p-4">
                  <div className="flex flex-wrap gap-3 items-center justify-center">
                    {words.map((w, i) => {
                      // linear scale from count to fontSize
                      const t = max === min ? 0.5 : (w.count - min) / (max - min)
                      const size = Math.round(minSize + t * (maxSize - minSize))
                      const color = colorPalette[i % colorPalette.length]
                      return (
                        <span key={w.word + i}
                          title={`${w.word}: ${w.count} mentions`}
                          style={{ fontSize: size, color, lineHeight: 1.2 }}
                          className="cursor-default inline-block px-2 py-1 rounded-md hover:bg-gray-100 transition-colors duration-200 font-medium">
                          {w.word}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )
            })()
          )}
        </div>
      </div>
    </div>
  )
}
