import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listUsers, updateUserRegistrationStatus, type SystemUser } from '../../api/users'
import { useAuth } from '../../auth/auth-context'
import './DirectorUsersPage.css'

type Filter = 'ALL' | 'DIRECAO' | 'PROFESSOR' | 'ALUNO'
const filters: { value: Filter; label: string }[] = [
  { value: 'ALL', label: 'Todos' },
  { value: 'DIRECAO', label: 'Diretores' },
  { value: 'PROFESSOR', label: 'Professores' },
  { value: 'ALUNO', label: 'Alunos' },
]
const roleLabels: Record<string, string> = { ALUNO: 'Aluno', PROFESSOR: 'Professor', DIRECAO: 'Diretor' }
const statusLabels: Record<string, string> = {
  PENDENTE: 'Aguardando aprovação',
  ATIVO: 'Ativo',
  RECUSADO: 'Recusado',
  DESATIVADO: 'Desativado',
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'CT'
}
function normalizeSearch(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim()
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)).replace('.', '')
}

export default function DirectorUsersPage() {
  const { token, user: authenticatedUser, clearSession } = useAuth()
  const [users, setUsers] = useState<SystemUser[]>([])
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const [filter, setFilter] = useState<Filter>('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [changingId, setChangingId] = useState<number | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async (signal?: AbortSignal) => {
    if (!token) return
    setLoading(true)
    try {
      setUsers(await listUsers(token, signal))
      setErrorMessage('')
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
    const normalized = normalizeSearch(deferredQuery)
    return users.filter((item) => {
      const matchesFilter = (filter === 'ALL' || item.role === filter)
        && (statusFilter === 'ALL' || item.statusCadastro === statusFilter)
      const haystack = normalizeSearch([item.nome, item.email ?? '', item.cpfMascarado ?? ''].join(' '))
      return matchesFilter && (!normalized || haystack.includes(normalized))
    })
  }, [deferredQuery, filter, statusFilter, users])

  function selectSummary(role: Filter, status: string) {
    setQuery('')
    setFilter(role)
    setStatusFilter(status)
  }

  const counts = useMemo(() => ({
    total: users.length,
    pending: users.filter((item) => item.statusCadastro === 'PENDENTE').length,
    teachers: users.filter((item) => item.role === 'PROFESSOR' && item.statusCadastro === 'ATIVO').length,
    students: users.filter((item) => item.role === 'ALUNO' && item.statusCadastro === 'ATIVO').length,
    directors: users.filter((item) => item.role === 'DIRECAO' && item.statusCadastro === 'ATIVO').length,
    disabled: users.filter((item) => item.statusCadastro === 'DESATIVADO').length,
  }), [users])

  async function changeStatus(item: SystemUser, acao: 'APROVAR' | 'RECUSAR' | 'DESATIVAR' | 'REATIVAR') {
    if (!token || changingId !== null || item.id === authenticatedUser?.id) return
    const verbs = { APROVAR: 'aprovar', RECUSAR: 'recusar', DESATIVAR: 'desativar', REATIVAR: 'reativar' }
    if (!window.confirm(`Deseja realmente ${verbs[acao]} o acesso de ${item.nome}?`)) return

    setChangingId(item.id)
    setNotice('')
    setErrorMessage('')
    try {
      const updated = await updateUserRegistrationStatus(item.id, acao, token)
      setUsers((current) => current.map((entry) => entry.id === item.id ? updated : entry))
      setNotice(`${item.nome}: ${statusLabels[updated.statusCadastro]}.`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível alterar o usuário'
      if (message === 'Sua sessão expirou') clearSession()
      else setErrorMessage(message)
    } finally {
      setChangingId(null)
    }
  }

  if (loading) return <main className="users-page-feedback"><span /><p>Carregando usuários...</p></main>

  return (
    <main className="director-users-page">
      <header className="users-page-heading">
        <div><h1>Gestão de Usuários</h1><p>Aprove novos alunos e gerencie os acessos ao CEMTN.</p></div>
        <Link to="/diretor/usuarios/novo">＋ Cadastrar usuário</Link>
      </header>

      <section className="users-page-stats" aria-label="Resumo e filtros de usuários">
        {[
          { label: 'Total de usuários', count: counts.total, role: 'ALL' as Filter, status: 'ALL', icon: 'users' },
          { label: 'Aguardando aprovação', count: counts.pending, role: 'ALL' as Filter, status: 'PENDENTE', icon: 'clock' },
          { label: 'Professores ativos', count: counts.teachers, role: 'PROFESSOR' as Filter, status: 'ATIVO', icon: 'book' },
          { label: 'Alunos ativos', count: counts.students, role: 'ALUNO' as Filter, status: 'ATIVO', icon: 'cap' },
          { label: 'Diretores ativos', count: counts.directors, role: 'DIRECAO' as Filter, status: 'ATIVO', icon: 'users' },
          { label: 'Contas desativadas', count: counts.disabled, role: 'ALL' as Filter, status: 'DESATIVADO', icon: 'lock' },
        ].map((card) => (
          <button key={card.label} type="button" aria-pressed={filter === card.role && statusFilter === card.status && !query} className={card.status === 'PENDENTE' && counts.pending > 0 ? 'users-stat-pending' : ''} onClick={() => selectSummary(card.role, card.status)}>
            <span aria-hidden="true"><svg className="users-page-icon" viewBox="0 0 24 24">
              {card.icon === 'clock' ? <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>
                : card.icon === 'book' ? <><path d="M12 5v15M3 4c4-1 6 0 9 2 3-2 5-3 9-2v14c-4-1-6 0-9 2-3-2-5-3-9-2Z" /></>
                : card.icon === 'cap' ? <><path d="m2 9 10-5 10 5-10 5ZM6 11v6q6 5 12 0v-6M22 9v8" /></>
                : card.icon === 'lock' ? <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>
                : <><circle cx="9" cy="8" r="3" /><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 4v3" /></>}
            </svg></span>
            <span className="users-stat-copy"><small>{card.label}</small><strong>{card.count}</strong></span>
          </button>
        ))}
      </section>

      <section className="users-approvals" aria-labelledby="users-approvals-title">
        <header>
          <div><h2 id="users-approvals-title">Aprovação de cadastros <span>{counts.pending}</span></h2><p>Alunos que se cadastram pelo site precisam da aprovação da Direção para entrar.</p></div>
          <button type="button" disabled={loading || changingId !== null} onClick={() => void load()}>Atualizar solicitações</button>
        </header>
        {counts.pending ? (
          <ul className="users-approvals-list">
            {users.filter((item) => item.statusCadastro === 'PENDENTE').map((item) => (
              <li key={item.id}>
                <div><strong>{item.nome}</strong><small>CPF: {item.cpfMascarado ?? 'Não cadastrado'} · Cadastro em {formatDate(item.createdAt)}</small></div>
                <div className="users-actions users-actions--status">
                  <button className="approve-user" type="button" aria-label={`Aprovar cadastro de ${item.nome}`} onClick={() => void changeStatus(item, 'APROVAR')} disabled={changingId !== null}>Aprovar</button>
                  <button className="reject-user" type="button" aria-label={`Recusar cadastro de ${item.nome}`} onClick={() => void changeStatus(item, 'RECUSAR')} disabled={changingId !== null}>Recusar</button>
                </div>
              </li>
            ))}
          </ul>
        ) : <div className="users-approvals-empty"><strong>Nenhum cadastro aguardando aprovação</strong><p>Novas solicitações aparecerão aqui após o aluno preencher “Criar conta de aluno” na tela de login.</p></div>}
      </section>

      <section className="users-page-content">
        <div className="users-page-toolbar">
          <label><span className="sr-only">Buscar por nome, e-mail ou trecho visível do CPF</span><svg className="users-page-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6" /><path d="m15 15 6 6" /></svg><input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nome, e-mail ou trecho visível do CPF..." /></label>
          <div className="users-role-filters" role="group" aria-label="Filtrar por perfil">{filters.map((item) => <button key={item.value} type="button" aria-pressed={filter === item.value} className={filter === item.value ? 'active' : ''} onClick={() => setFilter(item.value)}>{item.label}</button>)}</div>
          <label className="users-status-filter">Situação<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="ALL">Todas as situações</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <div className="users-filter-summary"><span role="status">{visibleUsers.length} de {users.length} usuários</span>{(query || filter !== 'ALL' || statusFilter !== 'ALL') && <button type="button" onClick={() => selectSummary('ALL', 'ALL')}>Limpar filtros</button>}</div>
        </div>

        {errorMessage ? <p className="users-page-message users-page-message--error" role="alert">{errorMessage}</p> : null}
        {notice ? <p className="users-page-message" role="status">{notice}</p> : null}

        <div className="users-table-heading"><span>Usuário</span><span>Perfil</span><span>CPF</span><span>Status</span><span>Atualização</span><span>Ação</span></div>
        <div className="users-list">
          {visibleUsers.map((item) => (
            <article key={item.id} className={item.statusCadastro === 'PENDENTE' ? 'user-row-pending' : ''}>
              <div className="users-list__identity"><span>{initials(item.nome)}</span><div><strong>{item.nome}</strong><small>{item.email ?? 'Aluno cadastrado por CPF'}</small></div></div>
              <div data-label="Perfil"><b>{roleLabels[item.role] ?? item.role}</b></div>
              <div data-label="CPF"><small>{item.cpfMascarado ?? 'Não cadastrado'}</small></div>
              <div data-label="Status"><i className={item.statusCadastro === 'ATIVO' ? 'active' : item.statusCadastro === 'PENDENTE' ? 'pending' : ''}><em />{statusLabels[item.statusCadastro]}</i></div>
              <div data-label="Atualização"><time dateTime={item.updatedAt}>{formatDate(item.updatedAt)}</time></div>
              <div className="users-actions users-actions--status">
                {item.statusCadastro === 'PENDENTE' ? <>
                  <button className="approve-user" type="button" onClick={() => void changeStatus(item, 'APROVAR')} disabled={changingId !== null}>Aprovar</button>
                  <button className="reject-user" type="button" onClick={() => void changeStatus(item, 'RECUSAR')} disabled={changingId !== null}>Recusar</button>
                </> : <>
                  <Link to={`/diretor/usuarios/${item.id}/editar`}>Editar</Link>
                  {item.statusCadastro === 'ATIVO' && item.id !== authenticatedUser?.id ? <button type="button" onClick={() => void changeStatus(item, 'DESATIVAR')} disabled={changingId !== null}>Desativar</button> : null}
                  {item.statusCadastro === 'DESATIVADO' ? <button type="button" onClick={() => void changeStatus(item, 'REATIVAR')} disabled={changingId !== null}>Reativar</button> : null}
                </>}
              </div>
            </article>
          ))}
          {!visibleUsers.length ? <div className="users-list-empty"><h2>Nenhum usuário encontrado</h2><p>Ajuste a busca ou selecione outro filtro.</p></div> : null}
        </div>
        <footer>Mostrando {visibleUsers.length} de {users.length} usuários carregados</footer>
      </section>
    </main>
  )
}
