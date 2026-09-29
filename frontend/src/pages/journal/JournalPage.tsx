import NewsCover from '../../components/NewsCover'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { searchNews, type NewsItem } from '../../api/news'
import { useAuth } from '../../auth/auth-context'
import './JournalPage.css'

type IconName = 'arrow' | 'chevron' | 'refresh'

const filters = [
  { value: 'ALL', label: 'Destaques' },
  { value: 'COMUNICADO', label: 'Comunicados' },
  { value: 'ESPORTES', label: 'Esportes' },
  { value: 'CIENCIAS', label: 'Ciências' },
  { value: 'CULTURA', label: 'Cultura' },
  { value: 'EDUCACAO', label: 'Educação' },
] as const

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

const sectionCategories = [
  { title: 'Esportes', categories: ['ESPORTES'] },
  { title: 'Ciências e Tecnologia', categories: ['CIENCIAS', 'PROJETO'] },
  { title: 'Cultura e Educação', categories: ['CULTURA', 'EDUCACAO', 'ATIVIDADE', 'EVENTO'] },
]

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    arrow: <path d="m9 18 6-6-6-6" />,
    chevron: <path d="m15 18-6-6 6-6" />,
    refresh: <><path d="M20 7h-5V2" /><path d="M20 7a8 8 0 1 0 1 7" /></>,
  }
  return <svg className="journal-icon" viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date)).replace('.', '').toUpperCase()
}

function excerpt(content: string, size = 120) {
  const plainText = content.replace(/<[^>]*>/g, '').trim()
  return plainText.length > size ? `${plainText.slice(0, size).trim()}…` : plainText
}

function normalizeSearch(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim()
}

function ArticleArt({ variant = 0, cover }: { variant?: number; cover?: string | null }) {
  return <div className={`journal-art journal-art--${variant % 4}`}>{cover ? <NewsCover src={cover} alt="" /> : <><i /><b /></>}</div>
}

function NewsLink({ item, className }: { item: NewsItem; className?: string }) {
  const { user } = useAuth()
  const base = user?.role === 'ALUNO' ? '/aluno' : user?.role === 'PROFESSOR' ? '/professor' : '/diretor'
  return <Link className={className} to={`${base}/jornal/${item.id}`} aria-label={`Ler: ${item.titulo}`} />
}

