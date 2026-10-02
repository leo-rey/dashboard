# Migração e reconciliação

O dry-run calcula SHA-256 do Excel, lê Contatos/Atividades/Oportunidades, normaliza identidades e produz `reports/migration-dry-run.json`. A promoção nunca ocorre no mesmo passo.

Controles esperados da origem auditada em 02/10/2026: 470 contatos, 23 lotes de atividade, 0 oportunidades; 524 contatos trabalhados, 381 convites, 111 mensagens, 15 respostas, 12 conversas e 2 reuniões.

Conflitos conhecidos: uma URL genérica do LinkedIn compartilhada por CT-0140/CT-0141; 14 contatos com regra de bloqueio e ação/prazo; prioridade com tipos mistos; uma data serial Excel. Nenhum conflito deve ser fundido ou descartado automaticamente.

Rollback: a promoção futura será vinculada a `import_run_id`, com auditoria e exclusão lógica. A planilha original permanece preservada com hash.

