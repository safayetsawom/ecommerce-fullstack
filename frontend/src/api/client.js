const BASE_URL = 'http://127.0.0.1:8000'

export function getToken() {
  return localStorage.getItem('token')
}

export function setToken(token) {
  if (token) localStorage.setItem('token', token)
  else localStorage.removeItem('token')
}

export function getGuestToken() {
  return localStorage.getItem('guest_token')
}

export function setGuestToken(token) {
  if (token) localStorage.setItem('guest_token', token)
  else localStorage.removeItem('guest_token')
}

export async function ensureGuestToken() {
  const existing = getGuestToken()
  if (existing) return existing
  const res = await fetch(`${BASE_URL}/cart/guest`, { method: 'POST' })
  const data = await res.json()
  setGuestToken(data.guest_token)
  return data.guest_token
}

export async function apiFetch(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }

  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })

  if (res.status === 204) return null

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    const detail = data?.detail
    let message = 'Request failed'
    if (typeof detail === 'string') message = detail
    else if (Array.isArray(detail)) message = detail.map((d) => d.msg).join(', ')
    throw new Error(message)
  }

  return data
}

export const api = {
  get: (path, headers) => apiFetch(path, { headers }),
  post: (path, body, headers) => apiFetch(path, { method: 'POST', body: JSON.stringify(body), headers }),
  patch: (path, body, headers) => apiFetch(path, { method: 'PATCH', body: JSON.stringify(body), headers }),
  del: (path, headers) => apiFetch(path, { method: 'DELETE', headers }),

  // Convenience: add to cart (auto guest header if no auth)
  addToCart: async (productId, quantity, extraHeaders = {}) => {
    return api.post('/cart/items', { product_id: productId, quantity }, extraHeaders)
  },
}