import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import { Button, Card } from '../components/ui'

const PAGE_SIZE = 12

export default function Products() {
  const [params, setParams] = useSearchParams()
  const [data, setData] = useState({ items: [], total: 0, page: 1, page_size: PAGE_SIZE })
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const q = params.get('q') || ''
  const categoryId = params.get('category_id') || ''
  const minPrice = params.get('min_price') || ''
  const maxPrice = params.get('max_price') || ''
  const page = parseInt(params.get('page') || '1', 10)

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
    if (key !== 'page') next.set('page', '1')
    setParams(next)
  }

  function handleSearchSubmit(e) {
    e.preventDefault()
    updateParam('q', searchInput.trim())
  }

  function clearFilters() {
    setParams(new URLSearchParams())
    setSearchInput('')
  }

  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE))
  const hasFilters = q || categoryId || minPrice || maxPrice

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          {!loading && (
            <p className="mt-1 text-sm text-gray-500">
              {data.total} {data.total === 1 ? 'product' : 'products'}
              {hasFilters && ' matching your filters'}
            </p>
          )}
        </div>
      </div>

      <Card className="p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <form onSubmit={handleSearchSubmit} className="lg:col-span-2 flex gap-2">
            <input
              type="text"
              placeholder="Search by name..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
            <Button type="submit" size="sm">Search</Button>
          </form>

          <select
            value={categoryId}
            onChange={(e) => updateParam('category_id', e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white"
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
            className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
          />
          <input
            type="number"
            placeholder="Max price"
            value={maxPrice}
            onChange={(e) => updateParam('max_price', e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
          />
        </div>

        {hasFilters && (
          <div className="mt-3 flex items-center justify-between">
            <div className="flex flex-wrap gap-2 text-xs text-gray-600">
              {q && <FilterPill label={`"${q}"`} onClear={() => { updateParam('q', ''); setSearchInput('') }} />}
              {categoryId && <FilterPill label={categories.find(c => String(c.id) === categoryId)?.name || 'Category'} onClear={() => updateParam('category_id', '')} />}
              {minPrice && <FilterPill label={`Min $${minPrice}`} onClear={() => updateParam('min_price', '')} />}
              {maxPrice && <FilterPill label={`Max $${maxPrice}`} onClear={() => updateParam('max_price', '')} />}
            </div>
            <Button variant="ghost" size="sm" onClick={clearFilters}>Clear all</Button>
          </div>
        )}
      </Card>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mb-6">
          {error}
        </div>
      )}

      {loading && <LoadingGrid />}

      {!loading && !error && data.items.length === 0 && (
        <Card className="p-12 text-center">
          <h3 className="text-lg font-semibold text-gray-900">No products found</h3>
          <p className="mt-2 text-sm text-gray-600">
            Try adjusting your filters or search terms.
          </p>
          {hasFilters && (
            <Button variant="secondary" size="sm" className="mt-4" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </Card>
      )}

      {!loading && !error && data.items.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {data.items.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={page <= 1}
            onClick={() => updateParam('page', String(page - 1))}
          >
            Previous
          </Button>
          <span className="px-4 text-sm text-gray-600">
            Page <span className="font-medium text-gray-900">{page}</span> of {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => updateParam('page', String(page + 1))}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}

function ProductCard({ product }) {
  const inStock = product.is_unlimited_stock || product.stock > 0

  return (
    <Link
      to={`/products/${product.id}`}
      className="group block bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md hover:border-gray-300 transition-all"
    >
      <div className="h-72 bg-gray-50 flex items-center justify-center overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <span className="text-4xl font-bold text-gray-300 select-none">
            {product.name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-medium text-gray-900 truncate group-hover:text-brand-600 transition-colors">
          {product.name}
        </h3>
        <p className="mt-1 text-sm text-gray-500 line-clamp-2 min-h-[2.5rem]">
          {product.description || 'No description'}
        </p>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-lg font-semibold text-gray-900">
            ${Number(product.price).toFixed(2)}
          </span>
          <span className={`text-xs font-medium px-2 py-1 rounded ${
            inStock ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'
          }`}>
            {product.is_unlimited_stock
              ? 'In stock'
              : inStock
                ? `${product.stock} left`
                : 'Out of stock'}
          </span>
        </div>
      </div>
    </Link>
  )
}

function FilterPill({ label, onClear }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-md">
      {label}
      <button onClick={onClear} className="text-gray-500 hover:text-gray-700">×</button>
    </span>
  )
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg border border-gray-200 overflow-hidden animate-pulse">
          <div className="h-72 bg-gray-100" />
          <div className="p-4 space-y-3">
            <div className="h-4 bg-gray-100 rounded w-3/4" />
            <div className="h-3 bg-gray-100 rounded w-full" />
            <div className="h-3 bg-gray-100 rounded w-2/3" />
            <div className="h-5 bg-gray-100 rounded w-1/2 mt-3" />
          </div>
        </div>
      ))}
    </div>
  )
}