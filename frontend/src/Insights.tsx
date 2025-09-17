import React, { useEffect, useState } from 'react'
import axios from 'axios'
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

  if (loading) return <div>Loading insights...</div>
  if (error) return <div style={{ color: 'red' }}>{error}</div>
  if (!insights) return <div>No insights available.</div>

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
    <div>
      <h2>Insights</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 6, minHeight: 220 }}>
          <h3>Top Bots</h3>
          {topBots.length === 0 ? <div>No data</div> : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={topBots} layout="vertical" margin={{ left: 8 }}>
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={120} />
                <Tooltip />
                <Bar dataKey="value" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 6, minHeight: 220 }}>
          <h3>Top Subjects</h3>
          {topSubjects.length === 0 ? <div>No data</div> : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={topSubjects} layout="vertical" margin={{ left: 8 }}>
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={140} />
                <Tooltip />
                <Bar dataKey="value" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 6, minHeight: 220 }}>
          <h3>Top Crops</h3>
          {topCrops.length === 0 ? <div>No data</div> : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={topCrops} layout="vertical" margin={{ left: 8 }}>
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={140} />
                <Tooltip />
                <Bar dataKey="value" fill="#f97316" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 6, minHeight: 220 }}>
          <h3>Feedback Distribution</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={Object.entries(insights.feedback_stats || {}).map(([k, v]) => ({ name: k, value: Number(v) }))}
                dataKey="value"
                nameKey="name"
                outerRadius={60}
                innerRadius={30}
                label
              >
                {Object.entries(insights.feedback_stats || {}).map(([k, v], i) => (
                  <Cell key={k} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div style={{ gridColumn: '1 / -1', padding: 12, border: '1px solid #e5e7eb', borderRadius: 6 }}>
          <h3>Monthly Counts</h3>
          {monthly.length === 0 ? <div>No data</div> : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={monthly} margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#06b6d4" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={{ gridColumn: '1 / -1', padding: 12, border: '1px solid #e5e7eb', borderRadius: 6 }}>
          <h3>Top Words (user messages)</h3>
          {/* Word cloud: scale font-size by count */}
          {(!insights.top_words || insights.top_words.length === 0) ? (
            <div>No data</div>
          ) : (
            (() => {
              const words: { word: string; count: number }[] = (insights.top_words || []).map((p: any[]) => ({ word: String(p[0]), count: Number(p[1]) }))
              const max = Math.max(...words.map(w => w.count), 1)
              const min = Math.min(...words.map(w => w.count), 0)
              const minSize = 12
              const maxSize = 40
              const colorPalette = ['#1f2937','#2563eb','#10b981','#f97316','#ef4444','#8b5cf6','#06b6d4','#f59e0b']
              return (
                <div style={{ maxHeight: 220, overflow: 'auto', padding: 8 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 12px', alignItems: 'center' }}>
                    {words.map((w, i) => {
                      // linear scale from count to fontSize
                      const t = max === min ? 0.5 : (w.count - min) / (max - min)
                      const size = Math.round(minSize + t * (maxSize - minSize))
                      const color = colorPalette[i % colorPalette.length]
                      return (
                        <span key={w.word + i}
                          title={`${w.word}: ${w.count}`}
                          style={{ fontSize: size, color, lineHeight: 1, cursor: 'default', display: 'inline-block', padding: '2px 4px', borderRadius: 4 }}>
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

      <div style={{ marginTop: 12 }}>
        <strong>Total conversations:</strong> {String(insights.total_conversations)}
      </div>
    </div>
  )
}
