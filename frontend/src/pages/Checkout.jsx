import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api, getGuestToken } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { Button, Card, Input } from '../components/ui'

export default function Checkout() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [address, setAddress] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState(user?.phone || '')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      let order
      if (user) {
        order = await api.post('/orders/', {
          shipping_address: address,
          shipping_phone: phone,
        })
        window.dispatchEvent(new Event('cart-updated'))
        navigate(`/orders/success/user/${order.id}`)
      } else {
        const gt = getGuestToken()
        if (!gt) throw new Error('No guest cart found')
        order = await api.post('/orders/guest', {
          guest_token: gt,
          guest_email: email,
          shipping_phone: phone,
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
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link
        to="/cart"
        className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
      >
        ← Back to cart
      </Link>

      <Card className="p-8">
        <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>
        <p className="mt-1 text-sm text-gray-600">
          {user
            ? 'Confirm your shipping details to place the order.'
            : 'Enter your details to place the order as a guest.'}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {!user && (
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
          )}

          <Input
            label="Phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            placeholder="+8801700000000"
            hint="Digits only, optional leading +."
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Shipping address
            </label>
            <textarea
              required
              rows={4}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street, city, postal code, country"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>

          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <Button type="submit" disabled={busy} size="lg" className="w-full">
            {busy ? 'Placing order...' : 'Place order'}
          </Button>
        </form>
      </Card>
    </div>
  )
}