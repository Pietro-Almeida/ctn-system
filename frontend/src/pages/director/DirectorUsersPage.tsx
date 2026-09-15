import { useCallback, useDeferredValue, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { listUsers, updateUserStatus, type SystemUser } from '../../api/users'
import { useAuth } from '../../auth/auth-context'
import './DirectorUsersPage.css'

type RoleFilter = 'ALL' | 'ALUNO' | 'PROFESSOR' | 'DIRECAO'
type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE'
type IconName = 'search' | 'filter' | 'plus' | 'edit' | 'power' | 'users' | 'refresh'

const roleLabels: Record<string, string> = {
  ALUNO: 'Aluno',
  PROFESSOR: 'Professor',
  DIRECAO: 'Direção',
}

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    filter: <path d="M4 5h16l-6 7v6l-4 2v-8z" />,
    plus: <path d="M12 5v14M5 12h14" />,
    edit: <><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="m13 7 4 4" /></>,
    power: <><path d="M12 2v10" /><path d="M18.4 5.6a8 8 0 1 1-12.8 0" /></>,
    users: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2M16 5a3 3 0 0 1 0 6M17 14a4 4 0 0 1 4 4v2" /></>,
    refresh: <><path d="M20 7h-5V2" /><path d="M20 7a8 8 0 1 0 1 7" /></>,
  }
  return <svg className="users-page-icon" viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'CT'
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(value))
}

