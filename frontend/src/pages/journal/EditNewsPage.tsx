import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getNews, updateNews, type NewsItem } from '../../api/news'
import { prepareNewsCover } from '../../utils/news-cover'
import { useAuth } from '../../auth/auth-context'
import './CreateNewsPage.css'
import './NewsDetailPage.css'

const categories = [
  ['COMUNICADO', 'Comunicado'], ['NOTICIA', 'Notícia'], ['AVISO', 'Aviso'],
  ['EVENTO', 'Evento'], ['ESPORTES', 'Esportes'], ['CIENCIAS', 'Ciências'],
  ['CULTURA', 'Cultura'], ['EDUCACAO', 'Educação'], ['PROJETO', 'Projeto'],
  ['INFORMACAO', 'Informação'], ['ATIVIDADE', 'Atividade'],
] as const

type IconName = 'news' | 'check' | 'info' | 'lock'
function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    news: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 7h8M8 11h8M8 15h5" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
  }
  return <svg className="create-news-icon" viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>
}

export default function EditNewsPage() {
  const { noticiaId } = useParams()
  const id = Number(noticiaId)
  const { token, user, clearSession } = useAuth()
  const navigate = useNavigate()
  const base = user?.role === 'PROFESSOR' ? '/professor' : '/diretor'
  const [news, setNews] = useState<NewsItem | null>(null)
  const [titulo, setTitulo] = useState('')
  const [categoria, setCategoria] = useState('COMUNICADO')
  const [conteudo, setConteudo] = useState('')
  const [capa, setCapa] = useState('')
  const [processingCover, setProcessingCover] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const load = useCallback(async (signal: AbortSignal) => {
    if (!token || !Number.isInteger(id) || id <= 0) {
      setErrorMessage('O endereço desta notícia é inválido')
      setLoading(false)
      return
    }
    try {
      const data = await getNews(id, token, signal)
      setNews(data)
      setTitulo(data.titulo)
      setCategoria(data.categoria)
      setConteudo(data.conteudo)
      setCapa(data.capa || '')
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      const message = error instanceof Error ? error.message : 'Não foi possível carregar a notícia'
      if (message === 'Sua sessão expirou') clearSession()
      else setErrorMessage(message)
    } finally {
      if (!signal.aborted) setLoading(false)
    }
  }, [clearSession, id, token])

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [load])

  const canManage = Boolean(news && (user?.role === 'DIRECAO' || (user?.role === 'PROFESSOR' && news.authorId === user.id)))
  const categoryLabel = useMemo(() => categories.find(([value]) => value === categoria)?.[1] ?? categoria, [categoria])

  async function handleCover(file?: File) {
    if (!file) return
    setProcessingCover(true)
    setErrorMessage('')
    try { setCapa(await prepareNewsCover(file)) }
    catch (error) { setErrorMessage(error instanceof Error ? error.message : 'Não foi possível preparar a capa') }
    finally { setProcessingCover(false) }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setErrorMessage('')
    if (!token || !news || !canManage || submitting || processingCover) return
    if (titulo.trim().length < 5) return setErrorMessage('O título precisa ter pelo menos 5 caracteres')
    if (conteudo.trim().length < 20) return setErrorMessage('O conteúdo precisa ter pelo menos 20 caracteres')

    setSubmitting(true)
    try {
      await updateNews(id, { titulo: titulo.trim(), conteudo: conteudo.trim(), categoria, ...(capa ? { capa } : {}) }, token)
      navigate(`${base}/jornal/${id}`, { replace: true, state: { newsUpdated: true } })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível atualizar a notícia'
      if (message === 'Sua sessão expirou') clearSession()
      else setErrorMessage(message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <main className="news-detail-feedback" aria-live="polite"><span /><p>Carregando publicação...</p></main>
  if (!news) return <main className="news-detail-feedback"><h1>Não foi possível editar</h1><p>{errorMessage || 'Notícia não encontrada.'}</p><Link to={`${base}/jornal`}>Voltar ao Jornal</Link></main>
  if (!canManage) return <main className="news-detail-feedback"><Icon name="lock" /><h1>Edição não autorizada</h1><p>Somente o autor ou a Direção podem editar esta publicação.</p><Link to={`${base}/jornal/${id}`}>Voltar à notícia</Link></main>

  return (
    <main className="create-news-page">
      <nav><Link to={`${base}/jornal`}>Jornal CEMTN</Link><span>/</span><Link to={`${base}/jornal/${id}`}>{news.titulo}</Link><span>/</span><span>Editar</span></nav>
      <header><h1>Editar publicação</h1><p>Atualize as informações que serão exibidas para a comunidade escolar.</p></header>
      <form onSubmit={handleSubmit}>
        <div className="create-news-form">
          <section><h2>Informações da publicação</h2><label>Título <b>*</b><input value={titulo} onChange={(event) => setTitulo(event.target.value)} maxLength={200} required /><small>{titulo.length}/200 caracteres</small></label><label>Categoria <b>*</b><select value={categoria} onChange={(event) => setCategoria(event.target.value)}>{categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Alterar capa<input className="create-news-file" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void handleCover(event.target.files?.[0])} disabled={processingCover} /><small>{processingCover ? 'Preparando imagem...' : capa ? 'Capa pronta' : 'JPEG, PNG ou WebP · máximo 8 MB'}</small></label></section>
          <section><h2>Conteúdo</h2><label><span className="sr-only">Conteúdo da publicação</span><textarea value={conteudo} onChange={(event) => setConteudo(event.target.value)} maxLength={20000} required /><small>{conteudo.length}/20000 caracteres</small></label></section>
        </div>
        <aside className="create-news-preview"><h2>Prévia no Jornal</h2><div className="create-news-art">{capa ? <img src={capa} alt="Prévia da capa da publicação" /> : <><i /><span /></>}</div><span className="create-news-category">{categoryLabel}</span><h3>{titulo.trim() || 'Título da publicação'}</h3><p>{conteudo.trim().slice(0, 220) || 'O conteúdo da publicação aparecerá nesta área.'}{conteudo.trim().length > 220 ? '…' : ''}</p><div className="create-news-author"><span>{news.authorName?.slice(0, 1).toUpperCase() || 'C'}</span><div><strong>{news.authorName || 'Equipe CEMTN'}</strong><small>Autor da publicação</small></div></div><ul><li><Icon name="check" /> Visível para todos os perfis</li><li><Icon name="check" /> Organizada pela categoria escolhida</li></ul><div className="create-news-tip"><Icon name="info" /><p>As mudanças serão exibidas assim que você salvar.</p></div></aside>
        {errorMessage ? <p className="create-news-error" role="alert">{errorMessage}</p> : null}
        <footer><Link to={`${base}/jornal/${id}`}>Cancelar</Link><button type="submit" disabled={submitting || processingCover || !capa}>{submitting ? 'Salvando...' : 'Salvar alterações'}</button></footer>
      </form>
    </main>
  )
}
