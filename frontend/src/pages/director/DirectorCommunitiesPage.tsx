import { useCallback, useDeferredValue, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { deleteCommunity, listCommunities, type CommunitySummary } from '../../api/communities'
import { useAuth } from '../../auth/auth-context'
import './DirectorCommunitiesPage.css'

type Filter = 'ALL' | 'MINE' | 'ACTIVE'
type IconName = 'search' | 'community' | 'person' | 'post' | 'activity' | 'plus' | 'more' | 'arrow' | 'trash' | 'refresh'

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    community: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2M16 5a3 3 0 0 1 0 6M17 14a4 4 0 0 1 4 4v2" /></>,
    person: <><circle cx="12" cy="8" r="3" /><path d="M6 20a6 6 0 0 1 12 0" /></>,
    post: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h4" /></>,
    activity: <path d="M3 12h4l2-6 4 12 2-6h6" />,
    plus: <path d="M12 5v14M5 12h14" />,
    more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
    arrow: <path d="m9 18 6-6-6-6" />,
    trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14" /></>,
    refresh: <><path d="M20 7h-5V2" /><path d="M20 7a8 8 0 1 0 1 7" /></>,
  }
  return <svg className="director-community-icon" viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>
}
function formatDate(value: string) { return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value)).replace('.', '') }
function isThisWeek(value: string) { return Date.now() - new Date(value).getTime() <= 7 * 24 * 60 * 60 * 1000 }

