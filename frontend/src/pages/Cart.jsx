import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, getGuestToken } from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function Cart() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [cart, setCart] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  function guestHeaders() {
    if (user) return {}
    const gt = getGuestToken()
    return gt ? { 'X-Guest-Token': gt } : {}
  }

  function load() {
    setLoading(true)
    api.get('/cart/', guestHeaders())
      .then(setCart)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [user])

  async function updateQty(itemId, quantity) {
    try {
      const data = await api.patch(`/cart/items/${itemId}`, { quantity }, guestHeaders())
      setCart(data)
      window.dispatchEvent(new Event('cart-updated'))
    } catch (err) {
      alert(err.message)
    }
  }

  async function removeItem(itemId) {
    try {
      const data = await api.del(`/cart/items/${itemId}`, guestHeaders())
      setCart(data)
      window.dispatchEvent(new Event('cart-updated'))
    } catch (err) {
      alert(err.message)
    }
  }

  async function clearCart() {
    if (!confirm('Clear the whole cart?')) return
    try {
      await api.del('/cart/', guestHeaders())
      load()
      window.dispatchEvent(new Event('cart-updated'))
    } catch (err) {
      alert(err.message)
    }
  }

  if (loading) return <p style={{ padding: 24 }}>Loading cart...</p>
  if (error) return <p style={{ padding: 24, color: 'red' }}>{error}</p>
  if (!cart) return null

  if (cart.items.length === 0) {
    return (
      <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
        <h1>Your Cart</h1>
        <p>Your cart is empty.</p>
        <Link to="/products">Browse products</Link>
      </div>
    )
  }

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <h1>Your Cart</h1>

      <table style={{ width: '100%', background: '#fff', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#fafafa', textAlign: 'left' }}>
            <th style={{ padding: 12 }}>Product</th>
            <th style={{ padding: 12 }}>Price</th>
            <th style={{ padding: 12 }}>Qty</th>
            <th style={{ padding: 12 }}>Subtotal</th>
            <th style={{ padding: 12 }}></th>
          </tr>
        </thead>
        <tbody>
          {cart.items.map((item) => (
            <tr key={item.id} style={{ borderTop: '1px solid #eee' }}>
              <td style={{ padding: 12 }}>
                <Link to={`/products/${item.product_id}`}>{item.product_name}</Link>
              </td>
              <td style={{ padding: 12 }}>${Number(item.unit_price).toFixed(2)}</td>
              <td style={{ padding: 12 }}>
                <input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) => {
                    const v = parseInt(e.target.value) || 1
                    if (v !== item.quantity) updateQty(item.id, v)
                  }}
                  style={{ width: 70, padding: 6 }}
                />
              </td>
              <td style={{ padding: 12 }}>${Number(item.subtotal).toFixed(2)}</td>
              <td style={{ padding: 12 }}>
                <button onClick={() => removeItem(item.id)}>Remove</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20, alignItems: 'center' }}>
        <button onClick={clearCart}>Clear cart</button>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: 20, margin: 0 }}>
            <strong>Total: ${Number(cart.total_price).toFixed(2)}</strong>
          </p>
          <p style={{ color: '#666', margin: '4px 0 12px' }}>{cart.total_items} item(s)</p>
          <button
            onClick={() => navigate('/checkout')}
            style={{ padding: '10px 24px', background: '#0066cc', color: '#fff', border: 'none' }}
          >
            Checkout
          </button>
        </div>
      </div>
    </div>
  )
}