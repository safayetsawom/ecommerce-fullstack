import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Button, Card } from '../components/ui'

export default function Home() {
  const { user } = useAuth()

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center max-w-3xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900">
          Shop the essentials
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          A clean, fast storefront with real inventory, real orders, and a
          backend that keeps them in sync.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link to="/products">
            <Button size="lg">Browse products</Button>
          </Link>
          {!user && (
            <Link to="/register">
              <Button variant="secondary" size="lg">Create account</Button>
            </Link>
          )}
        </div>
      </div>

      {user && (
        <Card className="mt-16 max-w-2xl mx-auto p-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Welcome back, {user.full_name || user.email}
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Signed in as <span className="font-medium">{user.email}</span>
            {' '}· Role: <span className="font-medium">{user.role}</span>
          </p>
          <div className="mt-4 flex gap-3">
            <Link to="/products">
              <Button variant="secondary" size="sm">Shop now</Button>
            </Link>
            <Link to="/orders/me">
              <Button variant="ghost" size="sm">View my orders</Button>
            </Link>
          </div>
        </Card>
      )}

      <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900">Real inventory</h3>
          <p className="mt-2 text-sm text-gray-600">
            Stock decrements atomically on every checkout. No overselling, no
            stale carts.
          </p>
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900">Guest checkout</h3>
          <p className="mt-2 text-sm text-gray-600">
            No account? Order anyway. Retrieve your confirmation by unique link.
          </p>
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900">Admin tools</h3>
          <p className="mt-2 text-sm text-gray-600">
            Manage products, categories, and order statuses from one dashboard.
          </p>
        </Card>
      </div>
    </div>
  )
}