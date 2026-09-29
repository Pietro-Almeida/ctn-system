# Jornal: paginação e capas

`GET /news/search?page=1&limit=12&q=termo&categories=CIENCIAS,PROJETO` retorna
`{ items, total, page, limit }`. A busca considera título e conteúdo, ignorando
maiúsculas e acentos comuns do português. `authorId` permite filtrar por autor.
Listagens trazem resumos de até 240 caracteres; `GET /news/:id` retorna o texto completo.
`GET /news/stats` retorna os totais dos últimos sete dias para o painel do aluno.

As capas são arquivos binários em `backend/uploads/news` quando o servidor é
iniciado na pasta `backend`. Configure `NEWS_COVERS_DIR` com um caminho absoluto
para alterar o local. O banco guarda a referência do arquivo; a API retorna uma
URL relativa `/news/:id/cover`, que exige a mesma autenticação das notícias.
O frontend busca essas imagens com Bearer, sem incluir tokens na URL.

Capas antigas em Base64 são convertidas para arquivos no primeiro acesso à imagem.
Novas capas continuam sendo enviadas no cadastro/edição como Data URL, mas são
decodificadas antes de persistir. Ao editar somente texto, omita `capa`.
Em produção, essa pasta precisa estar em armazenamento persistente e incluída
nos backups junto com o banco. Arquivos antigos não são apagados automaticamente.
