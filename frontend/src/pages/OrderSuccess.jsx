import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { Button, Card } from '../components/ui'

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

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <Card className="p-8 text-center">
          <p className="text-sm text-red-600">{error}</p>
        </Card>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Card className="p-8 animate-pulse space-y-4">
          <div className="h-6 bg-gray-100 rounded w-1/2" />
          <div className="h-4 bg-gray-100 rounded w-3/4" />
          <div className="h-4 bg-gray-100 rounded w-2/3" />
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-100 mb-4">
          <span className="text-2xl text-green-700">✓</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Order confirmed</h1>
        <p className="mt-2 text-sm text-gray-600">
          Order <span className="font-medium text-gray-900">#{order.id}</span> is
          {' '}<span className="font-medium text-gray-900">{order.status}</span>.
        </p>
      </div>

      <Card className="p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Order details</h2>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-600">Total</dt>
            <dd className="font-semibold text-gray-900">
              ${Number(order.total_price).toFixed(2)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-600 flex-shrink-0">Ship to</dt>
            <dd className="text-gray-900 text-right">{order.shipping_address}</dd>
          </div>
          {order.guest_email && (
            <div className="flex justify-between">
              <dt className="text-gray-600">Email</dt>
              <dd className="text-gray-900">{order.guest_email}</dd>
            </div>
          )}
          {order.shipping_phone && (
            <div className="flex justify-between">
              <dt className="text-gray-600">Phone</dt>
              <dd className="text-gray-900">{order.shipping_phone}</dd>
            </div>
          )}
        </dl>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-3">Items</h3>
          <ul className="divide-y divide-gray-100">
            {order.items.map((it) => (
              <li key={it.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-900">{it.product_name}</div>
                  <div className="text-xs text-gray-500">
                    ${Number(it.unit_price).toFixed(2)} × {it.quantity}
                  </div>
                </div>
                <div className="text-sm font-medium text-gray-900">
                  ${Number(it.subtotal).toFixed(2)}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </Card>

      {kind === 'guest' && (
        <Card className="mt-6 p-4 bg-amber-50 border-amber-200">
          <p className="text-sm text-amber-800">
            <strong>Save this link.</strong> This is the only way to view this order
            again — bookmark it or copy the URL.
          </p>
        </Card>
      )}

      <div className="mt-6 text-center">
        <Link to="/products">
          <Button variant="secondary">Continue shopping</Button>
        </Link>
      </div>
    </div>
  )
}