export default function JournalPage() {
  const { token, user, clearSession } = useAuth()
  const [news, setNews] = useState<NewsItem[]>([])
  const [selectedFilter, setSelectedFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const searchTerm = normalizeSearch(search)
  const [activeSlide, setActiveSlide] = useState(0)
  const [searchParams, setSearchParams] = useSearchParams()
  const collection = searchParams.get('lista')
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [retry, setRetry] = useState(0)
  const [total, setTotal] = useState(0)
  const [sectionNews, setSectionNews] = useState<Record<string, NewsItem[]>>({})
  const requestedPage = Number(searchParams.get('pagina'))
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
  const collectionSection = sectionCategories.find((section) => section.title === collection)
  const categories = selectedFilter !== 'ALL' ? selectedFilter : collectionSection?.categories.join(',')
  const showCollection = Boolean(collection || searchTerm || selectedFilter !== 'ALL')
  function resetPage() {
    setSearchParams((current) => { const next = new URLSearchParams(current); next.delete('pagina'); return next }, { replace: true })
  }

  const canPublish = user?.role === 'PROFESSOR' || user?.role === 'DIRECAO'
  const base = user?.role === 'PROFESSOR' ? '/professor' : '/diretor'

  const loadNews = useCallback(async (signal?: AbortSignal) => {
    if (!token) return
    setLoading(true)
    setErrorMessage('')
    try {
      const [result, sections] = await Promise.all([
        searchNews(token, { page, limit: showCollection ? 12 : 3, q: searchTerm, categories }, signal),
        showCollection ? Promise.resolve([]) : Promise.all(sectionCategories.map(async (section) => [section.title, (await searchNews(token, { limit: 3, categories: section.categories.join(',') }, signal)).items] as const)),
      ])
      if (signal?.aborted) return
      setNews(result.items)
      setTotal(result.total)
      setSectionNews(Object.fromEntries(sections))
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      const message = error instanceof Error ? error.message : 'Não foi possível carregar o Jornal'
      if (message === 'Sua sessão expirou') clearSession()
      else setErrorMessage(message)
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [clearSession, token, page, searchTerm, categories, showCollection])

  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => void loadNews(controller.signal), 300)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [loadNews, retry])

  const featured = news.slice(0, 3)
  const currentFeature = featured[activeSlide % Math.max(featured.length, 1)]
  const latest = news.slice(0, 3)
  const collectionNews = news

  function selectFilter(filter: string) {
    setSearchParams({})
    setSelectedFilter(filter)
    setActiveSlide(0)
  }

  function changeSlide(direction: -1 | 1) {
    if (featured.length < 2) return
    setActiveSlide((current) => (current + direction + featured.length) % featured.length)
  }


  return (
    <main className="journal-page">
      <header className="journal-heading">
        <div>
          <h1>Jornal CEMTN</h1>
          <p>Informação, conhecimento e tudo o que acontece na nossa escola.</p>
        </div>
        {canPublish ? <Link className="journal-create" to={`${base}/jornal/nova`}>+ Nova publicação</Link> : null}
      </header>

      <nav className="journal-filters" aria-label="Editorias do Jornal">
        {filters.map((filter) => (
          <button key={filter.value} type="button" className={selectedFilter === filter.value ? 'active' : ''} onClick={() => selectFilter(filter.value)}>
            {filter.label}
          </button>
        ))}
      </nav>

      <div className="journal-search" role="search" aria-label="Busca de notícias">
        <label htmlFor="journal-search-input">Buscar notícias</label>
        <div className="journal-search__field">
          <input id="journal-search-input" type="search" maxLength={200} placeholder="Buscar por título ou conteúdo..." value={search} onChange={(event) => { setSearch(event.target.value); resetPage(); setActiveSlide(0) }} />
          {search && <button type="button" onClick={() => { setSearch(''); resetPage() }}>Limpar busca</button>}
        </div>
      </div>
      {loading && <p role="status">Carregando notícias...</p>}
      {errorMessage && <div role="alert"><p>{errorMessage}</p><button type="button" onClick={() => setRetry((value) => value + 1)}>Tentar novamente</button></div>}
      {showCollection ? (
        <section className="journal-collection" aria-labelledby="journal-collection-title">
          <header>
            <div><h2 id="journal-collection-title">{searchTerm ? 'Resultados da busca' : collectionSection?.title ?? filters.find((filter) => filter.value === selectedFilter && selectedFilter !== 'ALL')?.label ?? 'Todas as notícias'}</h2><p role="status">{total} publicações · Mais recentes primeiro</p></div>
            <Link to="?" className="journal-back" onClick={() => { setSearch(''); setSelectedFilter('ALL'); setActiveSlide(0) }}><Icon name="chevron" /> Voltar aos destaques</Link>
          </header>
          <div className="journal-collection__grid">
            {collectionNews.map((item, index) => (
              <article key={item.id}>
                <ArticleArt variant={index} cover={item.capa} />
                <div className="journal-collection__body">
                  <div className="journal-collection__meta"><span>{categoryLabels[item.categoria] ?? item.categoria}</span><time>{formatDate(item.createdAt)}</time></div>
                  <h3>{item.titulo}</h3>
                  <p>{excerpt(item.conteudo, 150)}</p>
                  <span className="journal-collection__read">Ler notícia <Icon name="arrow" /></span>
                </div>
                <NewsLink item={item} className="journal-card-link" />
              </article>
            ))}
          </div>
          <nav className="journal-pagination" aria-label="Páginas do Jornal">
            <button type="button" disabled={loading || page <= 1} onClick={() => setSearchParams((current) => { const next = new URLSearchParams(current); next.set('pagina', String(page - 1)); return next })}>Anterior</button>
            <span>{page} / {Math.max(1, Math.ceil(total / 12))}</span>
            <button type="button" disabled={loading || page * 12 >= total} onClick={() => setSearchParams((current) => { const next = new URLSearchParams(current); next.set('pagina', String(page + 1)); return next })}>Próxima</button>
          </nav>
          {!loading && !errorMessage && !collectionNews.length && <p>{searchTerm ? 'Nenhuma notícia encontrada. Tente outro termo ou categoria.' : 'Nenhuma publicação nesta editoria.'}</p>}
        </section>
      ) : currentFeature ? (
        <>
          <section className="journal-lead">
            <article className="journal-carousel">
              <ArticleArt variant={activeSlide} cover={currentFeature.capa} />
              <div className="journal-carousel__overlay" />
              <div className="journal-carousel__content">
                <div><span>{categoryLabels[currentFeature.categoria] ?? currentFeature.categoria}</span><time>{formatDate(currentFeature.createdAt)}</time></div>
                <h2>{currentFeature.titulo}</h2>
                <p>{excerpt(currentFeature.conteudo, 150)}</p>
                <NewsLink item={currentFeature} className="journal-read-link" />
                <span className="journal-read-label">Ler notícia <Icon name="arrow" /></span>
              </div>
              <button type="button" className="journal-carousel__arrow journal-carousel__arrow--left" onClick={() => changeSlide(-1)} aria-label="Notícia anterior"><Icon name="chevron" /></button>
              <button type="button" className="journal-carousel__arrow journal-carousel__arrow--right" onClick={() => changeSlide(1)} aria-label="Próxima notícia"><Icon name="arrow" /></button>
              <div className="journal-carousel__dots">
                {featured.map((item, index) => <button key={item.id} type="button" className={index === activeSlide ? 'active' : ''} onClick={() => setActiveSlide(index)} aria-label={`Exibir notícia ${index + 1}`} />)}
              </div>
            </article>

            <aside className="journal-latest">
              <div className="journal-block-title"><h2>Últimas notícias</h2><Link to="?lista=todas" aria-label="Ver todas as últimas notícias">Ver todas <Icon name="arrow" /></Link></div>
              {latest.map((item, index) => (
                <article key={item.id}>
                  <ArticleArt variant={index + 1} cover={item.capa} />
                  <div><span>{categoryLabels[item.categoria] ?? item.categoria}</span><time>{formatDate(item.createdAt)}</time><h3>{item.titulo}</h3></div>
                  <NewsLink item={item} className="journal-card-link" />
                </article>
              ))}
            </aside>
          </section>

          <section className="journal-sections">
            {sectionCategories.map((section) => {
              const items = sectionNews[section.title] ?? []
              return (
                <div className="journal-section" key={section.title}>
                  <div className="journal-block-title"><h2>{section.title}</h2><Link to={`?lista=${encodeURIComponent(section.title)}`} aria-label={`Ver todas as notícias de ${section.title}`}>Ver todas <Icon name="arrow" /></Link></div>
                  {items.length ? items.map((item, index) => (
                    <article className={index === 0 ? 'journal-section__main' : ''} key={item.id}>
                      {index === 0 ? <ArticleArt variant={section.title.length} cover={item.capa} /> : null}
                      <div><span>{categoryLabels[item.categoria] ?? item.categoria}</span><time>{formatDate(item.createdAt)}</time><h3>{item.titulo}</h3>{index === 0 ? <p>{excerpt(item.conteudo, 90)}</p> : null}</div>
                      <NewsLink item={item} className="journal-card-link" />
                    </article>
                  )) : <p className="journal-empty-section">Nenhuma publicação nesta editoria.</p>}
                </div>
              )
            })}
          </section>
        </>
      ) : (
        <section className="journal-empty">
          <div className="journal-empty__art"><ArticleArt /></div>
          <h2>Nenhuma publicação encontrada</h2>
          <p>{selectedFilter === 'ALL' ? 'O Jornal ainda não possui publicações.' : 'Não há notícias nesta editoria.'}</p>
          {canPublish ? <Link className="journal-create" to={`${base}/jornal/nova`}>Criar primeira publicação</Link> : null}
        </section>
      )}
    </main>
  )
}