export default function DirectorCommunitiesPage() {
  const { token, user, clearSession } = useAuth()
  const [communities, setCommunities] = useState<CommunitySummary[]>([])
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const [filter, setFilter] = useState<Filter>('ALL')
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async (signal?: AbortSignal) => {
    if (!token) return
    setLoading(true)
    try { setCommunities(await listCommunities(token, signal)); setErrorMessage('') }
    catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      const message = error instanceof Error ? error.message : 'Não foi possível carregar as comunidades'
      if (message === 'Sua sessão expirou') clearSession()
      else setErrorMessage(message)
    } finally { if (!signal?.aborted) setLoading(false) }
  }, [clearSession, token])

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [load])

  const visible = useMemo(() => {
    const normalized = deferredQuery.trim().toLocaleLowerCase('pt-BR')
    return [...communities]
      .filter((item) => (!normalized || item.nome.toLocaleLowerCase('pt-BR').includes(normalized) || item.creatorName.toLocaleLowerCase('pt-BR').includes(normalized)) && (filter !== 'MINE' || item.creatorId === user?.id))
      .sort((a, b) => filter === 'ACTIVE' ? b.postCount - a.postCount : new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }, [communities, deferredQuery, filter, user?.id])

  const participantTotal = communities.reduce((total, item) => total + item.memberCount, 0)
  const activeThisWeek = communities.filter((item) => isThisWeek(item.updatedAt)).length
  const activity = [...communities].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5)

  async function handleDelete(item: CommunitySummary) {
    if (!token || deletingId !== null || !window.confirm(`Excluir a comunidade “${item.nome}” e todas as suas publicações e comentários?`)) return
    setDeletingId(item.id); setOpenMenuId(null); setNotice(''); setErrorMessage('')
    try {
      await deleteCommunity(item.id, token)
      setCommunities((current) => current.filter((community) => community.id !== item.id))
      setNotice(`A comunidade ${item.nome} foi excluída.`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível excluir a comunidade'
      if (message === 'Sua sessão expirou') clearSession()
      else setErrorMessage(message)
    } finally { setDeletingId(null) }
  }

  if (loading) return <main className="director-communities-feedback" aria-live="polite"><span /><p>Carregando comunidades...</p></main>
  if (errorMessage && !communities.length) return <main className="director-communities-feedback"><h1>Não foi possível abrir as comunidades</h1><p>{errorMessage}</p><button type="button" onClick={() => void load()}><Icon name="refresh" /> Tentar novamente</button></main>

  return (
    <main className="director-communities-page">
      <header><div><h1>Gestão de Comunidades</h1><p>Crie, acompanhe e gerencie as comunidades da sua escola.</p></div><Link to="/diretor/comunidades/nova"><Icon name="plus" /> Criar comunidade</Link></header>

      <section className="director-community-stats">
        <article><span><Icon name="post" /></span><div><strong>{communities.length}</strong><small>comunidades</small></div></article>
        <article><span><Icon name="community" /></span><div><strong>{participantTotal}</strong><small>participantes</small></div></article>
        <article><span><Icon name="activity" /></span><div><strong>{activeThisWeek}</strong><small>ativas esta semana</small></div></article>
      </section>

      <div className="director-community-layout">
        <section className="director-community-content">
          <div className="director-community-toolbar">
            <label><span className="sr-only">Buscar comunidade</span><Icon name="search" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome da comunidade..." /></label>
            <div role="tablist" aria-label="Filtrar comunidades">
              <button type="button" className={filter === 'ALL' ? 'active' : ''} onClick={() => setFilter('ALL')}>Todas</button>
              <button type="button" className={filter === 'MINE' ? 'active' : ''} onClick={() => setFilter('MINE')}>Criadas por mim</button>
              <button type="button" className={filter === 'ACTIVE' ? 'active' : ''} onClick={() => setFilter('ACTIVE')}>Mais ativas</button>
            </div>
          </div>
          {errorMessage ? <p className="director-community-message error" role="alert">{errorMessage}</p> : null}
          {notice ? <p className="director-community-message" role="status">{notice}</p> : null}

          <div className="director-community-heading"><span>Comunidade</span><span>Criador</span><span>Participantes</span><span>Publicações</span><span>Última atividade</span><span>Status</span><span>Ações</span></div>
          <div className="director-community-list">
            {visible.length ? visible.map((item) => (
              <article key={item.id}>
                <div className="director-community-name"><span><Icon name="community" /></span><div><strong>{item.nome}</strong><small>{item.descricao}</small></div></div>
                <div data-label="Criador"><strong>{item.creatorName}</strong></div>
                <div data-label="Participantes"><Icon name="person" /> {item.memberCount}</div>
                <div data-label="Publicações"><Icon name="post" /> {item.postCount}</div>
                <div data-label="Última atividade"><time dateTime={item.updatedAt}>{formatDate(item.updatedAt)}</time></div>
                <div data-label="Status"><i><span /> Ativa</i></div>
                <div className="director-community-actions">
                  <Link to={`/diretor/comunidades/${item.id}`}>Abrir</Link>
                  <button type="button" onClick={() => setOpenMenuId((current) => current === item.id ? null : item.id)} aria-expanded={openMenuId === item.id} aria-label={`Mais ações para ${item.nome}`}><Icon name="more" /></button>
                  {openMenuId === item.id ? <div><button type="button" onClick={() => void handleDelete(item)} disabled={deletingId !== null}><Icon name="trash" /> Excluir</button></div> : null}
                </div>
              </article>
            )) : <div className="director-community-empty"><Icon name="community" /><h2>Nenhuma comunidade encontrada</h2><p>Ajuste a busca ou crie uma nova comunidade.</p></div>}
          </div>
          <footer>Mostrando {visible.length} de {communities.length} comunidades</footer>
        </section>

        <aside className="director-community-activity">
          <div><h2>Atividade nas comunidades</h2><Link to="/diretor/comunidades">Ver todas <Icon name="arrow" /></Link></div>
          {activity.map((item) => <article key={item.id}><span><Icon name="community" /></span><p><strong>{item.nome}</strong> recebeu atividade recente.<time dateTime={item.updatedAt}>{formatDate(item.updatedAt)}</time></p></article>)}
          {!activity.length ? <p>Nenhuma atividade recente.</p> : null}
        </aside>
      </div>
    </main>
  )
}
