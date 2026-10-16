import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { api, getGuestToken } from '../api/client'
import { Button } from './ui'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [cartCount, setCartCount] = useState(0)

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

  const navLinkClass = ({ isActive }) =>
    `px-3 py-2 text-sm font-medium rounded-md transition-colors ${
      isActive
        ? 'text-brand-700 bg-brand-50'
        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
    }`

  return (
    <nav className="sticky top-0 z-40 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: logo + primary nav */}
          <div className="flex items-center gap-1">
            <Link to="/" className="flex items-center mr-4">
              <span className="text-lg font-bold text-gray-900">Shop</span>
            </Link>
            <NavLink to="/products" className={navLinkClass}>
              Products
            </NavLink>
          </div>

          {/* Right: cart + auth */}
          <div className="flex items-center gap-2">
            <NavLink to="/cart" className={navLinkClass}>
              Cart
              {cartCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-semibold text-white bg-brand-600 rounded-full">
                  {cartCount}
                </span>
              )}
            </NavLink>

            {user ? (
              <>
                <NavLink to="/orders/me" className={navLinkClass}>
                  My Orders
                </NavLink>
                {user.role === 'admin' && (
                  <NavLink to="/admin" className={navLinkClass}>
                    Admin
                  </NavLink>
                )}
                <div className="hidden sm:flex items-center gap-2 ml-2 pl-3 border-l border-gray-200">
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Signed in as</div>
                    <div className="text-sm font-medium text-gray-900">
                      {user.email}
                    </div>
                  </div>
                  <Button variant="secondary" size="sm" onClick={handleLogout}>
                    Logout
                  </Button>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleLogout}
                  className="sm:hidden"
                >
                  Logout
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-2 ml-2">
                <Link to="/login">
                  <Button variant="ghost" size="sm">Login</Button>
                </Link>
                <Link to="/register">
                  <Button variant="primary" size="sm">Register</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}