import { useAuth } from '../context/AuthContext'

export default function Home() {
  const { user } = useAuth()

  return (
    <div style={{ padding: 40 }}>
      <h1>E-Commerce Frontend</h1>
      {user ? (
        <p>Welcome, <strong>{user.email}</strong>! Role: {user.role}</p>
      ) : (
        <p>You are browsing as a guest.</p>
      )}
    </div>
  )
}