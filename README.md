# ctn-system

Sistema de gestão desenvolvido para a **CEMTN**, com o objetivo de centralizar e facilitar processos administrativos e operacionais da escola.

> 🚧 **Status:** Em desenvolvimento

---

## 📋 Sobre o projeto

O **CTN System** é uma aplicação web full-stack planejada para auxiliar a escola CEMTN na organização e gerenciamento de suas operações.

O projeto está sendo desenvolvido com foco em:

* Organização e controle de informações
* Gestão de estoque
* Registro de movimentações
* Controle de produtos
* Futuras funcionalidades administrativas
* Interface simples, moderna e responsiva
* Arquitetura preparada para crescimento

---

## 🎯 Objetivos

O sistema tem como principais objetivos:

* Centralizar informações da escola em um único sistema
* Reduzir processos manuais
* Facilitar o controle de estoque e produtos
* Melhorar a visualização das informações
* Criar uma base sólida para futuras funcionalidades
* Aplicar boas práticas de desenvolvimento full-stack

---

## 🏗️ Arquitetura

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
```

### Frontend

Responsável pela interface e interação com o usuário.

**Tecnologias planejadas:**

* React
* TypeScript
* Vite
* React Router
* Tailwind CSS
* Zod

### Backend

Responsável pela API, regras de negócio e comunicação com o banco de dados.

**Tecnologias planejadas:**

* Node.js
* TypeScript
* NestJS
* Vitest

### Banco de dados

O banco de dados planejado é:

* PostgreSQL
* Prisma ORM

A implementação do banco será realizada posteriormente.

---

## 🛠️ Tecnologias

| Tecnologia   | Utilização              |
| ------------ | ----------------------- |
| React        | Interface               |
| TypeScript   | Tipagem                 |
| Vite         | Build e desenvolvimento |
| Tailwind CSS | Estilização             |
| React Router | Rotas                   |
| Zod          | Validação               |
| Node.js      | Runtime                 |
| NestJS       | Backend/API             |
| PostgreSQL   | Banco de dados          |
| Prisma       | ORM                     |
| Vitest       | Testes                  |
| Playwright   | Testes E2E              |
| Git          | Controle de versão      |
| GitHub       | Repositório             |

---

## 🚀 Executando o projeto

### Pré-requisitos

Antes de começar, tenha instalado:

* Node.js LTS
* npm
* Git

O PostgreSQL será necessário quando a integração com o banco de dados for implementada.

---

### Frontend

Entre na pasta:

```bash
cd frontend
```

Instale as dependências:

```bash
npm install
```

Execute o projeto:

```bash
npm run dev
```

O Vite exibirá no terminal o endereço local da aplicação.

---

### Backend

Em outro terminal, entre na pasta:

```bash
cd backend
```

Instale as dependências:

```bash
npm install
```

Execute o servidor em modo de desenvolvimento:

```bash
npm run start:dev
```

O backend será executado localmente na porta padrão do NestJS:

```text
http://localhost:3000
```

---

## 📌 Estado atual

### Concluído

* [x] Criação do repositório
* [x] Estrutura inicial do projeto
* [x] Configuração do frontend
* [x] React + TypeScript + Vite
* [x] Configuração inicial do backend
* [x] NestJS + TypeScript
* [x] Configuração inicial de testes
* [x] Backend executando localmente
* [x] Separação entre frontend e backend

### Em andamento

* [ ] Definição das regras de negócio
* [ ] Configuração do PostgreSQL
* [ ] Configuração do Prisma
* [ ] Modelagem do banco de dados
* [ ] Criação da API
* [ ] Integração frontend ↔ backend
* [ ] Sistema de autenticação
* [ ] Controle de usuários e permissões
* [ ] Módulo de estoque
* [ ] Dashboard

### Futuro

* [ ] Testes automatizados
* [ ] Testes E2E
* [ ] Docker
* [ ] Deploy do frontend
* [ ] Deploy do backend
* [ ] Monitoramento
* [ ] Documentação da API

---

## 🔐 Segurança

O sistema deverá utilizar boas práticas de segurança, incluindo:

* Validação de dados
* Controle de acesso
* Autenticação
* Autorização por função/permissão
* Variáveis de ambiente para informações sensíveis
* Senhas armazenadas de forma segura
* Proteção das rotas da API

Informações sensíveis **não devem ser armazenadas diretamente no código ou commitadas no Git**.

---

## 🌱 Desenvolvimento

O projeto utiliza Git para controle de versão.

Exemplo de fluxo:

```bash
git add .
git commit -m "feat: adiciona nova funcionalidade"
git push
```

### Padrão de commits

Será utilizado, sempre que possível, o padrão **Conventional Commits**:

```text
feat: nova funcionalidade
fix: correção de bug
refactor: refatoração
docs: documentação
test: testes
chore: configuração/manutenção
style: alterações de estilo
```

Exemplo:

```bash
git commit -m "chore: setup React frontend and NestJS backend"
```

---

## 📁 Organização do código

A aplicação será organizada de forma modular para facilitar:

* Manutenção
* Testes
* Escalabilidade
* Reutilização de código
* Separação de responsabilidades

No backend, o NestJS será organizado utilizando módulos, controllers e services.

No frontend, a aplicação será organizada por componentes, páginas, rotas e funcionalidades.

---

## 🗺️ Roadmap

```text
[✓] Estrutura inicial
     ↓
[✓] Frontend
     ↓
[✓] Backend
     ↓
[ ] Banco de dados
     ↓
[ ] Prisma
     ↓
[ ] Modelagem
     ↓
[ ] API
     ↓
[ ] Integração Frontend + Backend
     ↓
[ ] Autenticação
     ↓
[ ] Módulo de estoque
     ↓
[ ] Dashboard
     ↓
[ ] Testes
     ↓
[ ] Deploy
```

---

## 👨‍💻 Desenvolvimento

Projeto desenvolvido como sistema para a **CEMTN**, utilizando uma arquitetura full-stack moderna e preparada para evolução.

---

## 📄 Licença

Este projeto é destinado ao uso da CEMTN e seu código não possui licença pública definida neste momento.
