import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, getGuestToken } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { Button, Card } from '../components/ui'

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
      setError(err.message)
    }
  }

  async function removeItem(itemId) {
    try {
      const data = await api.del(`/cart/items/${itemId}`, guestHeaders())
      setCart(data)
      window.dispatchEvent(new Event('cart-updated'))
    } catch (err) {
      setError(err.message)
    }
  }

  async function clearCart() {
    if (!confirm('Clear the whole cart?')) return
    try {
      await api.del('/cart/', guestHeaders())
      load()
      window.dispatchEvent(new Event('cart-updated'))
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Your Cart</h1>
        <Card className="p-6 animate-pulse space-y-4">
          <div className="h-16 bg-gray-100 rounded" />
          <div className="h-16 bg-gray-100 rounded" />
          <div className="h-16 bg-gray-100 rounded" />
        </Card>
      </div>
    )
  }

  if (error && !cart) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      </div>
    )
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <Card className="p-12 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Your cart is empty</h1>
          <p className="mt-2 text-sm text-gray-600">
            Browse our catalog and add something you like.
          </p>
          <Link to="/products">
            <Button className="mt-6">Browse products</Button>
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-baseline justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Your Cart</h1>
        <button
          onClick={clearCart}
          className="text-sm text-gray-500 hover:text-red-600 transition-colors"
        >
          Clear cart
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {cart.items.map((item) => (
            <Card key={item.id} className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 flex-shrink-0 rounded bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center border border-gray-200 overflow-hidden">
                  {item.product_image_url ? (
                    <img
                      src={item.product_image_url}
                      alt={item.product_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xl font-bold text-gray-300">
                      {item.product_name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <Link
                    to={`/products/${item.product_id}`}
                    className="font-medium text-gray-900 hover:text-brand-600 transition-colors"
                  >
                    {item.product_name}
                  </Link>
                  <div className="text-sm text-gray-500">
                    ${Number(item.unit_price).toFixed(2)} each
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => {
                      const v = parseInt(e.target.value) || 1
                      if (v !== item.quantity) updateQty(item.id, v)
                    }}
                    className="w-16 px-2 py-1 text-sm border border-gray-300 rounded-md text-center focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  />

                  <span className="w-24 text-right font-semibold text-gray-900">
                    ${Number(item.subtotal).toFixed(2)}
                  </span>

                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-gray-400 hover:text-red-600 transition-colors p-1"
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="lg:col-span-1">
          <Card className="p-6 sticky top-24">
            <h2 className="font-semibold text-gray-900">Order summary</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-600">Items</dt>
                <dd className="text-gray-900">{cart.total_items}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Subtotal</dt>
                <dd className="text-gray-900">${Number(cart.total_price).toFixed(2)}</dd>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-3 mt-3">
                <dt className="font-semibold text-gray-900">Total</dt>
                <dd className="font-semibold text-gray-900 text-lg">
                  ${Number(cart.total_price).toFixed(2)}
                </dd>
              </div>
            </dl>
            <Button
              className="w-full mt-6"
              size="lg"
              onClick={() => navigate('/checkout')}
            >
              Checkout
            </Button>
            <Link to="/products">
              <Button variant="ghost" size="sm" className="w-full mt-2">
                Continue shopping
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  )
}