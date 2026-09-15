import { useState, type FormEvent } from 'react'
import { changePassword } from '../api/profile'
import { useAuth } from '../auth/auth-context'
import './ProfilePage.css'

const roleLabels: Record<string, string> = {
  ALUNO: 'Aluno',
  PROFESSOR: 'Professor',
  DIRECAO: 'Direção',
  COORDENACAO: 'Coordenação',
  SOE: 'SOE',
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'CT'
}

export default function ProfilePage() {
  const { user, token, clearSession } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [passwordChanged, setPasswordChanged] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setErrorMessage('')

    if (newPassword.length < 12) {
      setErrorMessage('A nova senha precisa ter pelo menos 12 caracteres')
      return
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('A confirmação não corresponde à nova senha')
      return
    }
    if (!token) return

    setSubmitting(true)
    try {
      await changePassword(token, currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordChanged(true)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Não foi possível alterar a senha')
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) return null

  return (
    <main className="profile-page">
      <header>
        <h1>Meu perfil</h1>
        <p>Consulte seus dados e mantenha sua conta protegida.</p>
      </header>

      <section className="profile-identity">
        <div className="profile-avatar">{initials(user.nome)}</div>
        <div><h2>{user.nome}</h2><span>{roleLabels[user.role] ?? user.role}</span></div>
      </section>

      <div className="profile-layout">
        <section className="profile-card">
          <header><div className="profile-card__icon" aria-hidden="true">♙</div><div><h2>Informações da conta</h2><p>Dados fornecidos pelo cadastro institucional.</p></div></header>
          <dl>
            <div><dt>Nome completo</dt><dd>{user.nome}</dd></div>
            <div><dt>E-mail institucional</dt><dd>{user.email}</dd></div>
            <div><dt>Tipo de acesso</dt><dd>{roleLabels[user.role] ?? user.role}</dd></div>
            <div><dt>Identificador</dt><dd>#{user.id}</dd></div>
          </dl>
          <p className="profile-note">Para corrigir nome, e-mail ou vínculo, procure a Direção. Esses dados não podem ser alterados pelo navegador.</p>
        </section>

        <section className="profile-card profile-security">
          <header><div className="profile-card__icon" aria-hidden="true">◆</div><div><h2>Segurança</h2><p>Altere sua senha de acesso.</p></div></header>

          {passwordChanged ? (
            <div className="profile-success" role="status">
              <strong>Senha alterada com sucesso</strong>
              <p>Por segurança, suas sessões anteriores foram encerradas.</p>
              <button type="button" onClick={clearSession}>Entrar novamente</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <label>Senha atual<input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required maxLength={128} /></label>
              <label>Nova senha<small>Mínimo de 12 caracteres</small><input type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required minLength={12} maxLength={128} /></label>
              <label>Confirmar nova senha<input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required minLength={12} maxLength={128} /></label>
              {errorMessage ? <p className="profile-error" role="alert">{errorMessage}</p> : null}
              <button type="submit" disabled={submitting}>{submitting ? 'Alterando...' : 'Alterar senha'}</button>
            </form>
          )}
        </section>
      </div>
    </main>
  )
}
