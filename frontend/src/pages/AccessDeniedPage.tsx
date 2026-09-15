import { Link } from 'react-router-dom'

export default function AccessDeniedPage() {
  return (
    <main className="placeholder-page">
      <p className="placeholder-page__eyebrow">ERRO 403</p>
      <h1>Acesso não autorizado</h1>
      <p>Seu perfil não possui permissão para acessar esta área.</p>
      <div className="placeholder-page__actions">
        <Link to="/">Voltar para minha área</Link>
      </div>
    </main>
  )
}
