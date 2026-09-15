import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/auth-context'
import './StudentDashboard.css'

type IconName = 'news' | 'communities' | 'bell' | 'sigma' | 'chart' | 'science' | 'chat' | 'document' | 'arrow' | 'chevron'

interface IconProps {
  name: IconName
  size?: number
}

const highlights = [
  {
    category: 'COMUNICADO',
    date: '14 SET 2026',
    title: 'Semana de avaliações começa na próxima segunda-feira',
    description: 'Confira o cronograma, as orientações e dicas para se preparar bem.',
  },
  {
    category: 'CIÊNCIAS',
    date: '12 SET 2026',
    title: 'Feira de Ciências será realizada em outubro',
    description: 'Inscrições abertas para projetos individuais ou em grupo.',
  },
]

const communities = [
  { icon: 'sigma' as const, name: 'Matemática · 3º ano', detail: '28 publicações recentes' },
  { icon: 'chart' as const, name: 'Preparação PAS', detail: '20 publicações recentes' },
  { icon: 'science' as const, name: 'Feira de Ciências', detail: '15 publicações recentes' },
]

const activities = [
  { icon: 'chat' as const, text: 'Mariana Oliveira publicou em Preparação PAS', time: 'Há 1 hora' },
  { icon: 'chat' as const, text: 'Pedro Alves respondeu em Matemática · 3º ano', time: 'Há 3 horas' },
  { icon: 'document' as const, text: 'Nova publicação em Feira de Ciências', time: 'Há 5 horas' },
  { icon: 'bell' as const, text: 'Novo comunicado no Jornal', time: 'Há 1 dia' },
]

function Icon({ name, size = 20 }: IconProps) {
  const paths: Record<IconName, ReactNode> = {
    news: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 7h8M8 11h8M8 15h5" /></>,
    communities: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2M16 5a3 3 0 0 1 0 6M17 14a4 4 0 0 1 4 4v2" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
    sigma: <path d="M18 4H6l6 8-6 8h12" />,
    chart: <path d="M5 20V10M12 20V4M19 20v-7" />,
    science: <><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3" /><path d="M8 15h8" /></>,
    chat: <path d="M21 12a8 8 0 0 1-8 8H5l-3 2 1-5a9 9 0 1 1 18-5Z" />,
    document: <><path d="M6 3h9l3 3v15H6z" /><path d="M14 3v4h4M9 12h6M9 16h6" /></>,
    arrow: <path d="m9 18 6-6-6-6" />,
    chevron: <path d="m15 18-6-6 6-6" />,
  }

  return (
    <svg className="student-icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {paths[name]}
    </svg>
  )
}

function SectionHeader({ title, to }: { title: string; to: string }) {
  return (
    <div className="student-section-header">
      <h2>{title}</h2>
      <Link to={to}>Ver todas <Icon name="arrow" size={15} /></Link>
    </div>
  )
}

export default function StudentDashboard() {
  const { user } = useAuth()
  const [activeHighlight, setActiveHighlight] = useState(0)
  const firstName = user?.nome.trim().split(/\s+/)[0] ?? 'Aluno'
  const highlight = highlights[activeHighlight]

  function changeHighlight(direction: -1 | 1) {
    setActiveHighlight((current) =>
      (current + direction + highlights.length) % highlights.length,
    )
  }

  return (
    <main className="student-dashboard">
      <header className="student-welcome">
        <div>
          <div className="student-welcome__title">
            <h1>Olá, {firstName}.</h1>
            <span>Aluno</span>
          </div>
          <p>Acompanhe as novidades e participe da comunidade CEMTN.</p>
        </div>
      </header>

      <section className="student-stats" aria-label="Resumo do aluno">
        <Link to="/aluno/jornal" className="student-stat student-stat--primary">
          <span className="student-stat__icon"><Icon name="news" /></span>
          <span><small>Publicações novas</small><strong>05</strong></span>
          <Icon name="arrow" size={18} />
        </Link>
        <Link to="/aluno/comunidades" className="student-stat">
          <span className="student-stat__icon"><Icon name="communities" /></span>
          <span><small>Minhas comunidades</small><strong>03</strong></span>
        </Link>
        <Link to="/aluno/jornal" className="student-stat">
          <span className="student-stat__icon"><Icon name="bell" /></span>
          <span><small>Avisos importantes</small><strong>02</strong></span>
        </Link>
      </section>

      <div className="student-dashboard__grid">
        <section className="student-dashboard__news">
          <SectionHeader title="Destaques do Jornal" to="/aluno/jornal" />

          <article className="student-highlight">
            <div className="student-highlight__content">
              <div className="student-highlight__meta">
                <span>{highlight.category}</span>
                <time>{highlight.date}</time>
              </div>
              <h3>{highlight.title}</h3>
              <p>{highlight.description}</p>
            </div>
            <div className="student-highlight__art" aria-hidden="true"><i /><b /></div>
            <button type="button" className="student-carousel-arrow student-carousel-arrow--previous" onClick={() => changeHighlight(-1)} aria-label="Destaque anterior">
              <Icon name="chevron" />
            </button>
            <button type="button" className="student-carousel-arrow student-carousel-arrow--next" onClick={() => changeHighlight(1)} aria-label="Próximo destaque">
              <Icon name="arrow" />
            </button>
            <div className="student-carousel-dots" aria-label="Posição do carrossel">
              {highlights.map((item, index) => (
                <button key={item.title} type="button" className={index === activeHighlight ? 'active' : ''} onClick={() => setActiveHighlight(index)} aria-label={`Mostrar destaque ${index + 1}`} />
              ))}
            </div>
          </article>

          <div className="student-headlines">
            <article>
              <div className="student-headline-art student-headline-art--education" />
              <div><span>EDUCAÇÃO</span><time>12 SET 2026</time><h3>Novos projetos ampliam o acervo da biblioteca</h3><p>Iniciativas buscam aproximar ainda mais os alunos da leitura.</p></div>
            </article>
            <article>
              <div className="student-headline-art student-headline-art--science" />
              <div><span>CIÊNCIAS</span><time>10 SET 2026</time><h3>Feira de Ciências será realizada em outubro</h3><p>Inscrições abertas para projetos individuais ou em grupo.</p></div>
            </article>
          </div>
        </section>

        <aside className="student-dashboard__side">
          <section className="student-panel">
            <SectionHeader title="Minhas comunidades" to="/aluno/comunidades" />
            <div className="student-community-list">
              {communities.map((community) => (
                <Link to="/aluno/comunidades/1" key={community.name}>
                  <span className="student-list-icon"><Icon name={community.icon} /></span>
                  <span><strong>{community.name}</strong><small>{community.detail}</small></span>
                  <Icon name="arrow" size={16} />
                </Link>
              ))}
            </div>
          </section>

          <section className="student-panel">
            <SectionHeader title="Atividade recente" to="/aluno/comunidades" />
            <div className="student-activity-list">
              {activities.map((activity) => (
                <div key={activity.text}>
                  <span className="student-list-icon"><Icon name={activity.icon} size={17} /></span>
                  <span><strong>{activity.text}</strong><small>{activity.time}</small></span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </main>
  )
}
