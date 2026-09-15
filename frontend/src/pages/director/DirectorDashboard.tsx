import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { listCommunities, type CommunitySummary } from '../../api/communities'
import { listNews, type NewsItem } from '../../api/news'
import { listUsers, type SystemUser } from '../../api/users'
import { useAuth } from '../../auth/auth-context'
import './DirectorDashboard.css'

type IconName = 'users' | 'student' | 'teacher' | 'news' | 'community' | 'plus' | 'arrow' | 'refresh'

const roleLabels: Record<string, string> = {
  ALUNO: 'Aluno',
  PROFESSOR: 'Professor',
  DIRECAO: 'Direção',
  COORDENACAO: 'Coordenação',
  SOE: 'SOE',
}

const categoryLabels: Record<string, string> = {
  AVISO: 'Aviso',
  EVENTO: 'Evento',
  INFORMACAO: 'Informação',
  PROJETO: 'Projeto',
  COMUNICADO: 'Comunicado',
  NOTICIA: 'Notícia',
  ATIVIDADE: 'Atividade',
  ESPORTES: 'Esportes',
  CIENCIAS: 'Ciências',
  CULTURA: 'Cultura',
  EDUCACAO: 'Educação',
}

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    users: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2M16 5a3 3 0 0 1 0 6M17 14a4 4 0 0 1 4 4v2" /></>,
    student: <><path d="m2 9 10-5 10 5-10 5z" /><path d="M6 11v5c3 3 9 3 12 0v-5" /></>,
    teacher: <><rect x="3" y="4" width="18" height="12" rx="2" /><circle cx="8" cy="20" r="2" /><path d="m10 19 5-4M17 20h4" /></>,
    news: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 7h8M8 11h8M8 15h5" /></>,
    community: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2M16 5a3 3 0 0 1 0 6M17 14a4 4 0 0 1 4 4v2" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    arrow: <path d="m9 18 6-6-6-6" />,
    refresh: <><path d="M20 7h-5V2" /><path d="M20 7a8 8 0 1 0 1 7" /></>,
  }
  return <svg className="director-icon" viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' })
    .format(new Date(value))
    .replace('.', '')
    .toUpperCase()
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'CT'
}

