import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getUser, updateUser, type CreateUserRole, type SystemUser } from '../../api/users'
import { useAuth } from '../../auth/auth-context'
import './DirectorEditUserPage.css'

type IconName = 'user' | 'shield' | 'check' | 'info' | 'refresh'
const profiles: { value: CreateUserRole; label: string }[] = [
  { value: 'DIRECAO', label: 'Diretor' }, { value: 'PROFESSOR', label: 'Professor' }, { value: 'ALUNO', label: 'Aluno' },
]
const permissions: Record<CreateUserRole, string[]> = {
  DIRECAO: ['Gerenciar usuários', 'Criar e gerenciar publicações', 'Criar e moderar comunidades', 'Acessar todas as áreas administrativas'],
  PROFESSOR: ['Criar publicações no Jornal', 'Criar e administrar comunidades', 'Interagir com estudantes'],
  ALUNO: ['Visualizar o Jornal', 'Participar de comunidades', 'Publicar e comentar nas comunidades'],
}
function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    user: <><circle cx="12" cy="8" r="3" /><path d="M6 20a6 6 0 0 1 12 0" /></>,
    shield: <path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6z" />,
    check: <path d="m5 12 4 4L19 6" />,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
    refresh: <><path d="M20 7h-5V2" /><path d="M20 7a8 8 0 1 0 1 7" /></>,
  }
  return <svg className="edit-user-icon" viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>
}
function initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'CT' }

export default function DirectorEditUserPage() {
  const { usuarioId } = useParams()
  const id = Number(usuarioId)
  const { token, user: authenticatedUser, clearSession } = useAuth()
  const navigate = useNavigate()
  const [original, setOriginal] = useState<SystemUser | null>(null)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<CreateUserRole>('ALUNO')
  const [ativo, setAtivo] = useState(true)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const load = useCallback(async (signal?: AbortSignal) => {
    if (!token || !Number.isInteger(id) || id <= 0) { setErrorMessage('O endereço deste usuário é inválido'); setLoading(false); return }
    setLoading(true)
    try {
      const data = await getUser(id, token, signal)
      setOriginal(data); setNome(data.nome); setEmail(data.email); setRole(data.role as CreateUserRole); setAtivo(data.ativo); setErrorMessage('')
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      const message = error instanceof Error ? error.message : 'Não foi possível carregar o usuário'
      if (message === 'Sua sessão expirou') clearSession(); else setErrorMessage(message)
    } finally { if (!signal?.aborted) setLoading(false) }
  }, [clearSession, id, token])

  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort() }, [load])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!token || !original || submitting) return
    if (nome.trim().length < 2) return setErrorMessage('Informe o nome completo')
    setSubmitting(true); setErrorMessage('')
    try {
      await updateUser(id, { nome: nome.trim(), email: email.trim(), role, ativo }, token)
      if (id === authenticatedUser?.id) clearSession()
      else navigate('/diretor/usuarios', { replace: true, state: { userUpdated: true } })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível atualizar o usuário'
      if (message === 'Sua sessão expirou') clearSession(); else setErrorMessage(message)
    } finally { setSubmitting(false) }
  }

  if (loading) return <main className="edit-user-feedback" aria-live="polite"><span /><p>Carregando usuário...</p></main>
  if (!original) return <main className="edit-user-feedback"><h1>Não foi possível abrir o usuário</h1><p>{errorMessage}</p><Link to="/diretor/usuarios">Voltar aos usuários</Link></main>
  const isSelf = original.id === authenticatedUser?.id

  return (
    <main className="edit-user-page">
      <nav><Link to="/diretor/usuarios">Usuários</Link><span>/</span><span>Editar usuário</span></nav>
      <header><h1>Editar usuário</h1><p>Atualize os dados e as permissões de acesso ao CTN System.</p></header>

      <section className="edit-user-summary"><span>{initials(original.nome)}</span><div><strong>{original.nome}</strong><small>{original.email}</small></div><i className={original.ativo ? 'active' : ''}>{original.ativo ? 'Ativo' : 'Inativo'}</i></section>

      <form onSubmit={handleSubmit}>
        <div className="edit-user-form">
          <section><h2>Dados do usuário</h2><label>Nome completo <b>*</b><input value={nome} onChange={(event) => setNome(event.target.value)} maxLength={120} required /></label><label>E-mail institucional <b>*</b><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} required /></label></section>
          <section>
            <h2>Acesso ao sistema</h2>
            <fieldset disabled={isSelf}><legend>Perfil de acesso <b>*</b></legend>{profiles.map((profile) => <label key={profile.value}><input type="radio" name="role" checked={role === profile.value} onChange={() => setRole(profile.value)} /><span />{profile.label}</label>)}</fieldset>
            <label className="edit-user-status">Situação<select value={ativo ? 'ACTIVE' : 'INACTIVE'} onChange={(event) => setAtivo(event.target.value === 'ACTIVE')} disabled={isSelf}><option value="ACTIVE">Ativo</option><option value="INACTIVE">Inativo</option></select></label>
            {isSelf ? <div className="edit-user-warning"><Icon name="info" /><p>Seu perfil e sua situação não podem ser alterados nesta tela. Mudanças nos seus próprios dados encerrarão a sessão para uma nova autenticação.</p></div> : null}
          </section>
        </div>

        <aside className="edit-user-permissions"><header><span><Icon name="shield" /></span><div><h2>Permissões atuais</h2><strong>{profiles.find((profile) => profile.value === role)?.label}</strong></div></header><ul>{permissions[role].map((permission) => <li key={permission}><span><Icon name="check" /></span>{permission}</li>)}</ul><div><Icon name="info" /><p>As permissões são definidas no servidor a partir do perfil, não por controles visuais.</p></div></aside>

        {errorMessage ? <p className="edit-user-error" role="alert">{errorMessage}</p> : null}
        <footer><Link to="/diretor/usuarios">Cancelar</Link><button type="submit" disabled={submitting}>{submitting ? 'Salvando...' : 'Salvar alterações'}</button></footer>
      </form>
    </main>
  )
}
