import { api } from './client'

export async function uploadImage(file) {
  const sig = await api.get('/uploads/signature')

  const formData = new FormData()
  formData.append('file', file)
  formData.append('api_key', sig.api_key)
  formData.append('timestamp', sig.timestamp)
  formData.append('signature', sig.signature)
  formData.append('folder', sig.folder)

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${sig.cloud_name}/image/upload`,
    { method: 'POST', body: formData }
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || 'Upload failed')
  }

  const data = await res.json()
  return data.secure_url
}