export default function DirectorDashboard() {
  const { token, user, clearSession } = useAuth()
  const [users, setUsers] = useState<SystemUser[]>([])
  const [news, setNews] = useState<NewsItem[]>([])
  const [communities, setCommunities] = useState<CommunitySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const load = useCallback(async (signal?: AbortSignal) => {
    if (!token) return
    setLoading(true)
    setErrorMessage('')
    try {
      const [userData, newsData, communityData] = await Promise.all([
        listUsers(token, signal),
        listNews(token, signal),
        listCommunities(token, signal),
      ])
      setUsers(userData)
      setNews(newsData)
      setCommunities(communityData)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      const message = error instanceof Error ? error.message : 'Não foi possível carregar o painel'
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

  const counts = useMemo(() => ({
    active: users.filter((item) => item.ativo).length,
    students: users.filter((item) => item.role === 'ALUNO' && item.ativo).length,
    teachers: users.filter((item) => item.role === 'PROFESSOR' && item.ativo).length,
    news: news.length,
  }), [news.length, users])

  const myCommunities = useMemo(
    () => communities.filter((community) => community.creatorId === user?.id).slice(0, 3),
    [communities, user?.id],
  )
  const latestUsers = [...users]
    .sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime())
    .slice(0, 4)
  const latestNews = news.slice(0, 4)

  if (loading) {
    return <main className="director-feedback" aria-live="polite"><span /><p>Carregando painel da Direção...</p></main>
  }

  if (errorMessage) {
    return (
      <main className="director-feedback">
        <h1>Não foi possível abrir o painel</h1>
        <p>{errorMessage}</p>
        <button type="button" onClick={() => void load()}><Icon name="refresh" /> Tentar novamente</button>
      </main>
    )
  }

  return (
    <main className="director-dashboard">
      <header className="director-heading">
        <div><h1>Olá, {user?.nome.split(' ')[0]}.</h1><p>Acompanhe o CEMTN e acesse rapidamente as principais áreas administrativas.</p></div>
        <Link to="/diretor/usuarios/novo"><Icon name="plus" /> Cadastrar usuário</Link>
      </header>

      <section className="director-stats" aria-label="Resumo do sistema">
        <article><span><Icon name="users" /></span><div><small>Usuários ativos</small><strong>{counts.active.toString().padStart(2, '0')}</strong><p>no sistema</p></div></article>
        <article><span><Icon name="student" /></span><div><small>Alunos</small><strong>{counts.students.toString().padStart(2, '0')}</strong><p>ativos</p></div></article>
        <article><span><Icon name="teacher" /></span><div><small>Professores</small><strong>{counts.teachers.toString().padStart(2, '0')}</strong><p>ativos</p></div></article>
        <article><span><Icon name="news" /></span><div><small>Publicações</small><strong>{counts.news.toString().padStart(2, '0')}</strong><p>no Jornal</p></div></article>
      </section>

      <section className="director-quick">
        <div className="director-section-title"><h2>Ações rápidas</h2></div>
        <div>
          <Link to="/diretor/usuarios/novo"><span><Icon name="users" /></span><strong>Novo usuário</strong><small>Cadastre aluno, professor ou diretor</small><Icon name="arrow" /></Link>
          <Link to="/diretor/jornal/nova"><span><Icon name="news" /></span><strong>Publicar notícia</strong><small>Adicione um comunicado ao Jornal</small><Icon name="arrow" /></Link>
          <Link to="/diretor/comunidades/nova"><span><Icon name="community" /></span><strong>Criar comunidade</strong><small>Abra um novo espaço de discussão</small><Icon name="arrow" /></Link>
        </div>
      </section>

      <div className="director-dashboard__grid">
        <section className="director-panel director-latest-news">
          <div className="director-section-title"><h2>Publicações recentes</h2><Link to="/diretor/jornal">Ver Jornal <Icon name="arrow" /></Link></div>
          {latestNews.length ? latestNews.map((item, index) => (
            <article key={item.id}>
              <div className={`director-news-art director-news-art--${index % 3}`} aria-hidden="true" />
              <div><span>{categoryLabels[item.categoria] ?? item.categoria}</span><time>{formatDate(item.createdAt)}</time><h3>{item.titulo}</h3><small>Por {item.authorName || 'Equipe CEMTN'}</small></div>
              <Link to={`/diretor/jornal/${item.id}`} aria-label={`Abrir notícia: ${item.titulo}`}><Icon name="arrow" /></Link>
            </article>
          )) : <p className="director-empty">Ainda não existem publicações no Jornal.</p>}
        </section>

        <section className="director-panel director-users">
          <div className="director-section-title"><h2>Usuários recentes</h2><Link to="/diretor/usuarios">Gerenciar <Icon name="arrow" /></Link></div>
          {latestUsers.length ? latestUsers.map((item) => (
            <article key={item.id}>
              <span className="director-avatar">{initials(item.nome)}</span>
              <div><strong>{item.nome}</strong><small>{roleLabels[item.role] ?? item.role} · {item.email}</small></div>
              <i className={item.ativo ? 'active' : ''}>{item.ativo ? 'Ativo' : 'Inativo'}</i>
            </article>
          )) : <p className="director-empty">Nenhum usuário cadastrado.</p>}
        </section>
      </div>

      <section className="director-panel director-communities">
        <div className="director-section-title"><h2>Minhas comunidades</h2><Link to="/diretor/comunidades">Ver todas <Icon name="arrow" /></Link></div>
        <div className="director-community-list">
          {myCommunities.length ? myCommunities.map((community) => (
            <article key={community.id}>
              <span><Icon name="community" /></span>
              <div><h3>{community.nome}</h3><p>{community.descricao}</p><small>{community.memberCount} participantes · {community.postCount} publicações</small></div>
              <Link to={`/diretor/comunidades/${community.id}`} aria-label={`Abrir comunidade: ${community.nome}`}><Icon name="arrow" /></Link>
            </article>
          )) : <div className="director-empty"><p>Você ainda não criou comunidades.</p><Link to="/diretor/comunidades/nova">Criar primeira comunidade</Link></div>}
        </div>
      </section>
    </main>
  )
}
