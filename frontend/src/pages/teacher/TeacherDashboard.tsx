import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { listCommunities, type CommunitySummary } from '../../api/communities'
import { listNews, type NewsItem } from '../../api/news'
import { useAuth } from '../../auth/auth-context'
import './TeacherDashboard.css'

type IconName = 'news' | 'community' | 'people' | 'post' | 'plus' | 'arrow' | 'refresh'
interface Activity { id: string; title: string; description: string; date: string; icon: IconName; path: string }

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    news: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 7h8M8 11h8M8 15h5" /></>,
    community: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2M16 5a3 3 0 0 1 0 6M17 14a4 4 0 0 1 4 4v2" /></>,
    people: <><circle cx="8" cy="9" r="3" /><circle cx="17" cy="8" r="2" /><path d="M2 20a6 6 0 0 1 12 0M14 15a5 5 0 0 1 8 4" /></>,
    post: <><path d="M5 4h14v16H5z" /><path d="M9 8h6M9 12h6M9 16h4" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    arrow: <path d="m9 18 6-6-6-6" />,
    refresh: <><path d="M20 7h-5V2" /><path d="M20 7a8 8 0 1 0 1 7" /></>,
  }
  return <svg className="teacher-icon" viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>
}
function formatDate(value: string) {
  const date = new Date(value)
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date).replace('.', '')
}

export default function TeacherDashboard() {
  const { token, user, clearSession } = useAuth()
  const [news, setNews] = useState<NewsItem[]>([])
  const [communities, setCommunities] = useState<CommunitySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const load = useCallback(async (signal?: AbortSignal) => {
    if (!token) return
    setLoading(true); setErrorMessage('')
    try {
      const [newsData, communityData] = await Promise.all([listNews(token, signal), listCommunities(token, signal)])
      setNews(newsData); setCommunities(communityData)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      const message = error instanceof Error ? error.message : 'Não foi possível carregar o painel'
      if (message === 'Sua sessão expirou') clearSession(); else setErrorMessage(message)
    } finally { if (!signal?.aborted) setLoading(false) }
  }, [clearSession, token])

  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort() }, [load])

  const ownNews = useMemo(() => news.filter((item) => item.authorId === user?.id), [news, user?.id])
  const ownCommunities = useMemo(() => communities.filter((item) => item.creatorId === user?.id), [communities, user?.id])
  const interactions = ownCommunities.reduce((total, item) => total + item.postCount, 0)
  const activities = useMemo<Activity[]>(() => [
    ...ownNews.map((item) => ({ id: `news-${item.id}`, title: 'Publicação no Jornal', description: item.titulo, date: item.createdAt, icon: 'news' as const, path: `/professor/jornal/${item.id}` })),
    ...ownCommunities.map((item) => ({ id: `community-${item.id}`, title: 'Atividade em comunidade', description: `${item.nome} · ${item.postCount} publicações`, date: item.updatedAt, icon: 'community' as const, path: `/professor/comunidades/${item.id}` })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 4), [ownCommunities, ownNews])

  if (loading) return <main className="teacher-feedback" aria-live="polite"><span /><p>Carregando painel do Professor...</p></main>
  if (errorMessage) return <main className="teacher-feedback"><h1>Não foi possível abrir o painel</h1><p>{errorMessage}</p><button type="button" onClick={() => void load()}><Icon name="refresh" /> Tentar novamente</button></main>

  return (
    <main className="teacher-dashboard">
      <header><h1>Painel do Professor</h1><p>Acompanhe suas publicações e comunidades no CEMTN.</p></header>
      <section className="teacher-welcome"><h2>Olá, Prof. {user?.nome.split(' ')[0]}.</h2><span>Professor</span><p>Aqui estão as atividades mais recentes dos seus espaços.</p></section>

      <section className="teacher-stats">
        <Link to="/professor/comunidades"><span><Icon name="community" /></span><div><small>Comunidades criadas</small><strong>{ownCommunities.length.toString().padStart(2, '0')}</strong></div><Icon name="arrow" /></Link>
        <Link to="/professor/jornal"><span><Icon name="news" /></span><div><small>Publicações no Jornal</small><strong>{ownNews.length.toString().padStart(2, '0')}</strong></div><Icon name="arrow" /></Link>
        <article><span><Icon name="post" /></span><div><small>Interações registradas</small><strong>{interactions.toString().padStart(2, '0')}</strong></div></article>
      </section>

      <div className="teacher-dashboard-grid">
        <section className="teacher-card teacher-activity">
          <div className="teacher-card-title"><h2>Atividade recente</h2></div>
          {activities.length ? activities.map((item) => <Link to={item.path} key={item.id}><i /><span><Icon name={item.icon} /></span><div><strong>{item.title}</strong><p>{item.description}</p></div><time dateTime={item.date}>{formatDate(item.date)}</time></Link>) : <p className="teacher-empty">Você ainda não possui atividades recentes.</p>}
        </section>

        <section className="teacher-card teacher-actions">
          <div className="teacher-card-title"><h2>Ações rápidas</h2></div>
          <Link to="/professor/jornal/nova"><span><Icon name="news" /></span><strong>Nova publicação</strong><Icon name="arrow" /></Link>
          <Link to="/professor/comunidades/nova"><span><Icon name="community" /></span><strong>Criar comunidade</strong><Icon name="arrow" /></Link>
          <Link to="/professor/comunidades"><span><Icon name="people" /></span><strong>Ver comunidades</strong><Icon name="arrow" /></Link>
        </section>
      </div>

      <section className="teacher-card teacher-communities">
        <div className="teacher-card-title"><h2>Minhas comunidades</h2><Link to="/professor/comunidades">Ver todas <Icon name="arrow" /></Link></div>
        <div>{ownCommunities.slice(0, 3).map((item) => <article key={item.id}><span><Icon name="community" /></span><div><h3>{item.nome}</h3><p>{item.descricao}</p><small>{item.memberCount} participantes · {item.postCount} publicações</small></div><Link to={`/professor/comunidades/${item.id}`}><Icon name="arrow" /></Link></article>)}{!ownCommunities.length ? <p className="teacher-empty">Nenhuma comunidade criada. Use a ação rápida para começar.</p> : null}</div>
      </section>
    </main>
  )
}
