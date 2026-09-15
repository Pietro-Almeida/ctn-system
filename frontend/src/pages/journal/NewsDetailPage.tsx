import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { deleteNews, getNews, type NewsItem } from '../../api/news'
import { useAuth } from '../../auth/auth-context'
import './NewsDetailPage.css'

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

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(value))
}

export default function NewsDetailPage() {
  const { noticiaId } = useParams()
  const { token, user, clearSession } = useAuth()
  const navigate = useNavigate()
  const [news, setNews] = useState<NewsItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [actionError, setActionError] = useState('')
  const [deleting, setDeleting] = useState(false)

  const id = Number(noticiaId)
  const journalPath = user?.role === 'ALUNO'
    ? '/aluno/jornal'
    : user?.role === 'PROFESSOR'
      ? '/professor/jornal'
      : '/diretor/jornal'

  const load = useCallback(async (signal?: AbortSignal) => {
    if (!token) return
    if (!Number.isInteger(id) || id <= 0) {
      setErrorMessage('O endereço desta notícia é inválido')
      setLoading(false)
      return
    }

    setLoading(true)
    setErrorMessage('')
    try {
      setNews(await getNews(id, token, signal))
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      const message = error instanceof Error ? error.message : 'Não foi possível carregar a notícia'
      if (message === 'Sua sessão expirou') clearSession()
      else setErrorMessage(message)
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [clearSession, id, token])

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [load])

  const paragraphs = useMemo(
    () => news?.conteudo
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .split(/\n+/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean) ?? [],
    [news],
  )

  const canManage = Boolean(news && (user?.role === 'DIRECAO' || (user?.role === 'PROFESSOR' && news.authorId === user.id)))
  const base = user?.role === 'PROFESSOR' ? '/professor' : '/diretor'

  async function handleDelete() {
    if (!token || !news || !canManage || deleting) return
    if (!window.confirm(`Excluir definitivamente a notícia “${news.titulo}”?`)) return
    setDeleting(true)
    setActionError('')
    try {
      await deleteNews(news.id, token)
      navigate(journalPath, { replace: true, state: { newsDeleted: true } })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível excluir a notícia'
      if (message === 'Sua sessão expirou') clearSession()
      else setActionError(message)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return <main className="news-detail-feedback" aria-live="polite"><span /><p>Carregando notícia...</p></main>
  }

  if (errorMessage || !news) {
    return (
      <main className="news-detail-feedback">
        <h1>Não foi possível abrir a notícia</h1>
        <p>{errorMessage || 'Notícia não encontrada'}</p>
        <div>
          <Link to={journalPath}>Voltar ao Jornal</Link>
          <button type="button" onClick={() => void load()}>Tentar novamente</button>
        </div>
      </main>
    )
  }

  return (
    <main className="news-detail">
      <nav aria-label="Navegação estrutural">
        <Link to={journalPath}>Jornal CEMTN</Link>
        <span aria-hidden="true">›</span>
        <span>{categoryLabels[news.categoria] ?? news.categoria}</span>
      </nav>

      <article>
        <header>
          <div className="news-detail__category">{categoryLabels[news.categoria] ?? news.categoria}</div>
          <h1>{news.titulo}</h1>
          <div className="news-detail__meta">
            <span className="news-detail__avatar" aria-hidden="true">{news.authorName?.charAt(0).toUpperCase() || 'C'}</span>
            <p><strong>{news.authorName || 'Equipe CEMTN'}</strong><time dateTime={news.createdAt}>{formatDate(news.createdAt)}</time></p>
          </div>
          {canManage ? <div className="news-detail__management"><Link to={`${base}/jornal/${news.id}/editar`}>Editar publicação</Link><button type="button" onClick={() => void handleDelete()} disabled={deleting}>{deleting ? 'Excluindo...' : 'Excluir publicação'}</button></div> : null}
          {actionError ? <p className="news-detail__action-error" role="alert">{actionError}</p> : null}
        </header>

        <div className="news-detail__art" aria-hidden="true"><i /><b /><span /></div>

        <div className="news-detail__content">
          {paragraphs.length
            ? paragraphs.map((paragraph, index) => <p key={`${index}-${paragraph.slice(0, 12)}`}>{paragraph}</p>)
            : <p>Esta publicação não possui conteúdo.</p>}
        </div>

        <footer>
          <Link to={journalPath}>← Voltar para todas as notícias</Link>
          <span>Publicado no Jornal CEMTN</span>
        </footer>
      </article>
    </main>
  )
}
