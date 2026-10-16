import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api, getGuestToken, ensureGuestToken } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { Button, Card } from '../components/ui'

export default function ProductDetail() {
  const { id } = useParams()
  const { user } = useAuth()

  const [product, setProduct] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)

  useEffect(() => {
    setLoading(true)
    api.get(`/products/${id}`)
      .then(setProduct)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  async function handleAddToCart() {
    setAdding(true)
    setError(null)
    try {
      const headers = {}
      if (!user) {
        let token = getGuestToken()
        if (!token) token = await ensureGuestToken()
        headers['X-Guest-Token'] = token
      }
      await api.addToCart(product.id, quantity, headers)
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

  const inStock = product.is_unlimited_stock || product.stock > 0
  const maxQty = product.is_unlimited_stock ? undefined : product.stock

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
              inStock ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'
            }`}>
              {product.is_unlimited_stock
                ? 'In stock (unlimited)'
                : inStock
                  ? `${product.stock} in stock`
                  : 'Out of stock'}
            </span>
          </div>

          <p className="mt-6 text-gray-600 leading-relaxed">
            {product.description || 'No description available for this product.'}
          </p>

          {inStock ? (
            <div className="mt-8 space-y-4">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700">Quantity</label>
                <input
                  type="number"
                  min={1}
                  max={maxQty}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>

              <div className="flex items-center gap-3">
                <Button onClick={handleAddToCart} disabled={adding} size="lg">
                  {adding ? 'Adding...' : 'Add to cart'}
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