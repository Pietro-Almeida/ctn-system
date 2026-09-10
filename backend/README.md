# Backend CTN System

API da primeira fase do CTN System, independente do frontend. Implementa usuários, autenticação, Jornal e Comunidades com PostgreSQL 18 local.

## Executar

No terminal da pasta `backend`:

```powershell
npm.cmd ci
npm.cmd run db:check
npm.cmd run start:dev
```

Configure `DATABASE_URL` em `.env` conforme `.env.example`. Esse arquivo é ignorado pelo Git. A API usa porta 3000 por padrão; `PORT` altera a porta. Não inicie duas instâncias na mesma porta.

Para um banco novo, crie um banco vazio de desenvolvimento, configure a URL e execute:

```powershell
npm.cmd run db:init
npm.cmd run db:seed
npm.cmd run admin:create
```

O último comando pede os dados do primeiro diretor em terminal interativo, com senha oculta. Ele recusa execução quando já existe um diretor e não altera contas existentes. Diretores adicionais são cadastrados pela API autenticada.

## Documentação e testes sem frontend

Importe [docs/openapi.json](docs/openapi.json) no Postman ou em outra ferramenta compatível com OpenAPI 3.0. A especificação contém os corpos, parâmetros e permissões de 34 operações. Há exemplos em [docs/requests.http](docs/requests.http).

1. Envie `POST /auth/login` com `email` e `senha`.
2. Copie o `access_token` recebido.
3. Nas demais rotas, use o cabeçalho `Authorization: Bearer TOKEN`.

`GET /health` verifica o banco e retorna 200 quando disponível ou 503 se não conseguir consultar. `GET /` mantém a resposta inicial do projeto. Essas duas rotas, login e consumo do código de recuperação são públicas; todas as demais exigem autenticação.

`CORS_ORIGINS` aceita origens separadas por vírgula; padrão: `http://localhost:5173`. Postman e testes HTTP não dependem de CORS.

## Funcionalidades e regras

### Usuários

- `GET /roles`: retorna IDs reais dos perfis disponíveis no banco.
- `GET /users`, `GET /users/:id`, `POST /users`, `PATCH /users/:id`: somente direção.
- Cadastro exige nome, e-mail, senha de 12 a 128 caracteres e perfil `ALUNO`, `PROFESSOR` ou `DIRECAO`.
- E-mails são normalizados para minúsculas; conflitos, inclusive concorrentes, retornam 409.
- Edição aceita nome, e-mail, perfil e `ativo`. Envie `{"ativo": false}` para desativar e `{"ativo": true}` para reativar.
- O último diretor ativo não pode ser desativado nem perder o perfil, inclusive em alterações concorrentes.
- Alterar e-mail/perfil ou desativar revoga sessões e códigos de recuperação da conta.
- Usuários são desativados, não excluídos, preservando a autoria dos conteúdos. Listagens nunca retornam hashes de senha.
- Os perfis legados SOE e COORDENACAO foram preservados no banco, mas não estão disponíveis para novos cadastros nesta fase.

### Autenticação e recuperação de senha

- `POST /auth/login`: credenciais inválidas, hash legado ou conta inativa retornam a mesma mensagem de 401.
- `GET /auth/me`: identidade e perfil atual.
- `POST /auth/logout`: encerra a sessão atual.
- `POST /auth/change-password`: recebe `senhaAtual` e `novaSenha`; troca a senha e encerra todas as sessões.
- `POST /users/:id/password-reset`: somente direção; gera código válido por 15 minutos, retornado uma única vez nesta resposta.
- `POST /auth/reset-password`: recebe `token` e `novaSenha`; consome o código e encerra todas as sessões do usuário.
- Recuperação é assistida: a direção confirma a identidade e entrega o código por um canal privado. Não há envio automático de e-mail nem rota pública que revele se um e-mail existe.
- Gerar novo código invalida o anterior. Código expirado, já consumido ou vinculado a conta inativa não funciona. Consumo concorrente permite somente uma troca.
- Tokens de sessão possuem 256 bits aleatórios e validade de uma hora, sem renovação automática. Apenas o hash SHA-256 fica no PostgreSQL. Reiniciar o servidor não encerra sessões válidas.
- Senhas usam scrypt com salt aleatório. Os hashes antigos `TEMPORARIO` são rejeitados e podem ser substituídos pelo fluxo de recuperação.
- Limite de 10 tentativas por minuto por IP no login e recuperação; troca autenticada de senha usa o ID do usuário. Contadores persistem no banco.
- Ao publicar, use HTTPS e configure explicitamente proxies confiáveis antes de alterar a identificação de IP.

