import { useAuth } from '@clerk/clerk-react'

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export function useAuthFetch() {
  const { getToken } = useAuth()
  return async (url, options = {}) => {
    const token = await getToken()
    return fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    })
  }
}
