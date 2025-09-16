import React, { useEffect, useState } from 'react'
import axios from 'axios'

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

  return (
    <div>
      <h2>Insights</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 6 }}>
          <h3>Top Bots</h3>
          <ol>
            {Object.entries(insights.top_bots || {}).slice(0, 20).map(([k, v]) => (
              <li key={k}>{k}: {String(v)}</li>
            ))}
          </ol>
        </div>

        <div style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 6 }}>
          <h3>Top Subjects</h3>
          <ol>
            {Object.entries(insights.top_subjects || {}).slice(0, 20).map(([k, v]) => (
              <li key={k}>{k}: {String(v)}</li>
            ))}
          </ol>
        </div>

        <div style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 6 }}>
          <h3>Top Crops</h3>
          <ol>
            {Object.entries(insights.top_crops || {}).slice(0, 20).map(([k, v]) => (
              <li key={k}>{k}: {String(v)}</li>
            ))}
          </ol>
        </div>

        <div style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 6 }}>
          <h3>Feedback Stats</h3>
          <ul>
            {Object.entries(insights.feedback_stats || {}).map(([k, v]) => (
              <li key={k}>{k}: {String(v)}</li>
            ))}
          </ul>
        </div>

        <div style={{ gridColumn: '1 / -1', padding: 12, border: '1px solid #e5e7eb', borderRadius: 6 }}>
          <h3>Monthly Counts</h3>
          <div style={{ maxHeight: 160, overflow: 'auto' }}>
            <ol>
              {Object.entries(insights.monthly_counts || {}).map(([k, v]) => (
                <li key={k}>{k}: {String(v)}</li>
              ))}
            </ol>
          </div>
        </div>

        <div style={{ gridColumn: '1 / -1', padding: 12, border: '1px solid #e5e7eb', borderRadius: 6 }}>
          <h3>Top Words (user messages)</h3>
          <div style={{ maxHeight: 220, overflow: 'auto' }}>
            <ol>
              {(insights.top_words || []).map((pair: any[], idx: number) => (
                <li key={idx}>{String(pair[0])}: {String(pair[1])}</li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <strong>Total conversations:</strong> {String(insights.total_conversations)}
      </div>
    </div>
  )
}
