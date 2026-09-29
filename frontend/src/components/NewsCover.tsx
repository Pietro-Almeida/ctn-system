import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth/auth-context'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export default function NewsCover({ src, alt }: { src: string; alt: string }) {
  const { token } = useAuth()
  const element = useRef<HTMLImageElement>(null)
  const [image, setImage] = useState<{ source: string; url: string } | null>(null)
  useEffect(() => {
    if (!src.startsWith('/news/') || !token) return
    const controller = new AbortController()
    let objectUrl: string | undefined
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return
      observer.disconnect()
      void fetch(`${API_URL}${src}`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal })
        .then(async (response) => {
          if (!response.ok) return
          const blob = await response.blob()
          if (controller.signal.aborted) return
          objectUrl = URL.createObjectURL(blob)
          setImage({ source: src, url: objectUrl })
        }).catch(() => { /* Keep the article readable if its cover is unavailable. */ })
    }, { rootMargin: '200px' })
    if (element.current) observer.observe(element.current)
    return () => { controller.abort(); observer.disconnect(); if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [src, token])
  const resolved = src.startsWith('data:image/') ? src : image?.source === src ? image.url : undefined
  return <img ref={element} src={resolved} alt={alt} loading="lazy" decoding="async" />
}
