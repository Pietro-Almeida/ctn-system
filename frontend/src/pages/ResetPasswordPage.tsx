import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { resetPassword } from '../api/profile'
import './ResetPasswordPage.css'

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const [code, setCode] = useState(() => searchParams.get('codigo')?.trim() ?? '')
  const [newPassword, setNewPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setErrorMessage('')
    const normalizedCode = code.trim()
    if (!TOKEN_PATTERN.test(normalizedCode)) return setErrorMessage('Informe o código completo fornecido pela Direção')
    if (newPassword.length < 12) return setErrorMessage('A nova senha precisa ter pelo menos 12 caracteres')
    if (newPassword !== confirmation) return setErrorMessage('A confirmação não corresponde à nova senha')
    if (submitting) return

    setSubmitting(true)
    try {
      await resetPassword(normalizedCode, newPassword)
      setCode('')
      setNewPassword('')
      setConfirmation('')
      setCompleted(true)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Não foi possível redefinir a senha')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="reset-page">
      <section className="reset-intro" aria-label="Recuperação de acesso CTN System">
        <div className="reset-brand">CTN<span /></div>
        <div><p>CEMTN · TAGUATINGA NORTE</p><h1>Recupere seu acesso com segurança.</h1><span>O código é temporário, só pode ser utilizado uma vez e deve ser mantido em sigilo.</span></div>
        <small>Centro de Ensino Médio de Taguatinga Norte</small>
      </section>

      <section className="reset-access">
        <div className="reset-card">
          <div className="reset-mobile-brand"><div className="reset-brand reset-brand--dark">CTN<span /></div><strong>CTN System</strong></div>
          {completed ? (
            <div className="reset-success" role="status">
              <span>✓</span><h1>Senha redefinida</h1><p>Sua nova senha já está ativa e todas as sessões anteriores foram encerradas.</p><Link to="/login">Entrar no sistema</Link>
            </div>
          ) : (
            <>
              <p className="reset-eyebrow">RECUPERAÇÃO DE CONTA</p>
              <h1>Redefinir senha</h1>
              <p className="reset-subtitle">Solicite um código à Direção da escola e informe-o abaixo.</p>
              <form onSubmit={handleSubmit}>
                <label>Código de recuperação<input value={code} onChange={(event) => setCode(event.target.value)} autoComplete="one-time-code" maxLength={43} placeholder="Cole o código de 43 caracteres" required /></label>
                <label>Nova senha <small>Mínimo de 12 caracteres</small><div><input type={showPassword ? 'text' : 'password'} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" minLength={12} maxLength={128} required /><button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>{showPassword ? 'Ocultar' : 'Mostrar'}</button></div></label>
                <label>Confirmar nova senha<input type={showPassword ? 'text' : 'password'} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" minLength={12} maxLength={128} required /></label>
                {errorMessage ? <p className="reset-error" role="alert">{errorMessage}</p> : null}
                <button className="reset-submit" type="submit" disabled={submitting}>{submitting ? 'Redefinindo...' : 'Redefinir senha'}</button>
              </form>
              <Link className="reset-back" to="/login">← Voltar ao login</Link>
              <p className="reset-help">Não recebeu um código? Procure a Direção ou a secretaria da escola.</p>
            </>
          )}
        </div>
      </section>
    </main>
  )
}
