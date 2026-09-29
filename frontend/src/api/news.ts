const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export interface NewsItem {
  id: number
  titulo: string
  conteudo: string
  categoria: string
  capa?: string | null
  authorId: number
  authorName: string
  createdAt: string
  updatedAt: string
}

function isNewsItem(value: unknown): value is NewsItem {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<NewsItem>
  return (
    typeof item.id === 'number' &&
    typeof item.titulo === 'string' &&
    typeof item.conteudo === 'string' &&
    typeof item.categoria === 'string' &&
    typeof item.createdAt === 'string'
  )
}

async function readResponse(response: Response, fallbackMessage: string) {
  if (!response.ok) {
    if (response.status === 401) throw new Error('Sua sessão expirou')
    if (response.status === 404) throw new Error('Notícia não encontrada')
    throw new Error(fallbackMessage)
  }
  if (response.status === 204) return null
  return response.json() as Promise<unknown>
}

export async function listNews(token: string, signal?: AbortSignal) {
  return (await searchNews(token, {}, signal)).items
}

export interface NewsPage { items: NewsItem[]; total: number; page: number; limit: number }
export async function getNewsStats(token: string, signal?: AbortSignal): Promise<{ recent: number; important: number }> {
  const response = await fetch(`${API_URL}/news/stats`, { headers: { Authorization: `Bearer ${token}` }, signal })
  const data = await readResponse(response, 'Não foi possível carregar os totais do Jornal') as { recent: number; important: number } | null
  if (!data || typeof data.recent !== 'number' || typeof data.important !== 'number') throw new Error('Totais inválidos')
  return data
}
export async function searchNews(token: string, options: { page?: number; limit?: number; q?: string; categories?: string; authorId?: number } = {}, signal?: AbortSignal): Promise<NewsPage> {
  const params = new URLSearchParams({ page: String(options.page ?? 1), limit: String(options.limit ?? 12) })
  if (options.q) params.set('q', options.q)
  if (options.categories) params.set('categories', options.categories)
  if (options.authorId) params.set('authorId', String(options.authorId))
  const response = await fetch(`${API_URL}/news/search?${params}`, { headers: { Authorization: `Bearer ${token}` }, signal })
  const data = await readResponse(response, 'Não foi possível carregar o Jornal') as NewsPage | null
  if (!data || !Array.isArray(data.items) || !data.items.every(isNewsItem) || typeof data.total !== 'number') throw new Error('O Jornal retornou dados inválidos')
  return data
}

export async function getNews(id: number, token: string, signal?: AbortSignal) {
  const response = await fetch(`${API_URL}/news/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  })

  const data = await readResponse(response, 'Não foi possível carregar a notícia')
  if (!isNewsItem(data)) throw new Error('A notícia retornou dados inválidos')
  return data
}

export async function createNews(input: { titulo: string; conteudo: string; categoria: string; capa?: string }, token: string) {
  const response = await fetch(`${API_URL}/news`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const data = await readResponse(response, 'Não foi possível publicar a notícia')
  if (!isNewsItem(data)) throw new Error('A notícia retornou dados inválidos')
  return data
}


export async function updateNews(id: number, input: { titulo: string; conteudo: string; categoria: string; capa?: string }, token: string) {
  const response = await fetch(`${API_URL}/news/${id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const data = await readResponse(response, 'Não foi possível atualizar a notícia')
  if (!isNewsItem(data)) throw new Error('A notícia retornou dados inválidos')
  return data
}

export async function deleteNews(id: number, token: string) {
  const response = await fetch(`${API_URL}/news/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  await readResponse(response, 'Não foi possível excluir a notícia')
}
