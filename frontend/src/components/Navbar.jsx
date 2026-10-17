import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { api, getGuestToken } from '../api/client'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [cartCount, setCartCount] = useState(0)

  // Reload cart count whenever auth state changes, and listen for a custom "cart-updated" event
  useEffect(() => {
    async function loadCart() {
      try {
        const headers = {}
        if (!user) {
          const gt = getGuestToken()
          if (gt) headers['X-Guest-Token'] = gt
        }
        const data = await api.get('/cart/', headers)
        setCartCount(data.total_items)
      } catch {
        setCartCount(0)
      }
    }
    loadCart()
    window.addEventListener('cart-updated', loadCart)
    return () => window.removeEventListener('cart-updated', loadCart)
  }, [user])

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <nav style={{
      display: 'flex',
      gap: 16,
      padding: '12px 24px',
      background: '#fff',
      borderBottom: '1px solid #ddd',
      alignItems: 'center',
    }}>
      <Link to="/"><strong>Shop</strong></Link>
      <Link to="/products">Products</Link>
      <Link to="/cart">Cart {cartCount > 0 && `(${cartCount})`}</Link>
      <div style={{ flex: 1 }} />
      {user ? (
        <>
          <Link to="/orders/me">My Orders</Link>
          <span>{user.email} ({user.role})</span>
          {user.role === 'admin' && <Link to="/admin">Admin</Link>}
          <button onClick={handleLogout}>Logout</button>
        </>
      ) : (
        <>
          <Link to="/login">Login</Link>
          <Link to="/register">Register</Link>
        </>
      )}
    </nav>
  )
}