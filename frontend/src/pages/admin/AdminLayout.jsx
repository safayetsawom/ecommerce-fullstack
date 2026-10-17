import { NavLink, Outlet } from 'react-router-dom'

export default function AdminLayout() {
  const tabClass = ({ isActive }) =>
    `px-4 py-2 text-sm font-medium rounded-md transition-colors ${
      isActive
        ? 'bg-brand-600 text-white'
        : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
    }`

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your store — products, categories, and orders.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        <NavLink to="/admin/products" className={tabClass}>Products</NavLink>
        <NavLink to="/admin/categories" className={tabClass}>Categories</NavLink>
        <NavLink to="/admin/orders" className={tabClass}>Orders</NavLink>
      </div>

      <Outlet />
    </div>
  )
}