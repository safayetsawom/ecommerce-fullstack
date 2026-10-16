import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'

const PAGE_SIZE = 12

export default function Products() {
  const [params, setParams] = useSearchParams()
  const [data, setData] = useState({ items: [], total: 0, page: 1, page_size: PAGE_SIZE })
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Read current filters from URL
  const q = params.get('q') || ''
  const categoryId = params.get('category_id') || ''
  const minPrice = params.get('min_price') || ''
  const maxPrice = params.get('max_price') || ''
  const page = parseInt(params.get('page') || '1', 10)

  // Local form state (so typing doesn't refetch on every keystroke)
  const [searchInput, setSearchInput] = useState(q)

  useEffect(() => {
    api.get('/categories/').then(setCategories).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    setError(null)

    const query = new URLSearchParams()
    if (q) query.set('q', q)
    if (categoryId) query.set('category_id', categoryId)
    if (minPrice) query.set('min_price', minPrice)
    if (maxPrice) query.set('max_price', maxPrice)
    query.set('page', String(page))
    query.set('page_size', String(PAGE_SIZE))

    api.get(`/products/?${query.toString()}`)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [q, categoryId, minPrice, maxPrice, page])

  function updateParam(key, value) {
    const next = new URLSearchParams(params)
    if (value === '' || value === null || value === undefined) next.delete(key)
    else next.set(key, value)
    if (key !== 'page') next.set('page', '1') // reset to page 1 on filter change
    setParams(next)
  }

  function handleSearchSubmit(e) {
    e.preventDefault()
    updateParam('q', searchInput.trim())
  }

  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE))

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <h1>Products</h1>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20, alignItems: 'center' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            placeholder="Search by name..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={{ padding: 8, minWidth: 220 }}
          />
          <button type="submit" style={{ padding: '8px 16px' }}>Search</button>
        </form>

        <select
          value={categoryId}
          onChange={(e) => updateParam('category_id', e.target.value)}
          style={{ padding: 8 }}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <input
          type="number"
          placeholder="Min price"
          value={minPrice}
          onChange={(e) => updateParam('min_price', e.target.value)}
          style={{ padding: 8, width: 120 }}
        />
        <input
          type="number"
          placeholder="Max price"
          value={maxPrice}
          onChange={(e) => updateParam('max_price', e.target.value)}
          style={{ padding: 8, width: 120 }}
        />

        {(q || categoryId || minPrice || maxPrice) && (
          <button onClick={() => { setParams(new URLSearchParams()); setSearchInput('') }}>
            Clear
          </button>
        )}
      </div>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {!loading && !error && data.items.length === 0 && <p>No products found.</p>}

      {/* Product grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: 16,
      }}>
        {data.items.map((p) => (
          <Link
            key={p.id}
            to={`/products/${p.id}`}
            style={{
              background: '#fff',
              padding: 16,
              borderRadius: 6,
              border: '1px solid #eee',
              color: 'inherit',
              textDecoration: 'none',
            }}
          >
            <h3 style={{ margin: '0 0 8px' }}>{p.name}</h3>
            <p style={{ margin: '0 0 8px', color: '#555', fontSize: 14, minHeight: 40 }}>
              {p.description || 'No description'}
            </p>
            <p style={{ margin: '0 0 4px', fontWeight: 'bold' }}>${Number(p.price).toFixed(2)}</p>
            <p style={{ margin: 0, fontSize: 13, color: p.stock > 0 || p.is_unlimited_stock ? '#080' : '#c00' }}>
              {p.is_unlimited_stock ? 'In stock (unlimited)' : p.stock > 0 ? `${p.stock} in stock` : 'Out of stock'}
            </p>
          </Link>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 24, alignItems: 'center' }}>
          <button disabled={page <= 1} onClick={() => updateParam('page', String(page - 1))}>
            Prev
          </button>
          <span>Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => updateParam('page', String(page + 1))}>
            Next
          </button>
          <span style={{ marginLeft: 12, color: '#666' }}>({data.total} products)</span>
        </div>
      )}
    </div>
  )
}