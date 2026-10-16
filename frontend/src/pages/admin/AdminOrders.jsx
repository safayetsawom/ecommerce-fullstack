import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import { Button, Card } from '../../components/ui'

const STATUSES = ['pending', 'paid', 'shipped', 'delivered', 'cancelled']

const STATUS_STYLES = {
  pending:   'bg-yellow-50 text-yellow-700 border-yellow-200',
  paid:      'bg-blue-50 text-blue-700 border-blue-200',
  shipped:   'bg-purple-50 text-purple-700 border-purple-200',
  delivered: 'bg-green-50 text-green-700 border-green-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
}

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
    setError(null)
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Orders</h2>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Status</label>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1) }}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white"
          >
            <option value="">All</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-6 animate-pulse space-y-3">
              <div className="h-5 bg-gray-100 rounded w-1/3" />
              <div className="h-4 bg-gray-100 rounded w-1/2" />
            </Card>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-sm text-gray-500">No orders found.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <Card key={o.id} className="overflow-hidden">
              <div className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-900">Order #{o.id}</h3>
                      <span className={`text-xs font-medium px-2 py-1 rounded border ${STATUS_STYLES[o.status] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                        {o.status}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-gray-600 space-y-0.5">
                      <div>
                        {o.user_id
                          ? `Customer #${o.user_id}`
                          : `Guest · ${o.guest_email}`}
                      </div>
                      <div>{o.shipping_phone}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(o.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-semibold text-gray-900">
                      ${Number(o.total_price).toFixed(2)}
                    </div>
                    <select
                      value={o.status}
                      onChange={(e) => changeStatus(o, e.target.value)}
                      className="mt-2 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white"
                    >
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div className="mt-4 text-sm text-gray-600">
                  <span className="font-medium text-gray-700">Ship to:</span>{' '}
                  {o.shipping_address}
                </div>

                <details className="mt-4 border-t border-gray-100 pt-3">
                  <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-900 select-none">
                    Items ({o.items.length})
                  </summary>
                  <ul className="mt-3 divide-y divide-gray-100">
                    {o.items.map((it) => (
                      <li key={it.id} className="py-2 flex items-center justify-between text-sm">
                        <span className="text-gray-900">{it.product_name} × {it.quantity}</span>
                        <span className="text-gray-600">${Number(it.subtotal).toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              </div>
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-gray-600">
            Page <span className="font-medium text-gray-900">{page}</span> of {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}