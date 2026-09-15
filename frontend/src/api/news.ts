const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export interface NewsItem {
  id: number
  titulo: string
  conteudo: string
  categoria: string
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
  return response.json() as Promise<unknown>
}

export async function listNews(token: string, signal?: AbortSignal) {
  const response = await fetch(`${API_URL}/news?page=1&limit=100`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  })

  const data = await readResponse(response, 'Não foi possível carregar o Jornal')
  if (!Array.isArray(data)) throw new Error('O Jornal retornou dados inválidos')
  return data.filter(isNewsItem)
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
