import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/auth-context'
import type { UserRole } from '../auth/auth.types'

interface ProtectedRouteProps {
  allowedRoles: UserRole[]
}

export default function ProtectedRoute({
  allowedRoles,
}: ProtectedRouteProps) {
  const { status, user } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return (
      <main className="route-feedback" aria-live="polite">
        <div className="route-feedback__spinner" />
        <p>Verificando sua sessão...</p>
      </main>
    )
  }

  if (status === 'unauthenticated' || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/acesso-negado" replace />
  }

  return <Outlet />
}
