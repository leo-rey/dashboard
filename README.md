# Cockpit Comercial Antlia

Aplicação web de acesso direto para a operação comercial da Antlia. O projeto substitui a persistência local e a leitura da planilha em runtime por Next.js, Supabase/Postgres/RLS e deploy na Vercel.

## Estado da migração

- O Supabase é a fonte operacional após a importação reconciliada de 02/10/2026.
- O schema Supabase está versionado em `supabase/migrations`.
- A importação preserva IDs legados, fontes, evidências e lotes históricos agregados.
- O arquivo Excel e o snapshot com contatos reais são ignorados pelo Git e não devem ser publicados.

## Desenvolvimento

1. Copie `.env.example` para `.env.local` e informe somente a URL e a chave publicável.
2. Execute `pnpm install`, `pnpm dev` e abra `http://localhost:3000`.
3. Execute `pnpm lint`, `pnpm typecheck`, `pnpm test` e `pnpm build` antes de publicar.

O dashboard não exige login, conforme decisão do proprietário em 02/10/2026.

## Segurança

- Nunca use senha do Postgres, `service_role` ou `sb_secret_` no navegador.
- As tabelas operacionais usam RLS, com leitura anônima para permitir acesso direto ao dashboard.
- Dados reais não entram em fixtures nem assets públicos.
- A senha compartilhada durante a configuração deve ser rotacionada antes da produção.

## Documentação

- [Arquitetura](docs/architecture.md)
- [Migração e reconciliação](docs/migration.md)
- [Deploy e rollback](docs/runbook.md)
- [Definições de indicadores](docs/metrics.md)
