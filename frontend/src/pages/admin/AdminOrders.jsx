import { useEffect, useState } from 'react'
import { api } from '../../api/client'

const STATUSES = ['pending', 'paid', 'shipped', 'delivered', 'cancelled']

export default function AdminOrders() {
  const [orders, setOrders] = useState([])
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 10
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  function load() {
    setLoading(true)
    const q = new URLSearchParams()
    if (status) q.set('status', status)
    q.set('page', page)
    q.set('page_size', pageSize)
    api.get(`/orders/?${q.toString()}`)
      .then((d) => { setOrders(d.items); setTotal(d.total) })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [status, page])

  async function changeStatus(order, newStatus) {
    try {
      await api.patch(`/orders/${order.id}/status`, { status: newStatus })
      load()
    } catch (err) {
      alert(err.message)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div>
      <h2>Orders</h2>

      <div style={{ marginBottom: 12 }}>
        <label>Filter by status: </label>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} style={{ padding: 6 }}>
          <option value="">All</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {orders.map((o) => (
        <div key={o.id} style={{ background: '#fff', padding: 16, marginBottom: 12, borderRadius: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <strong>Order #{o.id}</strong>
              <div style={{ fontSize: 13, color: '#666' }}>
                {o.user_id ? `User ID: ${o.user_id}` : `Guest: ${o.guest_email} / ${o.guest_phone}`}
              </div>
              <div style={{ fontSize: 13, color: '#666' }}>
                {new Date(o.created_at).toLocaleString()}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div>${Number(o.total_price).toFixed(2)}</div>
              <div style={{ marginTop: 6 }}>
                <select value={o.status} onChange={(e) => changeStatus(o, e.target.value)} style={{ padding: 6 }}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 8, fontSize: 14, color: '#555' }}>
            Ship to: {o.shipping_address}
          </div>
          <details style={{ marginTop: 8 }}>
            <summary>Items ({o.items.length})</summary>
            <ul>
              {o.items.map((it) => (
                <li key={it.id}>{it.product_name} × {it.quantity} — ${Number(it.subtotal).toFixed(2)}</li>
              ))}
            </ul>
          </details>
        </div>
      ))}

      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 16, alignItems: 'center' }}>
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>
          <span>Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}
    </div>
  )
}