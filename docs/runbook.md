# Deploy e rollback

1. Configurar `DATABASE_URL` como variável sensível na Vercel. Nunca usar prefixo `NEXT_PUBLIC_` nessa variável. Para Vercel/serverless, usar o Supavisor em modo transação na porta `6543`, pois a conexão direta do Supabase depende de IPv6.
2. Aplicar migrações em ambiente controlado e executar advisors/RLS tests.
3. Rodar lint, typecheck, testes, build e dry-run.
4. Publicar branch em Preview pela integração GitHub–Vercel.
5. Executar smoke test: abertura direta, seis visões, recarregamento, filtros e responsividade.
6. Produção exige confirmação explícita. Promover o preview validado; registrar URL/commit.
7. Confirmar que a proteção SSO da Vercel está desativada quando o requisito for acesso direto sem login.

Produção atual: `https://dashboard-omega-taupe-83.vercel.app`.

Smoke test mínimo: resposta HTTP sem redirecionamento de autenticação, ausência de alerta de banco, 470 contatos, 12 conversas relevantes e 2 reuniões para a carga reconciliada de 02/10/2026.

Rollback da aplicação: apontar o alias de produção ao deployment anterior. Rollback de dados: interromper escritas, identificar `import_run_id`, usar auditoria e exclusão lógica; nunca apagar interações/histórico.
