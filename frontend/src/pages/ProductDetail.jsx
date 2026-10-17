import { useEffect, useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api, getGuestToken, ensureGuestToken } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { Button, Card } from '../components/ui'

export default function ProductDetail() {
  const { id } = useParams()
  const { user } = useAuth()

  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)

  // selectedValues: { [optionId]: optionValueId }
  const [selectedValues, setSelectedValues] = useState({})

  useEffect(() => {
    setLoading(true)
    api.get(`/products/${id}`)
      .then((p) => {
        setProduct(p)
        // Pre-select any option that has exactly one value
        const pre = {}
        for (const opt of p.options || []) {
          if (opt.values.length === 1) pre[opt.id] = opt.values[0].id
        }
        setSelectedValues(pre)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  // Compute which variant matches the current selection
  const selectedVariant = useMemo(() => {
    if (!product) return null
    const options = product.options || []
    if (options.length === 0) {
      return product.variants?.[0] || null
    }
    // Every option must have a selection
    const allChosen = options.every((opt) => selectedValues[opt.id])
    if (!allChosen) return null

    // Find the variant whose values match the selected option-value ids
    return (
      product.variants.find((v) => {
        // v has options_text like "M / Black" — but we can't match on text
        // Since ProductVariantOut doesn't return the option value ids, match by label.
        // Build the expected label from the selection in option order.
        return true  // placeholder, replaced below
      }) || null
    )
  }, [product, selectedValues])

  // Simpler, robust matching: rebuild each variant's label from its options_text,
  // and rebuild the expected label from the current selection.
  const expectedLabel = useMemo(() => {
    if (!product) return null
    const options = [...(product.options || [])].sort((a, b) => a.position - b.position)
    const parts = []
    for (const opt of options) {
      const valId = selectedValues[opt.id]
      if (!valId) return null
      const val = opt.values.find((v) => v.id === valId)
      if (!val) return null
      parts.push(val.value)
    }
    return parts.length ? parts.join(' / ') : 'Default'
  }, [product, selectedValues])

  const matchedVariant = useMemo(() => {
    if (!product || !expectedLabel) return null
    return product.variants.find((v) => v.options_text === expectedLabel) || null
  }, [product, expectedLabel])

  async function handleAddToCart() {
    if (!matchedVariant) return
    setAdding(true)
    setError(null)
    try {
      const headers = {}
      if (!user) {
        let token = getGuestToken()
        if (!token) token = await ensureGuestToken()
        headers['X-Guest-Token'] = token
      }
      await api.post('/cart/items', {
        variant_id: matchedVariant.id,
        quantity,
      }, headers)
      window.dispatchEvent(new Event('cart-updated'))
      setAdded(true)
      setTimeout(() => setAdded(false), 2000)
    } catch (err) {
      setError(err.message)
    } finally {
      setAdding(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-pulse">
          <div className="h-[600px] bg-gray-100 rounded-lg" />
          <div className="space-y-4">
            <div className="h-8 bg-gray-100 rounded w-3/4" />
            <div className="h-4 bg-gray-100 rounded w-1/2" />
            <div className="h-24 bg-gray-100 rounded" />
            <div className="h-10 bg-gray-100 rounded w-1/3" />
          </div>
        </div>
      </div>
    )
  }

  if (error && !product) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <Card className="p-12">
          <h2 className="text-lg font-semibold text-gray-900">Product not found</h2>
          <p className="mt-2 text-sm text-gray-600">{error}</p>
          <Link to="/products">
            <Button variant="secondary" size="sm" className="mt-6">Back to products</Button>
          </Link>
        </Card>
      </div>
    )
  }

  if (!product) return null

  const options = [...(product.options || [])].sort((a, b) => a.position - b.position)
  const variants = product.variants || []

  // Total stock across all variants — used for "in stock" badge
  const totalStock = variants.reduce((sum, v) => sum + v.stock, 0)
  const anyInStock = product.is_unlimited_stock || totalStock > 0

  // Current selection status
  const allChosen = options.every((opt) => selectedValues[opt.id])
  const variantAvailable = matchedVariant && (product.is_unlimited_stock || matchedVariant.stock > 0)

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link
        to="/products"
        className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
      >
        ← Back to products
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="h-[600px] bg-gray-50 rounded-lg flex items-center justify-center border border-gray-200 overflow-hidden">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-contain"
            />
          ) : (
            <span className="text-8xl font-bold text-gray-200 select-none">
              {product.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        <div>
          <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>

          <div className="mt-4 flex items-center gap-3">
            <span className="text-3xl font-semibold text-gray-900">
              ${Number(product.price).toFixed(2)}
            </span>
            <span className={`text-xs font-medium px-2 py-1 rounded ${
              anyInStock ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'
            }`}>
              {product.is_unlimited_stock
                ? 'In stock (unlimited)'
                : anyInStock
                  ? `${totalStock} available`
                  : 'Out of stock'}
            </span>
          </div>

          <p className="mt-6 text-gray-600 leading-relaxed">
            {product.description || 'No description available for this product.'}
          </p>

          {anyInStock ? (
            <div className="mt-8 space-y-6">
              {options.map((opt) => (
                <div key={opt.id}>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    {opt.name}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {opt.values.map((val) => {
                      const isSelected = selectedValues[opt.id] === val.id
                      return (
                        <button
                          key={val.id}
                          type="button"
                          onClick={() =>
                            setSelectedValues((prev) => ({ ...prev, [opt.id]: val.id }))
                          }
                          className={`min-w-[44px] px-4 py-2 text-sm font-medium rounded-md border transition-colors ${
                            isSelected
                              ? 'bg-brand-600 text-white border-brand-600'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          {val.value}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}

              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700">Quantity</label>
                <input
                  type="number"
                  min={1}
                  max={matchedVariant && !product.is_unlimited_stock ? matchedVariant.stock : undefined}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  disabled={!matchedVariant}
                />
              </div>

              {!allChosen && options.length > 0 && (
                <p className="text-sm text-gray-500">
                  Please choose {options.filter((o) => !selectedValues[o.id]).map((o) => o.name).join(', ')}.
                </p>
              )}

              {allChosen && !variantAvailable && (
                <p className="text-sm text-red-600">
                  This combination is out of stock.
                </p>
              )}

              <div className="flex items-center gap-3">
                <Button
                  onClick={handleAddToCart}
                  disabled={adding || !variantAvailable}
                  size="lg"
                >
                  {adding
                    ? 'Adding...'
                    : !allChosen
                      ? 'Select options'
                      : !variantAvailable
                        ? 'Out of stock'
                        : 'Add to cart'}
                </Button>
                {added && (
                  <span className="text-sm font-medium text-green-700">
                    ✓ Added to cart
                  </span>
                )}
              </div>

              <Link to="/cart">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                  Go to cart
                </Button>
              </Link>
            </div>
          ) : (
            <div className="mt-8 rounded-md bg-gray-50 border border-gray-200 p-4 text-sm text-gray-600">
              This product is currently out of stock.
            </div>
          )}

          {error && product && (
            <div className="mt-4 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}