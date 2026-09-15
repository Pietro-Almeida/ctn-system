import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/auth-context'

const homeByRole = {
  ALUNO: '/aluno/inicio',
  PROFESSOR: '/professor/inicio',
  DIRECAO: '/diretor/inicio',
} as const

export default function HomeRedirect() {
  const { status, user } = useAuth()

  if (status === 'loading') {
    return (
      <main className="route-feedback" aria-live="polite">
        <div className="route-feedback__spinner" />
        <p>Verificando sua sessão...</p>
      </main>
    )
  }

  if (!user || status === 'unauthenticated') {
    return <Navigate to="/login" replace />
  }

  const destination = homeByRole[user.role as keyof typeof homeByRole]
  return <Navigate to={destination ?? '/acesso-negado'} replace />
}
