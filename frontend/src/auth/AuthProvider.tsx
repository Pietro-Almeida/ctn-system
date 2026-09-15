import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AuthContext } from './auth-context'
import type { AuthStatus, AuthUser } from './auth.types'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
const TOKEN_KEY = 'ctn:access-token'

interface AuthProviderProps {
  children: ReactNode
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(() =>
    sessionStorage.getItem(TOKEN_KEY),
  )

  const clearSession = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
    setStatus('unauthenticated')
  }, [])

  const establishSession = useCallback(
    (newToken: string, authenticatedUser: AuthUser) => {
      sessionStorage.setItem(TOKEN_KEY, newToken)
      setToken(newToken)
      setUser(authenticatedUser)
      setStatus('authenticated')
    },
    [],
  )

  useEffect(() => {
    if (!token) {
      setStatus('unauthenticated')
      return
    }

    const controller = new AbortController()

    async function validateSession() {
      try {
        const response = await fetch(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        })

        if (!response.ok) {
          clearSession()
          return
        }

        const authenticatedUser = (await response.json()) as AuthUser
        setUser(authenticatedUser)
        setStatus('authenticated')
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
        clearSession()
      }
    }

    void validateSession()
    return () => controller.abort()
  }, [clearSession, token])

  const value = useMemo(
    () => ({ status, user, token, establishSession, clearSession }),
    [clearSession, establishSession, status, token, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
