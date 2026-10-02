# Arquitetura

Next.js App Router/TypeScript strict hospeda interface, leituras autenticadas e APIs internas. O navegador recebe apenas a chave publicável. O Supabase fornece Auth e PostgreSQL; RLS aplica isolamento por organização e papel (`admin`, `manager`, `sales`, `viewer`).

O modelo separa contas, contatos, lotes agregados, eventos atômicos, reuniões, oportunidades, mudanças de estágio, próximas ações, evidências, importações, conflitos e auditoria. Valores monetários usam `numeric`; datas operacionais usam `date` ou `timestamptz` e são apresentadas em `America/Sao_Paulo`.

O Excel existe somente como origem histórica da migração. Após reconciliação e aceite explícito, o Supabase poderá ser promovido a fonte operacional. Não existe sincronização bidirecional no MVP.

## Autorização

`anon` não possui acesso a tabelas. Usuários autenticados precisam de associação ativa à organização. Papéis de leitura não podem escrever; operações administrativas e importações são restritas. Toda mutação normal passa por validação e chave de idempotência.

