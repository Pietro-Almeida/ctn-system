# CTN System

Sistema de gestão desenvolvido para a **CEMTN**, com o objetivo de centralizar informações, melhorar a comunicação interna e facilitar processos administrativos e escolares.

> 🚧 **Status:** Em desenvolvimento — Fase Inicial

---

## 📋 Sobre o projeto

O **CTN System** é uma aplicação web full-stack desenvolvida para auxiliar a escola CEMTN na organização de suas atividades.

Nesta primeira fase, o sistema será focado em três tipos de usuários:

- Diretor
- Professor
- Aluno

Cada perfil terá permissões diferentes dentro da aplicação.

As funcionalidades iniciais estarão concentradas principalmente em:

- Gerenciamento de usuários
- Autenticação e controle de acesso
- Jornal da escola
- Comunidades
- Interação entre alunos, professores e direção

O projeto será desenvolvido de forma modular, permitindo a implementação de novos módulos futuramente, como estoque, requerimentos, horários, notas, dashboards administrativos e outras funcionalidades da escola.

---

## 🎯 Objetivos

O CTN System tem como principais objetivos:

- Centralizar informações da escola em um único sistema
- Melhorar a comunicação entre direção, professores e alunos
- Criar um ambiente digital para divulgação de informações
- Permitir a criação de comunidades escolares
- Facilitar a interação entre usuários
- Controlar o acesso às funcionalidades de acordo com o perfil
- Reduzir processos manuais
- Criar uma base sólida para futuras funcionalidades
- Aplicar boas práticas de desenvolvimento full-stack
- Construir uma arquitetura preparada para crescimento

---

# 👥 Perfis de usuário

Nesta primeira fase existirão três perfis principais.

## 👨‍💼 Diretor

O Diretor será o perfil com maior nível de permissão dentro do sistema.

Inicialmente poderá:

- Fazer login no sistema
- Acessar o Jornal
- Criar publicações no Jornal
- Criar Comunidades
- Acompanhar as Comunidades criadas
- Criar usuários
- Criar outros Diretores
- Criar Professores
- Criar Alunos
- Gerenciar informações básicas dos usuários

O Diretor será responsável principalmente pela administração do sistema.

---

## 👨‍🏫 Professor

O Professor terá acesso às funcionalidades relacionadas à comunicação e interação com os alunos.

Inicialmente poderá:

- Fazer login no sistema
- Acessar o Jornal
- Criar publicações no Jornal
- Criar Comunidades
- Acompanhar as Comunidades criadas
- Publicar conteúdos dentro das Comunidades
- Interagir com os participantes das Comunidades

---

## 🎓 Aluno

O Aluno terá um nível de acesso voltado principalmente para consulta e interação.

Inicialmente poderá:

- Fazer login no sistema
- Visualizar publicações do Jornal
- Acessar Comunidades
- Participar das Comunidades disponíveis
- Visualizar conteúdos publicados
- Interagir dentro das Comunidades

O Aluno não poderá criar usuários nem administrar o sistema.

---

# 🔐 Controle de permissões

As funcionalidades disponíveis dependerão do perfil do usuário autenticado.

| Funcionalidade | Diretor | Professor | Aluno |
|---|:---:|:---:|:---:|
| Visualizar Jornal | ✅ | ✅ | ✅ |
| Publicar no Jornal | ✅ | ✅ | ❌ |
| Criar Comunidade | ✅ | ✅ | ❌ |
| Participar de Comunidade | ✅ | ✅ | ✅ |
| Publicar em Comunidade | ✅ | ✅ | ✅ |
| Criar Aluno | ✅ | ❌ | ❌ |
| Criar Professor | ✅ | ❌ | ❌ |
| Criar Diretor | ✅ | ❌ | ❌ |
| Gerenciar usuários | ✅ | ❌ | ❌ |

As permissões poderão ser expandidas conforme o desenvolvimento do sistema.

---

# 📰 Jornal

O módulo de **Jornal** será responsável pela comunicação institucional dentro da plataforma.

Professores e Diretores poderão criar publicações para divulgar:

- Avisos
- Eventos
- Informações escolares
- Projetos
- Comunicados
- Notícias
- Atividades

Os Alunos poderão visualizar essas publicações.

Inicialmente, apenas usuários autorizados poderão criar conteúdo no Jornal.

---

# 💬 Comunidades

As **Comunidades** serão espaços destinados à interação entre usuários.

Diretores e Professores poderão criar Comunidades com diferentes finalidades, como:

- Turmas
- Projetos
- Grêmios
- Clubes
- Eventos
- Atividades escolares
- Grupos de estudo
- Assuntos específicos

Os Alunos poderão entrar ou participar das Comunidades disponíveis e interagir dentro delas.

Uma Comunidade poderá possuir, futuramente:

- Nome
- Descrição
- Criador
- Participantes
- Publicações
- Comentários
- Data de criação
- Imagem
- Regras da comunidade

---

# 🏗️ Arquitetura

O projeto utiliza uma arquitetura separando frontend e backend:

```text
ctn-system/

├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── ...
│
├── backend/
│   ├── src/
│   ├── test/
│   ├── package.json
│   └── ...
│
└── README.md

BACKEND V1 ✅
├── PostgreSQL ✅
├── Usuários ✅
├── Autenticação ✅
├── Permissões ✅
├── Jornal ✅
├── Comunidades ✅
├── Testes unitários ✅
├── Testes HTTP/E2E ✅
└── OpenAPI/Postman ✅

FRONTEND 🚧
├── Login
├── Sessão
├── Dashboard
├── Jornal
├── Comunidades
├── Usuários do Diretor
├── Perfil
└── Identidade visual CEMTN