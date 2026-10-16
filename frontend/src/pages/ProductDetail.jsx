import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { getGuestToken, ensureGuestToken } from '../api/client'

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
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
        // Guests need a token
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

  if (loading) return <p style={{ padding: 24 }}>Loading...</p>
  if (error && !product) return <p style={{ padding: 24, color: 'red' }}>{error}</p>
  if (!product) return null

  const inStock = product.is_unlimited_stock || product.stock > 0

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <Link to="/products">← Back to products</Link>
      <div style={{ background: '#fff', padding: 24, borderRadius: 6, marginTop: 16 }}>
        <h1 style={{ marginTop: 0 }}>{product.name}</h1>
        <p style={{ color: '#555' }}>{product.description || 'No description'}</p>
        <p style={{ fontSize: 24, fontWeight: 'bold' }}>${Number(product.price).toFixed(2)}</p>
        <p style={{ color: inStock ? '#080' : '#c00' }}>
          {product.is_unlimited_stock
            ? 'In stock (unlimited)'
            : inStock
            ? `${product.stock} in stock`
            : 'Out of stock'}
        </p>

        {inStock && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 20 }}>
            <label>Quantity:</label>
            <input
              type="number"
              min={1}
              max={product.is_unlimited_stock ? undefined : product.stock}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              style={{ padding: 8, width: 80 }}
            />
            <button
              onClick={handleAddToCart}
              disabled={adding}
              style={{ padding: '10px 20px' }}
            >
              {adding ? 'Adding...' : 'Add to cart'}
            </button>
            {added && <span style={{ color: '#080' }}>Added!</span>}
          </div>
        )}

        {error && <p style={{ color: 'red', marginTop: 12 }}>{error}</p>}
      </div>
    </div>
  )
}