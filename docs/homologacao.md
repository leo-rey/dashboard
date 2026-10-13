# Plano de atuação - Homologação e entrada controlada

## Contexto usado

- Chat "Prompt dashboard homologação": unir o prompt de requisitos com a análise técnica do dashboard atual.
- Reunião com Leandro em 13/10/2026: a homologação de fornecedores é um processo separado da prospecção e precisa mostrar empresa, status, ações realizadas e cadência semanal/mensal.
- Planilha `Base_Comercial_Unica_Antlia.xlsx`: referência de campos para contatos, atividades e oportunidades; a aba Dashboard da planilha não deve voltar a ser fonte operacional.
- Código atual: Next.js, Supabase/Postgres, Vercel, APIs autenticadas e dashboard público sem login.

## Prompt unificado de execução

Atue como arquiteto full-stack senior em Next.js, Supabase/Postgres e produto comercial B2B.

Objetivo: evoluir o Cockpit Comercial Antlia sem reconstruir a aplicação. Corrija a leitura incompleta de contatos, adicione o módulo de Homologação de fornecedores e crie uma entrada controlada para que o ChatGPT/workspace do Leandro envie dados estruturados sem acessar diretamente o banco.

Requisitos funcionais:

1. Remover o limite que fazia a dashboard carregar apenas 500 contatos.
2. Manter o dashboard público atual sem login, conforme decisão documentada.
3. Criar uma visão "Homologação" separada de Prospecção.
4. Exibir empresas em homologação com responsável, status, última ação, próxima ação, prazo, contato/área de compras, portal e evidência.
5. Usar status controlados: `a_validar`, `pre_cadastro`, `email_compras`, `reuniao_compras`, `em_homologacao`, `homologada`, `bloqueada`, `sem_avanco`.
6. Permitir busca, paginação e exportação CSV dos registros de homologação.
7. Criar endpoint privado autenticado para inserir/atualizar homologações com validação, escopo por organização e idempotência.
8. Preservar as APIs existentes de atividades e oportunidades.
9. Não importar novamente a planilha indiscriminadamente; qualquer conciliação futura deve ser auditável.

Requisitos não funcionais:

- Não gravar segredos em arquivos versionados.
- Não expor escrita pública sem autenticação.
- Não dar acesso direto ao banco para automações do ChatGPT.
- Validar URLs, datas, status e chaves de idempotência.
- Manter RLS e escopo por organização.
- Não inventar métricas: mostrar apenas dados persistidos.
- Rodar lint, typecheck, testes e build antes de declarar conclusão.

Critérios de aceite:

- A dashboard carrega todos os contatos retornados pelo banco, não apenas 500.
- A aba Homologação aparece no cockpit, com KPIs, tabela, filtro, paginação e CSV.
- A tabela `supplier_homologations` existe em migração versionada com RLS.
- `POST /api/homologations` exige usuário autenticado, membership ativa, valida payload e é idempotente.
- Documentação explica que a entrada controlada substitui acesso direto ao banco.
- Testes cobrem a validação básica do intake de homologação.

## Decisões aplicadas

- A "tela oculta" foi implementada como API privada autenticada, não como formulário público escondido por URL.
- A tela pública mostra a visão operacional de Homologação, mas não permite escrita sem sessão.
- A planilha segue como referência histórica; o Supabase continua sendo a fonte operacional.
