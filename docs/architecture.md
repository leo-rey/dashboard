# Arquitetura

Next.js App Router/TypeScript strict hospeda a interface na Vercel. O dashboard consulta o PostgreSQL do Supabase somente no servidor, usando `DATABASE_URL` privada. O navegador não recebe senha, chave administrativa nem acesso direto às tabelas.

O modelo separa contas, contatos, lotes agregados, eventos atômicos, reuniões, oportunidades, mudanças de estágio, próximas ações, evidências, importações, conflitos e auditoria. Valores monetários usam `numeric`; datas operacionais usam `date` ou `timestamptz` e são apresentadas em `America/Sao_Paulo`.

O Excel permanece como referência histórica da migração concluída em 02/10/2026. O Supabase é a fonte operacional do dashboard. Não existe sincronização bidirecional no MVP.

## Acesso

O dashboard abre diretamente, sem tela de login, conforme decisão do proprietário em 02/10/2026. `anon` continua sem acesso às tabelas do Supabase; a leitura ocorre no servidor da Vercel. A URL publicada deve ser tratada como compartilhável.
