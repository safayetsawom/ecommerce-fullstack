import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import { Button, Card, Input, ImageUpload } from '../../components/ui'

const EMPTY = {
  name: '',
  description: '',
  price: '',
  stock: 0,
  category_id: '',
  is_unlimited_stock: false,
  is_active: true,
  image_url: null,
}

export default function AdminProducts() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)

  function load() {
    setLoading(true)
    Promise.all([
      api.get('/products/?page_size=100'),
      api.get('/categories/'),
    ])
      .then(([p, c]) => {
        setProducts(p.items)
        setCategories(c)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  function startNew() {
    setEditing('new')
    setForm({ ...EMPTY, category_id: categories[0]?.id || '' })
    setError(null)
  }

  function startEdit(p) {
    setEditing(p)
    setForm({
      name: p.name,
      description: p.description || '',
      price: p.price,
      stock: p.stock,
      category_id: p.category_id,
      is_unlimited_stock: p.is_unlimited_stock,
      is_active: p.is_active,
      image_url: p.image_url || null,
    })
    setError(null)
  }

  function cancel() {
    setEditing(null)
    setForm(EMPTY)
    setError(null)
  }

  async function save(e) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const payload = {
        name: form.name,
        description: form.description || null,
        price: String(form.price),
        stock: Number(form.stock),
        category_id: Number(form.category_id),
        is_unlimited_stock: !!form.is_unlimited_stock,
        image_url: form.image_url || null,
      }
      if (editing === 'new') {
        await api.post('/products/', payload)
      } else {
        await api.patch(`/products/${editing.id}`, { ...payload, is_active: !!form.is_active })
      }
      cancel()
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function toggleActive(p) {
    try {
      await api.patch(`/products/${p.id}`, { is_active: !p.is_active })
      load()
    } catch (err) {
      alert(err.message)
    }
  }

  async function remove(p) {
    if (!confirm(`Delete "${p.name}" permanently? This cannot be undone.`)) return
    try {
      await api.del(`/products/${p.id}`)
      load()
    } catch (err) {
      if (err.message && err.message.toLowerCase().includes('existing orders')) {
        const hide = confirm(
          `"${p.name}" is part of past orders and can't be deleted.\n\n` +
          `Hide it from the shop instead? (Order history stays intact.)`
        )
        if (hide) {
          await toggleActive(p)
        }
      } else {
        alert(err.message)
      }
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Products</h2>
        {editing === null && (
          <Button onClick={startNew}>+ New product</Button>
        )}
      </div>

      {editing !== null && (
        <Card className="p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">
            {editing === 'new' ? 'New product' : `Edit: ${editing.name}`}
          </h3>
          <form onSubmit={save} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                required
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white"
              >
                <option value="">Select...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <Input
              label="Price"
              type="number"
              step="0.01"
              min="0.01"
              required
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
            <Input
              label="Stock"
              type="number"
              min="0"
              required
              disabled={form.is_unlimited_stock}
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })}
            />
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>

            <div className="md:col-span-2">
              <ImageUpload
                value={form.image_url}
                onChange={(url) => setForm({ ...form, image_url: url })}
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.is_unlimited_stock}
                onChange={(e) => setForm({ ...form, is_unlimited_stock: e.target.checked })}
                className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              Unlimited stock
            </label>
            {editing !== 'new' && (
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />
                Active (visible in shop)
              </label>
            )}

            {error && (
              <div className="md:col-span-2 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="md:col-span-2 flex gap-2">
              <Button type="submit" disabled={busy}>
                {busy ? 'Saving...' : 'Save'}
              </Button>
              <Button type="button" variant="secondary" onClick={cancel}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3 animate-pulse">
            <div className="h-10 bg-gray-100 rounded" />
            <div className="h-10 bg-gray-100 rounded" />
            <div className="h-10 bg-gray-100 rounded" />
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-gray-500">No products yet.</p>
            <Button className="mt-4" onClick={startNew}>Create your first product</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3"></th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500">{p.id}</td>
                    <td className="px-4 py-3">
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt={p.name}
                          className="w-10 h-10 object-cover rounded border border-gray-200"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
                          —
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                    <td className="px-4 py-3 text-gray-900">${Number(p.price).toFixed(2)}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {p.is_unlimited_stock ? '∞' : p.stock}
                    </td>
                    <td className="px-4 py-3">
                      {p.is_active ? (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-50 text-green-700 rounded">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                          Hidden
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Button variant="ghost" size="sm" onClick={() => startEdit(p)}>
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => toggleActive(p)}>
                        {p.is_active ? 'Hide' : 'Show'}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => remove(p)}>
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}