export default function DirectorUsersPage() {
  const { token, user: authenticatedUser, clearSession } = useAuth()
  const [users, setUsers] = useState<SystemUser[]>([])
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [loading, setLoading] = useState(true)
  const [changingId, setChangingId] = useState<number | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async (signal?: AbortSignal) => {
    if (!token) return
    setLoading(true)
    setErrorMessage('')
    try {
      setUsers(await listUsers(token, signal))
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      const message = error instanceof Error ? error.message : 'Não foi possível carregar os usuários'
      if (message === 'Sua sessão expirou') clearSession()
      else setErrorMessage(message)
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [clearSession, token])

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [load])

  const visibleUsers = useMemo(() => {
    const normalized = deferredQuery.trim().toLocaleLowerCase('pt-BR')
    return users.filter((item) => {
      const matchesQuery = !normalized ||
        item.nome.toLocaleLowerCase('pt-BR').includes(normalized) ||
        item.email.toLocaleLowerCase('pt-BR').includes(normalized)
      const matchesRole = roleFilter === 'ALL' || item.role === roleFilter
      const matchesStatus = statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' ? item.ativo : !item.ativo)
      return matchesQuery && matchesRole && matchesStatus
    })
  }, [deferredQuery, roleFilter, statusFilter, users])

  const counts = useMemo(() => ({
    total: users.length,
    active: users.filter((item) => item.ativo).length,
    students: users.filter((item) => item.role === 'ALUNO').length,
    teachers: users.filter((item) => item.role === 'PROFESSOR').length,
  }), [users])

  async function handleStatus(item: SystemUser) {
    if (!token || changingId !== null || item.id === authenticatedUser?.id) return
    const action = item.ativo ? 'desativar' : 'ativar'
    if (!window.confirm(`Deseja realmente ${action} o acesso de ${item.nome}?`)) return

    setChangingId(item.id)
    setNotice('')
    setErrorMessage('')
    try {
      const updated = await updateUserStatus(item.id, !item.ativo, token)
      setUsers((current) => current.map((entry) => entry.id === item.id ? updated : entry))
      setNotice(`${item.nome} foi ${updated.ativo ? 'ativado' : 'desativado'} com sucesso.`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível alterar o usuário'
      if (message === 'Sua sessão expirou') clearSession()
      else setErrorMessage(message)
    } finally {
      setChangingId(null)
    }
  }

  if (loading) {
    return <main className="users-page-feedback" aria-live="polite"><span /><p>Carregando usuários...</p></main>
  }

  if (errorMessage && users.length === 0) {
    return <main className="users-page-feedback"><h1>Não foi possível abrir os usuários</h1><p>{errorMessage}</p><button type="button" onClick={() => void load()}><Icon name="refresh" /> Tentar novamente</button></main>
  }

  return (
    <main className="director-users-page">
      <header className="users-page-heading">
        <div><h1>Gestão de usuários</h1><p>Gerencie os acessos de alunos, professores e integrantes da Direção.</p></div>
        <Link to="/diretor/usuarios/novo"><Icon name="plus" /> Cadastrar usuário</Link>
      </header>

      <section className="users-page-stats" aria-label="Resumo dos usuários">
        <article><small>Total cadastrado</small><strong>{counts.total}</strong></article>
        <article><small>Usuários ativos</small><strong>{counts.active}</strong></article>
        <article><small>Alunos</small><strong>{counts.students}</strong></article>
        <article><small>Professores</small><strong>{counts.teachers}</strong></article>
      </section>

      <section className="users-page-content">
        <div className="users-page-toolbar">
          <label className="users-search"><span className="sr-only">Buscar usuário</span><Icon name="search" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome ou e-mail..." /></label>
          <label><span className="sr-only">Filtrar por perfil</span><Icon name="filter" /><select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as RoleFilter)}><option value="ALL">Todos os perfis</option><option value="ALUNO">Alunos</option><option value="PROFESSOR">Professores</option><option value="DIRECAO">Direção</option></select></label>
          <label><span className="sr-only">Filtrar por situação</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}><option value="ALL">Todas as situações</option><option value="ACTIVE">Ativos</option><option value="INACTIVE">Inativos</option></select></label>
        </div>

        {errorMessage ? <p className="users-page-message users-page-message--error" role="alert">{errorMessage}</p> : null}
        {notice ? <p className="users-page-message" role="status">{notice}</p> : null}

        <div className="users-table-heading"><span>Usuário</span><span>Perfil</span><span>Cadastro</span><span>Situação</span><span>Ações</span></div>
        <div className="users-list" aria-live="polite">
          {visibleUsers.length ? visibleUsers.map((item) => (
            <article key={item.id}>
              <div className="users-list__identity"><span className="users-list__avatar">{initials(item.nome)}</span><div><strong>{item.nome}</strong><small>{item.email}</small></div></div>
              <div data-label="Perfil"><span className={`users-role users-role--${item.role.toLowerCase()}`}>{roleLabels[item.role] ?? item.role}</span></div>
              <div data-label="Cadastro"><time dateTime={item.createdAt}>{formatDate(item.createdAt)}</time></div>
              <div data-label="Situação"><span className={item.ativo ? 'users-status users-status--active' : 'users-status'}><i /> {item.ativo ? 'Ativo' : 'Inativo'}</span></div>
              <div className="users-list__actions" data-label="Ações">
                <Link to={`/diretor/usuarios/${item.id}/editar`} aria-label={`Editar ${item.nome}`}><Icon name="edit" /></Link>
                <button type="button" onClick={() => void handleStatus(item)} disabled={changingId !== null || item.id === authenticatedUser?.id} title={item.id === authenticatedUser?.id ? 'Seu próprio acesso deve ser alterado por outro diretor' : item.ativo ? 'Desativar usuário' : 'Ativar usuário'} aria-label={item.ativo ? `Desativar ${item.nome}` : `Ativar ${item.nome}`}><Icon name="power" /></button>
              </div>
            </article>
          )) : <div className="users-list-empty"><span><Icon name="users" /></span><h2>Nenhum usuário encontrado</h2><p>Ajuste a busca ou os filtros para ver outros resultados.</p></div>}
        </div>

        <footer><span>Exibindo {visibleUsers.length} de {users.length} usuários carregados</span></footer>
      </section>
    </main>
  )
}
