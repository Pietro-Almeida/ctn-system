import { useCallback, useDeferredValue, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { deleteCommunity, listCommunities, type CommunitySummary } from '../../api/communities'
import { useAuth } from '../../auth/auth-context'
import './TeacherCommunitiesPage.css'

type Tab = 'MINE' | 'JOINED' | 'ALL'
type IconName = 'search' | 'community' | 'people' | 'post' | 'more' | 'plus' | 'arrow' | 'trash' | 'refresh'
function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    community: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2M16 5a3 3 0 0 1 0 6M17 14a4 4 0 0 1 4 4v2" /></>,
    people: <><circle cx="8" cy="9" r="3" /><circle cx="17" cy="8" r="2" /><path d="M2 20a6 6 0 0 1 12 0M14 15a5 5 0 0 1 8 4" /></>,
    post: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6" /></>,
    more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    arrow: <path d="m9 18 6-6-6-6" />,
    trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14" /></>,
    refresh: <><path d="M20 7h-5V2" /><path d="M20 7a8 8 0 1 0 1 7" /></>,
  }
  return <svg className="teacher-community-icon" viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>
}
function formatDate(value: string) { return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value)).replace('.', '') }

export default function TeacherCommunitiesPage() {
  const { token, user, clearSession } = useAuth()
  const [communities, setCommunities] = useState<CommunitySummary[]>([])
  const [tab, setTab] = useState<Tab>('MINE')
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
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
      if (message === 'Sua sessão expirou') clearSession(); else setErrorMessage(message)
    } finally { if (!signal?.aborted) setLoading(false) }
  }, [clearSession, token])

  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort() }, [load])

  const visible = useMemo(() => {
    const normalized = deferredQuery.trim().toLocaleLowerCase('pt-BR')
    return communities.filter((item) => {
      const matchesTab = tab === 'ALL' || (tab === 'MINE' ? item.creatorId === user?.id : item.participating && item.creatorId !== user?.id)
      return matchesTab && (!normalized || item.nome.toLocaleLowerCase('pt-BR').includes(normalized) || item.descricao.toLocaleLowerCase('pt-BR').includes(normalized))
    })
  }, [communities, deferredQuery, tab, user?.id])

  const recent = [...communities].filter((item) => item.participating).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5)

  async function handleDelete(item: CommunitySummary) {
    if (!token || deletingId !== null || item.creatorId !== user?.id || !window.confirm(`Excluir a comunidade “${item.nome}” e todo o conteúdo relacionado?`)) return
    setDeletingId(item.id); setOpenMenuId(null); setErrorMessage(''); setNotice('')
    try { await deleteCommunity(item.id, token); setCommunities((current) => current.filter((entry) => entry.id !== item.id)); setNotice(`${item.nome} foi excluída.`) }
    catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível excluir a comunidade'
      if (message === 'Sua sessão expirou') clearSession(); else setErrorMessage(message)
    } finally { setDeletingId(null) }
  }

  if (loading) return <main className="teacher-communities-feedback" aria-live="polite"><span /><p>Carregando comunidades...</p></main>
  if (errorMessage && !communities.length) return <main className="teacher-communities-feedback"><h1>Não foi possível abrir as comunidades</h1><p>{errorMessage}</p><button type="button" onClick={() => void load()}><Icon name="refresh" /> Tentar novamente</button></main>

  return (
    <main className="teacher-communities-page">
      <header><div><h1>Minhas Comunidades</h1><p>Crie espaços, publique conteúdos e acompanhe seus alunos.</p></div><Link to="/professor/comunidades/nova"><Icon name="plus" /> Criar comunidade</Link></header>
      <nav role="tablist" aria-label="Tipos de comunidade"><button type="button" className={tab === 'MINE' ? 'active' : ''} onClick={() => setTab('MINE')}>Criadas por mim</button><button type="button" className={tab === 'JOINED' ? 'active' : ''} onClick={() => setTab('JOINED')}>Participo</button><button type="button" className={tab === 'ALL' ? 'active' : ''} onClick={() => setTab('ALL')}>Todas</button></nav>

      <div className="teacher-communities-layout">
        <section className="teacher-community-content">
          <label className="teacher-community-search"><Icon name="search" /><span className="sr-only">Buscar comunidade</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar comunidade..." /></label>
          {errorMessage ? <p className="teacher-community-message error" role="alert">{errorMessage}</p> : null}
          {notice ? <p className="teacher-community-message" role="status">{notice}</p> : null}
          <div className="teacher-community-list">
            {visible.length ? visible.map((item) => (
              <article key={item.id}>
                <span className="teacher-community-symbol"><Icon name="community" /></span>
                <div className="teacher-community-copy"><h2>{item.nome}</h2><p>{item.descricao}</p><div><span><Icon name="people" /> {item.memberCount}</span><span><Icon name="post" /> {item.postCount}</span><span>Última atividade <time>{formatDate(item.updatedAt)}</time></span></div></div>
                <Link className="teacher-community-open" to={`/professor/comunidades/${item.id}`}>Abrir</Link>
                {item.creatorId === user?.id ? <div className="teacher-community-menu"><button type="button" onClick={() => setOpenMenuId((current) => current === item.id ? null : item.id)} aria-expanded={openMenuId === item.id} aria-label={`Ações para ${item.nome}`}><Icon name="more" /></button>{openMenuId === item.id ? <div><Link to={`/professor/comunidades/${item.id}/editar`}>Editar</Link><button type="button" onClick={() => void handleDelete(item)} disabled={deletingId !== null}><Icon name="trash" /> Excluir</button></div> : null}</div> : null}
              </article>
            )) : <div className="teacher-community-empty"><Icon name="community" /><h2>Nenhuma comunidade encontrada</h2><p>{tab === 'MINE' ? 'Crie sua primeira comunidade para começar.' : 'Tente outra busca ou selecione uma aba diferente.'}</p></div>}
          </div>
          <footer>Mostrando {visible.length} comunidade{visible.length === 1 ? '' : 's'}</footer>
        </section>

        <aside className="teacher-community-recent"><div><h2>Interações recentes</h2><Link to="/professor/comunidades">Ver todas <Icon name="arrow" /></Link></div>{recent.map((item) => <article key={item.id}><span><Icon name="community" /></span><p><strong>{item.nome}</strong> recebeu novas interações.<time>{formatDate(item.updatedAt)}</time></p></article>)}{!recent.length ? <p className="teacher-community-empty-copy">Nenhuma interação recente.</p> : null}</aside>
      </div>
    </main>
  )
}
