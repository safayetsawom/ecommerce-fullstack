import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'

export default function MyOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.get('/orders/me')
      .then(setOrders)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p style={{ padding: 24 }}>Loading...</p>
  if (error) return <p style={{ padding: 24, color: 'red' }}>{error}</p>

  if (orders.length === 0) {
    return (
      <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
        <h1>My Orders</h1>
        <p>No orders yet.</p>
        <Link to="/products">Browse products</Link>
      </div>
    )
  }

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <h1>My Orders</h1>
      {orders.map((o) => (
        <div key={o.id} style={{ background: '#fff', padding: 16, marginBottom: 12, borderRadius: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <strong>Order #{o.id}</strong>
            <span>{new Date(o.created_at).toLocaleString()}</span>
          </div>
          <p>Status: <strong>{o.status}</strong></p>
          <p>Total: ${Number(o.total_price).toFixed(2)}</p>
          <details>
            <summary>Items ({o.items.length})</summary>
            <ul>
              {o.items.map((it) => (
                <li key={it.id}>{it.product_name} × {it.quantity} — ${Number(it.subtotal).toFixed(2)}</li>
              ))}
            </ul>
          </details>
        </div>
      ))}
    </div>
  )
}