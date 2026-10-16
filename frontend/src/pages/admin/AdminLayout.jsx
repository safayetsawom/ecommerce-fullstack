import { NavLink, Outlet } from 'react-router-dom'

export default function AdminLayout() {
  const tabStyle = ({ isActive }) => ({
    padding: '8px 16px',
    background: isActive ? '#0066cc' : '#fff',
    color: isActive ? '#fff' : '#222',
    borderRadius: 4,
    textDecoration: 'none',
    border: '1px solid #ccc',
  })

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <h1>Admin</h1>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <NavLink to="/admin/products" style={tabStyle}>Products</NavLink>
        <NavLink to="/admin/categories" style={tabStyle}>Categories</NavLink>
        <NavLink to="/admin/orders" style={tabStyle}>Orders</NavLink>
      </div>
      <Outlet />
    </div>
  )
}