# Deploy e rollback

1. Rotacionar qualquer credencial exposta e manter somente URL/chave publicável no frontend.
2. Aplicar migrações em ambiente controlado e executar advisors/RLS tests.
3. Rodar lint, typecheck, testes, build e dry-run.
4. Publicar branch em Preview pela integração GitHub–Vercel.
5. Executar smoke test: login, seis visões, gravação, reload, outra sessão, filtros, exportação e logout.
6. Produção exige confirmação explícita. Promover o preview validado; registrar URL/commit.

Rollback da aplicação: apontar o alias de produção ao deployment anterior. Rollback de dados: interromper escritas, identificar `import_run_id`, usar auditoria e exclusão lógica; nunca apagar interações/histórico.
