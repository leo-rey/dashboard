# Deploy e rollback

1. Configurar `DATABASE_URL` como variável privada na Vercel. Nunca usar prefixo `NEXT_PUBLIC_` nessa variável.
2. Aplicar migrações em ambiente controlado e executar advisors/RLS tests.
3. Rodar lint, typecheck, testes, build e dry-run.
4. Publicar branch em Preview pela integração GitHub–Vercel.
5. Executar smoke test: abertura direta, seis visões, recarregamento, filtros e responsividade.
6. Produção exige confirmação explícita. Promover o preview validado; registrar URL/commit.

Rollback da aplicação: apontar o alias de produção ao deployment anterior. Rollback de dados: interromper escritas, identificar `import_run_id`, usar auditoria e exclusão lógica; nunca apagar interações/histórico.
