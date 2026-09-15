import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from '../layouts/AppLayout'
import StudentDashboard from '../pages/student/StudentDashboard'
import StudentCommunitiesPage from '../pages/student/StudentCommunitiesPage'
import JournalPage from '../pages/journal/JournalPage'
import LoginPage from '../pages/LoginPage'
import AccessDeniedPage from '../pages/AccessDeniedPage'
import RoutePlaceholder from '../pages/RoutePlaceholder'
import HomeRedirect from './HomeRedirect'
import ProtectedRoute from './ProtectedRoute'

const page = (title: string, description: string) => (
  <RoutePlaceholder title={title} description={description} />
)

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/acesso-negado" element={<AccessDeniedPage />} />

      <Route element={<ProtectedRoute allowedRoles={['ALUNO']} />}>
        <Route element={<AppLayout />}>
          <Route path="/aluno/inicio" element={<StudentDashboard />} />
          <Route path="/aluno/jornal" element={<JournalPage />} />
          <Route path="/aluno/jornal/:noticiaId" element={page('Notícia', 'Leitura completa da publicação.')} />
          <Route path="/aluno/comunidades" element={<StudentCommunitiesPage />} />
          <Route path="/aluno/comunidades/:comunidadeId" element={page('Comunidade', 'Conteúdo e interações da comunidade.')} />
          <Route path="/aluno/perfil" element={page('Meu perfil', 'Dados do aluno autenticado.')} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['PROFESSOR']} />}>
        <Route element={<AppLayout />}>
          <Route path="/professor/inicio" element={page('Painel do Professor', 'Resumo das publicações e comunidades do professor.')} />
          <Route path="/professor/jornal" element={<JournalPage />} />
          <Route path="/professor/jornal/:noticiaId" element={page('Notícia', 'Leitura completa da publicação.')} />
          <Route path="/professor/jornal/nova" element={page('Nova publicação', 'Editor de publicações autorizado para professores.')} />
          <Route path="/professor/comunidades" element={page('Minhas comunidades', 'Comunidades criadas ou acompanhadas pelo professor.')} />
          <Route path="/professor/comunidades/nova" element={page('Criar comunidade', 'Cadastro de uma nova comunidade.')} />
          <Route path="/professor/comunidades/:comunidadeId" element={page('Comunidade', 'Conteúdo e administração da comunidade.')} />
          <Route path="/professor/comunidades/:comunidadeId/editar" element={page('Editar comunidade', 'Configurações da comunidade do professor.')} />
          <Route path="/professor/perfil" element={page('Meu perfil', 'Dados do professor autenticado.')} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['DIRECAO']} />}>
        <Route element={<AppLayout />}>
          <Route path="/diretor/inicio" element={page('Painel da Direção', 'Visão administrativa do CTN System.')} />
          <Route path="/diretor/jornal" element={<JournalPage />} />
          <Route path="/diretor/jornal/:noticiaId" element={page('Notícia', 'Leitura completa da publicação.')} />
          <Route path="/diretor/jornal/nova" element={page('Nova publicação', 'Editor de publicações autorizado para a Direção.')} />
          <Route path="/diretor/comunidades" element={page('Gestão de comunidades', 'Comunidades criadas e acompanhadas pela Direção.')} />
          <Route path="/diretor/comunidades/nova" element={page('Criar comunidade', 'Cadastro de uma nova comunidade.')} />
          <Route path="/diretor/comunidades/:comunidadeId" element={page('Comunidade', 'Conteúdo e administração da comunidade.')} />
          <Route path="/diretor/usuarios" element={page('Gestão de usuários', 'Área exclusiva da Direção.')} />
          <Route path="/diretor/usuarios/novo" element={page('Cadastrar usuário', 'Cadastro exclusivo da Direção.')} />
          <Route path="/diretor/usuarios/:usuarioId/editar" element={page('Editar usuário', 'Alteração de dados e acesso do usuário.')} />
          <Route path="/diretor/perfil" element={page('Meu perfil', 'Dados do diretor autenticado.')} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
