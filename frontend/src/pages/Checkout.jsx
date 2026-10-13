import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, getGuestToken, apiFetch } from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function Checkout() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [address, setAddress] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      let order
      if (user) {
        order = await api.post('/orders/', { shipping_address: address })
        window.dispatchEvent(new Event('cart-updated'))
        navigate(`/orders/success/user/${order.id}`)
      } else {
        const gt = getGuestToken()
        if (!gt) throw new Error('No guest cart found')
        order = await api.post('/orders/guest', {
          guest_token: gt,
          guest_email: email,
          guest_phone: phone,
          shipping_address: address,
        })
        window.dispatchEvent(new Event('cart-updated'))
        navigate(`/orders/success/guest/${gt}`)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ maxWidth: 500, margin: '40px auto', padding: 24, background: '#fff' }}>
      <h2>Checkout</h2>
      <form onSubmit={handleSubmit}>
        {!user && (
          <>
            <div style={{ marginBottom: 12 }}>
              <label>Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: '100%', padding: 8 }}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label>Phone (digits, optional +)</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+8801700000000"
                style={{ width: '100%', padding: 8 }}
              />
            </div>
          </>
        )}
        <div style={{ marginBottom: 12 }}>
          <label>Shipping address</label>
          <textarea
            required
            rows={3}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" disabled={busy} style={{ padding: '10px 24px' }}>
          {busy ? 'Placing order...' : 'Place order'}
        </button>
      </form>
    </div>
  )
}