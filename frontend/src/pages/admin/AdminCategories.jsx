import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import { Button, Card, Input } from '../../components/ui'

export default function AdminCategories() {
  const [categories, setCategories] = useState([])
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)

  function load() {
    setLoading(true)
    api.get('/categories/')
      .then(setCategories)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  function slugify(s) {
    return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }

  function handleNameChange(v) {
    setName(v)
    if (!slug || slug === slugify(name)) {
      setSlug(slugify(v))
    }
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
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Categories</h2>

      <Card className="p-4 mb-6">
        <form onSubmit={create} className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <Input
            label="Name"
            placeholder="Electronics"
            required
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            className="flex-1"
          />
          <Input
            label="Slug"
            placeholder="electronics"
            required
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" disabled={busy}>
            {busy ? 'Creating...' : 'Create'}
          </Button>
        </form>
        {error && (
          <div className="mt-3 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
      </Card>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3 animate-pulse">
            <div className="h-10 bg-gray-100 rounded" />
            <div className="h-10 bg-gray-100 rounded" />
          </div>
        ) : categories.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-gray-500">No categories yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Slug</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {categories.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500">{c.id}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">{c.slug}</td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => remove(c)}>
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