### Jornal

- Todos os usuários autenticados leem `GET /news` e `GET /news/:id`.
- Direção e professores criam com `POST /news`: `titulo`, `conteudo`, `categoria`.
- Categorias: AVISO, EVENTO, INFORMACAO, PROJETO, COMUNICADO, NOTICIA e ATIVIDADE.
- Autor com perfil de publicação ou direção pode editar (`PATCH`) e excluir (`DELETE`).
- Conteúdo é texto; o cliente não deve interpretá-lo como HTML.

### Comunidades

- Todos os autenticados listam comunidades e consultam nome, descrição e regras.
- Direção e professores criam comunidades; o criador participa automaticamente.
- Qualquer usuário ativo pode entrar com `POST /communities/:id/members/me` e sair com `DELETE` na mesma rota.
- O criador não pode sair nem ser removido. Participar novamente não duplica o vínculo.
- Criador e direção editam/excluem a comunidade e removem participantes. Remover um participante não é banimento: comunidades são abertas para nova participação.
- Conteúdos e lista de participantes são acessíveis aos membros, criador e direção; a lista de participantes não expõe e-mails.
- Membros publicam em `/communities/:id/posts` e comentam em `/communities/:id/posts/:postId/comments`.
- Autor que ainda participa, criador e direção podem editar/excluir a publicação ou comentário.
- IDs de publicações e comentários são verificados contra a comunidade e publicação informadas na URL.
- Excluir comunidade remove seus vínculos, publicações e comentários atomicamente. Excluir publicação remove seus comentários.

Todas as listas de recursos aceitam `page` (padrão 1) e `limit` (padrão 20, máximo 100), exceto a pequena lista de perfis. Retornam arrays em ordem estável. Campos desconhecidos, nulos indevidos e textos vazios retornam 400.

## Banco e manutenção

O contrato `src/prisma/contract.prisma` define tabelas, relacionamentos e índices. Prisma Next emite os arquivos de contrato e aplica o esquema. As consultas da API usam `pg` com parâmetros e transações através de `DatabaseService`; os diagnósticos também validam o contrato pelo cliente Prisma.

Após alterar o esquema:

```powershell
npm.cmd run contract:emit
npm.cmd run db:init -- --dry-run
npm.cmd run db:init
npm.cmd run db:check
```

`db:init` aplica mudanças aditivas e recusa mudanças destrutivas. Versione contrato, tipos gerados, snapshots e referências de migração. Use backup e revisão da prévia antes de aplicar alterações em outro ambiente.

Execute `npm.cmd run db:cleanup` periodicamente (por exemplo, diariamente pelo agendador do ambiente) para remover sessões, códigos e contadores expirados. A validade é checada nas consultas mesmo antes da limpeza.

## Verificação automatizada

```powershell
npm.cmd test
npm.cmd run test:integration
npm.cmd run build
npm.cmd run lint
```

`test:integration` cria um banco temporário com nome aleatório `ctn_test_...`, aplica o contrato, testa HTTP com PostgreSQL real e remove somente esse banco ao terminar. O usuário configurado precisa poder criar bancos de teste. O banco de desenvolvimento não é truncado nem recebe usuários de teste.

Os testes cobrem persistência após reinício, autenticação, expiração, logout, limites, recuperação de uso único, concorrência no cadastro e proteção do último diretor, validação, paginação, Jornal, participação, autoria, moderação e remoção de conteúdo relacionado.

`npm run test:e2e` sem o executor de integração roda apenas o teste público básico; os testes que alteram dados são ignorados sem um banco isolado válido.

## Limites do escopo

Esta entrega cobre a primeira fase descrita no README principal. O frontend, envio automático de e-mail, uploads de imagens/anexos e os módulos futuros (estoque, notas, horários, requerimentos e dashboards) não fazem parte desta fase.
