import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AuthContext } from './auth-context'
import type { AuthStatus, AuthUser } from './auth.types'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
const TOKEN_KEY = 'ctn:access-token'

interface AuthProviderProps {
  children: ReactNode
}

interface LoginResponse {
  access_token: string
  token_type: 'Bearer'
  expires_in: number
  user: AuthUser
}

interface ApiError {
  message?: string | string[]
}

async function getErrorMessage(response: Response) {
  try {
    const body = (await response.json()) as ApiError
    if (Array.isArray(body.message)) return body.message.join('. ')
    if (body.message) return body.message
  } catch {
    // A resposta pode não possuir um corpo JSON.
  }

  if (response.status === 401) return 'E-mail ou senha inválidos'
  if (response.status === 429) return 'Muitas tentativas. Aguarde um minuto'
  return 'Não foi possível entrar. Tente novamente'
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

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          senha: password,
        }),
      })

      if (!response.ok) {
        throw new Error(await getErrorMessage(response))
      }

      const session = (await response.json()) as LoginResponse
      establishSession(session.access_token, session.user)
      return session.user
    },
    [establishSession],
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
    () => ({ status, user, token, login, clearSession }),
    [clearSession, login, status, token, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
