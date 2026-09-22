import { useCallback, useDeferredValue, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { listUsers, updateUserStatus, type SystemUser } from '../../api/users'
import { useAuth } from '../../auth/auth-context'
import './DirectorUsersPage.css'

type RoleFilter = 'ALL' | 'DIRECAO' | 'PROFESSOR' | 'ALUNO'
type IconName = 'search' | 'plus' | 'more' | 'edit' | 'power' | 'users' | 'refresh'

const roles: { value: RoleFilter; label: string }[] = [
  { value: 'ALL', label: 'Todos' }, { value: 'DIRECAO', label: 'Diretores' },
  { value: 'PROFESSOR', label: 'Professores' }, { value: 'ALUNO', label: 'Alunos' },
]
const roleLabels: Record<string, string> = { ALUNO: 'Aluno', PROFESSOR: 'Professor', DIRECAO: 'Diretor' }

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
    edit: <><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="m13 7 4 4" /></>,
    power: <><path d="M12 2v10" /><path d="M18.4 5.6a8 8 0 1 1-12.8 0" /></>,
    users: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2M16 5a3 3 0 0 1 0 6M17 14a4 4 0 0 1 4 4v2" /></>,
    refresh: <><path d="M20 7h-5V2" /><path d="M20 7a8 8 0 1 0 1 7" /></>,
  }
  return <svg className="users-page-icon" viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>
}
function initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'CT' }
function formatDate(value: string) { return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)).replace('.', '') }

export default function DirectorUsersPage() {
  const { token, user: authenticatedUser, clearSession } = useAuth()
  const [users, setUsers] = useState<SystemUser[]>([])
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL')
  const [loading, setLoading] = useState(true)
  const [changingId, setChangingId] = useState<number | null>(null)
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async (signal?: AbortSignal) => {
    if (!token) return
    setLoading(true)
    try { setUsers(await listUsers(token, signal)); setErrorMessage('') }
    catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      const message = error instanceof Error ? error.message : 'Não foi possível carregar os usuários'
      if (message === 'Sua sessão expirou') clearSession()
      else setErrorMessage(message)
    } finally { if (!signal?.aborted) setLoading(false) }
  }, [clearSession, token])

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [load])

  const visibleUsers = useMemo(() => {
    const normalized = deferredQuery.trim().toLocaleLowerCase('pt-BR')
    return users.filter((item) => (roleFilter === 'ALL' || item.role === roleFilter) && (!normalized || item.nome.toLocaleLowerCase('pt-BR').includes(normalized) || item.email.toLocaleLowerCase('pt-BR').includes(normalized)))
  }, [deferredQuery, roleFilter, users])

  const counts = useMemo(() => ({
    total: users.length,
    directors: users.filter((item) => item.role === 'DIRECAO').length,
    teachers: users.filter((item) => item.role === 'PROFESSOR').length,
    students: users.filter((item) => item.role === 'ALUNO').length,
  }), [users])

  async function handleStatus(item: SystemUser) {
    if (!token || changingId !== null || item.id === authenticatedUser?.id) return
    if (!window.confirm(`Deseja realmente ${item.ativo ? 'desativar' : 'ativar'} o acesso de ${item.nome}?`)) return
    setChangingId(item.id); setOpenMenuId(null); setNotice(''); setErrorMessage('')
    try {
      const updated = await updateUserStatus(item.id, !item.ativo, token)
      setUsers((current) => current.map((entry) => entry.id === item.id ? updated : entry))
      setNotice(`${item.nome} foi ${updated.ativo ? 'ativado' : 'desativado'} com sucesso.`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível alterar o usuário'
      if (message === 'Sua sessão expirou') clearSession()
      else setErrorMessage(message)
    } finally { setChangingId(null) }
  }

  if (loading) return <main className="users-page-feedback" aria-live="polite"><span /><p>Carregando usuários...</p></main>
  if (errorMessage && !users.length) return <main className="users-page-feedback"><h1>Não foi possível abrir os usuários</h1><p>{errorMessage}</p><button type="button" onClick={() => void load()}><Icon name="refresh" /> Tentar novamente</button></main>

  return (
    <main className="director-users-page">
      <header className="users-page-heading"><div><h1>Gestão de Usuários</h1><p>Cadastre, consulte e gerencie os acessos ao CEMTN.</p></div><Link to="/diretor/usuarios/novo"><Icon name="plus" /> Cadastrar usuário</Link></header>

      <section className="users-page-stats" aria-label="Resumo dos usuários">
        <article><span>▤</span><div><small>Total de usuários</small><strong>{counts.total}</strong></div></article>
        <article><span><Icon name="users" /></span><div><small>Diretores</small><strong>{counts.directors}</strong></div></article>
        <article><span>⌂</span><div><small>Professores</small><strong>{counts.teachers}</strong></div></article>
        <article><span><Icon name="users" /></span><div><small>Alunos</small><strong>{counts.students}</strong></div></article>
      </section>

      <section className="users-page-content">
        <div className="users-page-toolbar">
          <label><span className="sr-only">Buscar usuário</span><Icon name="search" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome, e-mail ou matrícula..." /></label>
          <div role="tablist" aria-label="Filtrar usuários por perfil">{roles.map((role) => <button key={role.value} type="button" role="tab" aria-selected={roleFilter === role.value} className={roleFilter === role.value ? 'active' : ''} onClick={() => setRoleFilter(role.value)}>{role.label}</button>)}</div>
        </div>
        {errorMessage ? <p className="users-page-message users-page-message--error" role="alert">{errorMessage}</p> : null}
        {notice ? <p className="users-page-message" role="status">{notice}</p> : null}

        <div className="users-table-heading"><span>Usuário</span><span>Perfil</span><span>Matrícula</span><span>Status</span><span>Última atualização</span><span>Ação</span></div>
        <div className="users-list" aria-live="polite">
          {visibleUsers.length ? visibleUsers.map((item) => (
            <article key={item.id}>
              <div className="users-list__identity"><span>{initials(item.nome)}</span><div><strong>{item.nome}</strong><small>{item.email}</small></div></div>
              <div data-label="Perfil"><b>{roleLabels[item.role] ?? item.role}</b></div>
              <div data-label="Matrícula"><small>Não informada</small></div>
              <div data-label="Status"><i className={item.ativo ? 'active' : ''}><em />{item.ativo ? 'Ativo' : 'Inativo'}</i></div>
              <div data-label="Última atualização"><time dateTime={item.updatedAt}>{formatDate(item.updatedAt)}</time></div>
              <div className="users-actions">
                <button type="button" onClick={() => setOpenMenuId((current) => current === item.id ? null : item.id)} aria-expanded={openMenuId === item.id} aria-label={`Ações para ${item.nome}`}><Icon name="more" /></button>
                {openMenuId === item.id ? <div><Link to={`/diretor/usuarios/${item.id}/editar`}><Icon name="edit" /> Editar</Link><button type="button" onClick={() => void handleStatus(item)} disabled={item.id === authenticatedUser?.id || changingId !== null}><Icon name="power" /> {item.ativo ? 'Desativar' : 'Ativar'}</button></div> : null}
              </div>
            </article>
          )) : <div className="users-list-empty"><Icon name="users" /><h2>Nenhum usuário encontrado</h2><p>Ajuste a busca ou selecione outro perfil.</p></div>}
        </div>
        <footer>Mostrando {visibleUsers.length} de {users.length} usuários carregados</footer>
      </section>
    </main>
  )
}
