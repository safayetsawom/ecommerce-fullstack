import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import { Button, Card, Input, ImageUpload } from '../../components/ui'

const EMPTY = {
  name: '',
  description: '',
  price: '',
  stock: '',
  category_id: '',
  is_unlimited_stock: false,
  is_active: true,
  image_url: null,
  options: [],
}

// Generate a fresh, unique id for option groups and values (client-side only)
let nextLocalId = 1
function localId() {
  return `local-${nextLocalId++}`
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
      stock: '',
      category_id: p.category_id,
      is_unlimited_stock: p.is_unlimited_stock,
      is_active: p.is_active,
      image_url: p.image_url || null,
      // Convert options from server shape → local shape (with local ids for React keys)
      options: (p.options || []).map((opt) => ({
        _localId: localId(),
        _serverId: opt.id,
        name: opt.name,
        position: opt.position,
        values: opt.values.map((v) => ({
          _localId: localId(),
          _serverId: v.id,
          value: v.value,
          position: v.position,
        })),
      })),
    })
    setError(null)
  }

  function cancel() {
    setEditing(null)
    setForm(EMPTY)
    setError(null)
  }

  // ---------- options editing ----------

  function addOption() {
    setForm((prev) => ({
      ...prev,
      options: [
        ...prev.options,
        {
          _localId: localId(),
          name: '',
          position: prev.options.length,
          values: [{ _localId: localId(), value: '', position: 0 }],
        },
      ],
    }))
  }

  function removeOption(optLocalId) {
    setForm((prev) => ({
      ...prev,
      options: prev.options.filter((o) => o._localId !== optLocalId),
    }))
  }

  function updateOptionName(optLocalId, name) {
    setForm((prev) => ({
      ...prev,
      options: prev.options.map((o) =>
        o._localId === optLocalId ? { ...o, name } : o
      ),
    }))
  }

  function addOptionValue(optLocalId) {
    setForm((prev) => ({
      ...prev,
      options: prev.options.map((o) =>
        o._localId === optLocalId
          ? {
              ...o,
              values: [
                ...o.values,
                { _localId: localId(), value: '', position: o.values.length },
              ],
            }
          : o
      ),
    }))
  }

  function removeOptionValue(optLocalId, valLocalId) {
    setForm((prev) => ({
      ...prev,
      options: prev.options.map((o) =>
        o._localId === optLocalId
          ? { ...o, values: o.values.filter((v) => v._localId !== valLocalId) }
          : o
      ),
    }))
  }

  function updateOptionValue(optLocalId, valLocalId, value) {
    setForm((prev) => ({
      ...prev,
      options: prev.options.map((o) =>
        o._localId === optLocalId
          ? {
              ...o,
              values: o.values.map((v) =>
                v._localId === valLocalId ? { ...v, value } : v
              ),
            }
          : o
      ),
    }))
  }

  // ---------- save ----------

  async function save(e) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      // Build options payload — strip local-only fields
      const optionsPayload = form.options
        .filter((o) => o.name.trim() && o.values.some((v) => v.value.trim()))
        .map((o, i) => ({
          name: o.name.trim(),
          position: i,
          values: o.values
            .filter((v) => v.value.trim())
            .map((v, j) => ({ value: v.value.trim(), position: j })),
        }))

      const payload = {
        name: form.name,
        description: form.description || null,
        price: String(form.price),
        category_id: Number(form.category_id),
        is_unlimited_stock: !!form.is_unlimited_stock,
        image_url: form.image_url || null,
        options: optionsPayload,
      }

      if (editing === 'new') {
        await api.post('/products/', payload)
      } else {
        await api.patch(`/products/${editing.id}`, {
          ...payload,
          is_active: !!form.is_active,
        })
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
        if (hide) await toggleActive(p)
      } else {
        alert(err.message)
      }
    }
  }

  // ---------- variant stock editing (for existing products) ----------

  function updateVariantStockLocal(variantId, stock) {
    setEditing((prev) => ({
      ...prev,
      variants: prev.variants.map((v) =>
        v.id === variantId ? { ...v, stock: parseInt(stock) || 0 } : v
      ),
    }))
  }

  async function saveVariantStock() {
    setBusy(true)
    setError(null)
    try {
      await api.patch(`/products/${editing.id}/variants`, {
        variants: editing.variants.map((v) => ({
          variant_id: v.id,
          stock: Number(v.stock),
          is_active: v.is_active,
        })),
      })
      cancel()
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
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

          <form onSubmit={save} className="space-y-6">
            {/* ---- basic fields ---- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <label className="flex items-center gap-2 text-sm text-gray-700 pt-6">
                <input
                  type="checkbox"
                  checked={form.is_unlimited_stock}
                  onChange={(e) => setForm({ ...form, is_unlimited_stock: e.target.checked })}
                  className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />
                Unlimited stock (ignore variant stock)
              </label>
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
            </div>

            {/* ---- options builder ---- */}
            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-medium text-gray-900">Options</h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    e.g. Size (S, M, L), Color (Black, White). Combos auto-generate variants.
                  </p>
                </div>
                <Button type="button" variant="secondary" size="sm" onClick={addOption}>
                  + Add option
                </Button>
              </div>

              {form.options.length === 0 && (
                <div className="rounded-md border border-dashed border-gray-300 p-4 text-sm text-gray-500 text-center">
                  No options — this product will have a single variant.
                </div>
              )}

              <div className="space-y-4">
                {form.options.map((opt, optIndex) => (
                  <div key={opt._localId} className="border border-gray-200 rounded-md p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <Input
                        label={`Option ${optIndex + 1} name`}
                        placeholder="Size"
                        value={opt.name}
                        onChange={(e) => updateOptionName(opt._localId, e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeOption(opt._localId)}
                        className="self-end text-red-600 hover:text-red-700"
                      >
                        Remove option
                      </Button>
                    </div>
                    <div className="flex flex-wrap items-end gap-2">
                      {opt.values.map((val) => (
                        <div key={val._localId} className="flex items-center gap-1">
                          <input
                            type="text"
                            placeholder="Value"
                            value={val.value}
                            onChange={(e) =>
                              updateOptionValue(opt._localId, val._localId, e.target.value)
                            }
                            className="w-28 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                          />
                          <button
                            type="button"
                            onClick={() => removeOptionValue(opt._localId, val._localId)}
                            className="text-gray-400 hover:text-red-600 px-1"
                            title="Remove value"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => addOptionValue(opt._localId)}
                      >
                        + Value
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ---- variant grid (only when editing existing product) ---- */}
            {editing !== 'new' && editing.variants && editing.variants.length > 0 && (
              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900">Variants — stock</h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Set stock per combination. Save changes here separately.
                    </p>
                  </div>
                  <Button type="button" variant="secondary" size="sm" onClick={saveVariantStock} disabled={busy}>
                    {busy ? 'Saving...' : 'Save variant stock'}
                  </Button>
                </div>
                <div className="border border-gray-200 rounded-md overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      <tr>
                        <th className="px-4 py-2">Combination</th>
                        <th className="px-4 py-2 w-32">Stock</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {editing.variants.map((v) => (
                        <tr key={v.id}>
                          <td className="px-4 py-2 text-gray-900">{v.options_text}</td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              min={0}
                              value={v.stock}
                              disabled={form.is_unlimited_stock}
                              onChange={(e) => updateVariantStockLocal(v.id, e.target.value)}
                              className="w-24 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:bg-gray-100 disabled:text-gray-400"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

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
              <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <Button type="submit" disabled={busy}>
                {busy ? 'Saving...' : editing === 'new' ? 'Create product' : 'Save product details'}
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
                {products.map((p) => {
                  const totalStock = (p.variants || []).reduce((s, v) => s + v.stock, 0)
                  return (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500">{p.id}</td>
                      <td className="px-4 py-3">
                        {p.image_url ? (
                          <img
                            src={p.image_url}
                            alt={p.name}
                            className="w-10 h-10 object-contain rounded border border-gray-200 bg-gray-50"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
                            —
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {p.name}
                        {p.options?.length > 0 && (
                          <div className="text-xs text-gray-500 font-normal mt-0.5">
                            {p.options.map((o) => o.name).join(' · ')}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-900">${Number(p.price).toFixed(2)}</td>
                      <td className="px-4 py-3 text-gray-700">
                        {p.is_unlimited_stock ? '∞' : totalStock}
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
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}