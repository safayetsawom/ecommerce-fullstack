import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client'

export default function OrderSuccess() {
  const { kind, key } = useParams()
  const [order, setOrder] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    const path = kind === 'guest' ? `/orders/guest/${key}` : `/orders/${key}`
    api.get(path)
      .then(setOrder)
      .catch((err) => setError(err.message))
  }, [kind, key])

  if (error) return <p style={{ padding: 24, color: 'red' }}>{error}</p>
  if (!order) return <p style={{ padding: 24 }}>Loading order...</p>

  return (
    <div style={{ maxWidth: 700, margin: '40px auto', padding: 24, background: '#fff' }}>
      <h1>Order placed 🎉</h1>
      <p>Order #{order.id} — status: <strong>{order.status}</strong></p>
      <p>Total: <strong>${Number(order.total_price).toFixed(2)}</strong></p>
      <p>Ship to: {order.shipping_address}</p>
      {order.guest_email && <p>Email: {order.guest_email}</p>}
      {order.guest_phone && <p>Phone: {order.guest_phone}</p>}

      <h3 style={{ marginTop: 24 }}>Items</h3>
      <ul>
        {order.items.map((it) => (
          <li key={it.id}>
            {it.product_name} × {it.quantity} — ${Number(it.subtotal).toFixed(2)}
          </li>
        ))}
      </ul>

      <p style={{ marginTop: 24 }}>
        <Link to="/products">Continue shopping</Link>
      </p>
    </div>
  )
}