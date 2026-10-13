import { useEffect, useState } from 'react'
import { api } from '../../api/client'

const EMPTY = {
  name: '',
  description: '',
  price: '',
  stock: 0,
  category_id: '',
  is_unlimited_stock: false,
  is_active: true,
}

export default function AdminProducts() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [editing, setEditing] = useState(null) // null | "new" | product object
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  function load() {
    api.get('/products/?page_size=100').then((d) => setProducts(d.items))
    api.get('/categories/').then(setCategories)
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

  async function remove(p) {
    if (!confirm(`Delete "${p.name}"?`)) return
    try {
      await api.del(`/products/${p.id}`)
      load()
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <h2>Products</h2>
        {editing === null && <button onClick={startNew}>+ New product</button>}
      </div>

      {editing !== null && (
        <form onSubmit={save} style={{ background: '#fff', padding: 16, borderRadius: 6, marginBottom: 24 }}>
          <h3 style={{ marginTop: 0 }}>{editing === 'new' ? 'New product' : `Edit: ${editing.name}`}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label>
              Name
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={{ width: '100%', padding: 8 }} />
            </label>
            <label>
              Category
              <select required value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} style={{ width: '100%', padding: 8 }}>
                <option value="">Select...</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label>
              Price
              <input required type="number" step="0.01" min="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} style={{ width: '100%', padding: 8 }} />
            </label>
            <label>
              Stock
              <input required type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} style={{ width: '100%', padding: 8 }} disabled={form.is_unlimited_stock} />
            </label>
            <label style={{ gridColumn: '1 / -1' }}>
              Description
              <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ width: '100%', padding: 8 }} />
            </label>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" checked={form.is_unlimited_stock} onChange={(e) => setForm({ ...form, is_unlimited_stock: e.target.checked })} />
              Unlimited stock
            </label>
            {editing !== 'new' && (
              <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                Active (visible in shop)
              </label>
            )}
          </div>
          {error && <p style={{ color: 'red' }}>{error}</p>}
          <div style={{ marginTop: 12 }}>
            <button type="submit" disabled={busy}>{busy ? 'Saving...' : 'Save'}</button>{' '}
            <button type="button" onClick={cancel}>Cancel</button>
          </div>
        </form>
      )}

      <table style={{ width: '100%', background: '#fff', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#fafafa', textAlign: 'left' }}>
            <th style={{ padding: 10 }}>ID</th>
            <th style={{ padding: 10 }}>Name</th>
            <th style={{ padding: 10 }}>Price</th>
            <th style={{ padding: 10 }}>Stock</th>
            <th style={{ padding: 10 }}>Active</th>
            <th style={{ padding: 10 }}></th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id} style={{ borderTop: '1px solid #eee' }}>
              <td style={{ padding: 10 }}>{p.id}</td>
              <td style={{ padding: 10 }}>{p.name}</td>
              <td style={{ padding: 10 }}>${Number(p.price).toFixed(2)}</td>
              <td style={{ padding: 10 }}>{p.is_unlimited_stock ? '∞' : p.stock}</td>
              <td style={{ padding: 10 }}>{p.is_active ? '✅' : '—'}</td>
              <td style={{ padding: 10 }}>
                <button onClick={() => startEdit(p)}>Edit</button>{' '}
                <button onClick={() => remove(p)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}