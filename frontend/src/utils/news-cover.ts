const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_SOURCE_SIZE = 8 * 1024 * 1024
const MAX_DATA_URL_LENGTH = 1_400_000
const MAX_DIMENSION = 1600

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    const url = URL.createObjectURL(file)
    image.onload = () => { URL.revokeObjectURL(url); resolve(image) }
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Não foi possível ler a imagem')) }
    image.src = url
  })
}

export async function prepareNewsCover(file: File) {
  if (!ACCEPTED_TYPES.has(file.type)) throw new Error('Use uma imagem JPEG, PNG ou WebP')
  if (file.size > MAX_SOURCE_SIZE) throw new Error('A imagem original deve ter no máximo 8 MB')
  const image = await loadImage(file)
  const scale = Math.min(1, MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Seu navegador não conseguiu preparar a imagem')
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  const cover = canvas.toDataURL('image/jpeg', 0.82)
  if (cover.length <= MAX_DATA_URL_LENGTH) return cover
  const smaller = canvas.toDataURL('image/jpeg', 0.65)
  if (smaller.length > MAX_DATA_URL_LENGTH) throw new Error('A imagem ficou muito grande. Escolha uma capa mais simples')
  return smaller
}
