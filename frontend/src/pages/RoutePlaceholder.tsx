import { Link } from 'react-router-dom'
import { useAuth } from '../auth/auth-context'

interface RoutePlaceholderProps {
  title: string
  description: string
}

export default function RoutePlaceholder({
  title,
  description,
}: RoutePlaceholderProps) {
  const { user, clearSession } = useAuth()

  return (
    <main className="placeholder-page">
      <div className="placeholder-page__brand">CTN<span /></div>
      <p className="placeholder-page__eyebrow">{user?.role}</p>
      <h1>{title}</h1>
      <p>{description}</p>
      <div className="placeholder-page__actions">
        <Link to="/">Voltar ao início</Link>
        <button type="button" onClick={clearSession}>Sair</button>
      </div>
    </main>
  )
}
