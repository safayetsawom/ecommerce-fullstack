import { useEffect, useState } from 'react'
import { api } from '../../api/client'

export default function AdminCategories() {
  const [categories, setCategories] = useState([])
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  function load() {
    api.get('/categories/').then(setCategories)
  }

  useEffect(() => { load() }, [])

  // Auto-generate slug from name as you type (only if user hasn't overridden it)
  function handleNameChange(v) {
    setName(v)
    if (!slug || slug === slugify(name)) {
      setSlug(slugify(v))
    }
  }

  function slugify(s) {
    return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }

  async function create(e) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await api.post('/categories/', { name, slug })
      setName('')
      setSlug('')
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function remove(c) {
    if (!confirm(`Delete "${c.name}"?`)) return
    try {
      await api.del(`/categories/${c.id}`)
      load()
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div>
      <h2>Categories</h2>
      <form onSubmit={create} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input placeholder="Name" required value={name} onChange={(e) => handleNameChange(e.target.value)} style={{ padding: 8 }} />
        <input placeholder="slug" required value={slug} onChange={(e) => setSlug(e.target.value)} style={{ padding: 8 }} />
        <button type="submit" disabled={busy}>{busy ? 'Creating...' : 'Create'}</button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <table style={{ width: '100%', background: '#fff', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#fafafa', textAlign: 'left' }}>
            <th style={{ padding: 10 }}>ID</th>
            <th style={{ padding: 10 }}>Name</th>
            <th style={{ padding: 10 }}>Slug</th>
            <th style={{ padding: 10 }}></th>
          </tr>
        </thead>
        <tbody>
          {categories.map((c) => (
            <tr key={c.id} style={{ borderTop: '1px solid #eee' }}>
              <td style={{ padding: 10 }}>{c.id}</td>
              <td style={{ padding: 10 }}>{c.name}</td>
              <td style={{ padding: 10 }}>{c.slug}</td>
              <td style={{ padding: 10 }}>
                <button onClick={() => remove(c)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}