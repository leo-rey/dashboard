# Cockpit Comercial Antlia

Aplicação web autenticada para a operação comercial da Antlia. O projeto substitui a persistência local e a leitura da planilha em runtime por Next.js, Supabase Auth/Postgres/RLS e deploy na Vercel.

## Estado da migração

- A planilha permanece a fonte operacional durante a fase de reconciliação.
- O schema Supabase está versionado em `supabase/migrations`.
- A promoção dos dados para as tabelas oficiais está bloqueada até aprovação do relatório de dry-run.
- O arquivo Excel e o snapshot com contatos reais são ignorados pelo Git e não devem ser publicados.

## Desenvolvimento

1. Copie `.env.example` para `.env.local` e informe somente a URL e a chave publicável.
2. Execute `pnpm install`, `pnpm dev` e abra `http://localhost:3000`.
3. Execute `pnpm lint`, `pnpm typecheck`, `pnpm test` e `pnpm build` antes de publicar.

Cadastros públicos devem permanecer desabilitados no Supabase. Usuários entram por convite/magic link previamente autorizado.

## Segurança

- Nunca use senha do Postgres, `service_role` ou `sb_secret_` no navegador.
- Todas as tabelas expostas usam RLS com escopo por organização e papel.
- Dados reais não entram em fixtures nem assets públicos.
- A senha compartilhada durante a configuração deve ser rotacionada antes da produção.

## Documentação

- [Arquitetura](docs/architecture.md)
- [Migração e reconciliação](docs/migration.md)
- [Deploy e rollback](docs/runbook.md)
- [Definições de indicadores](docs/metrics.md)

