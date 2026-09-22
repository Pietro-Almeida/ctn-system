import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import ThemeToggle from '../components/ThemeToggle'
import { registerStudent } from '../api/registration'
import { formatCpf, isValidCpf, normalizeCpf } from '../utils/cpf'
import './RegisterStudentPage.css'

export default function RegisterStudentPage() {
  const [nome, setNome] = useState('')
  const [cpf, setCpf] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const cpfOk = useMemo(() => normalizeCpf(cpf).length === 11 && isValidCpf(cpf), [cpf])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (nome.trim().length < 2) return setError('Informe seu nome completo')
    if (!cpfOk) return setError('Informe um CPF válido')
    if (senha.length < 12) return setError('A senha precisa ter pelo menos 12 caracteres')
    if (senha !== confirmacao) return setError('As senhas não coincidem')

    setSubmitting(true)
    try {
      await registerStudent({ nome: nome.trim(), cpf: normalizeCpf(cpf), senha })
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar seu cadastro')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="student-register-page">
      <section className="student-register-brand">
        <div className="ctn-logo ctn-logo--light">CEMTN<span /></div>
        <div>
          <p className="login-eyebrow">PRIMEIRO ACESSO</p>
          <h1>Seu acesso começa aqui.</h1>
          <p>Cadastre seus dados. A Direção confirma seu vínculo com a escola antes de liberar o acesso.</p>
        </div>
        <small>Centro de Ensino Médio de Taguatinga Norte</small>
      </section>

      <section className="student-register-form">
        <ThemeToggle className="theme-toggle--public" />
        <div className="student-register-card">
          {done ? (
            <div className="register-success">
              <span>✓</span>
              <p className="login-eyebrow">CADASTRO ENVIADO</p>
              <h2>Agora é com a Direção.</h2>
              <p>Seus dados foram recebidos e estão aguardando validação. Assim que seu cadastro for aprovado, você poderá entrar com CPF e senha.</p>
              <Link to="/login">Voltar para o login</Link>
            </div>
          ) : (
            <>
              <p className="login-eyebrow">CRIAR CONTA DE ALUNO</p>
              <h2>Dados de acesso</h2>
              <p className="register-subtitle">Use seu CPF real. Ele será validado antes do envio.</p>
              <form onSubmit={handleSubmit}>
                {error ? <p className="register-error" role="alert">{error}</p> : null}
                <label>Nome completo<input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={120} autoComplete="name" placeholder="Seu nome completo" required /></label>
                <label>CPF<div className={cpfOk ? 'cpf-field cpf-field--valid' : 'cpf-field'}><input value={cpf} onChange={(e) => setCpf(formatCpf(e.target.value))} inputMode="numeric" autoComplete="off" placeholder="000.000.000-00" required />{cpfOk ? <span>✓</span> : null}</div><small>{normalizeCpf(cpf).length === 11 ? (cpfOk ? 'CPF válido' : 'CPF inválido') : 'Somente CPFs com dígitos verificadores válidos são aceitos.'}</small></label>
                <div className="register-passwords">
                  <label>Senha<input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} minLength={12} maxLength={128} autoComplete="new-password" placeholder="Mínimo de 12 caracteres" required /></label>
                  <label>Confirmar senha<input type="password" value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} minLength={12} maxLength={128} autoComplete="new-password" placeholder="Repita a senha" required /></label>
                </div>
                <div className="register-privacy">Seu CPF será usado para identificar sua conta e evitar cadastros duplicados. O acesso só é liberado após aprovação da Direção.</div>
                <button type="submit" disabled={submitting}>{submitting ? 'Enviando...' : 'Enviar cadastro para aprovação'}</button>
              </form>
              <p className="register-back">Já possui acesso? <Link to="/login">Entrar</Link></p>
            </>
          )}
        </div>
      </section>
    </main>
  )
}
