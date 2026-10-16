import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { Button, Card } from '../components/ui'

const STATUS_STYLES = {
  pending:   'bg-yellow-50 text-yellow-700 border-yellow-200',
  paid:      'bg-blue-50 text-blue-700 border-blue-200',
  shipped:   'bg-purple-50 text-purple-700 border-purple-200',
  delivered: 'bg-green-50 text-green-700 border-green-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
}

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

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Orders</h1>
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Card key={i} className="p-6 animate-pulse space-y-3">
              <div className="h-5 bg-gray-100 rounded w-1/3" />
              <div className="h-4 bg-gray-100 rounded w-1/2" />
              <div className="h-4 bg-gray-100 rounded w-2/3" />
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <Card className="p-12 text-center">
          <h1 className="text-2xl font-bold text-gray-900">No orders yet</h1>
          <p className="mt-2 text-sm text-gray-600">
            Your order history will show up here once you place one.
          </p>
          <Link to="/products">
            <Button className="mt-6">Browse products</Button>
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Orders</h1>

      <div className="space-y-4">
        {orders.map((o) => (
          <Card key={o.id} className="overflow-hidden">
            <div className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-gray-900">Order #{o.id}</h2>
                  <p className="mt-1 text-xs text-gray-500">
                    {new Date(o.created_at).toLocaleString()}
                  </p>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded border ${STATUS_STYLES[o.status] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                  {o.status}
                </span>
              </div>

              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-sm text-gray-600">
                  {o.items.length} {o.items.length === 1 ? 'item' : 'items'}
                </span>
                <span className="text-lg font-semibold text-gray-900">
                  ${Number(o.total_price).toFixed(2)}
                </span>
              </div>
            </div>

            <details className="border-t border-gray-100 group">
              <summary className="px-6 py-3 text-sm text-gray-600 cursor-pointer hover:bg-gray-50 select-none">
                View items
              </summary>
              <ul className="divide-y divide-gray-100 border-t border-gray-100">
                {o.items.map((it) => (
                  <li key={it.id} className="px-6 py-3 flex items-center justify-between text-sm">
                    <span className="text-gray-900">{it.product_name} × {it.quantity}</span>
                    <span className="text-gray-600">${Number(it.subtotal).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            </details>
          </Card>
        ))}
      </div>
    </div>
  )
}