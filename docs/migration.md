# Migração e reconciliação

O dry-run calculou o SHA-256 do Excel, leu Contatos/Atividades/Oportunidades e normalizou identidades. Após a auditoria, a promoção foi executada em migração separada e reexecutada para validar idempotência.

Controles esperados da origem auditada em 02/10/2026: 470 contatos, 23 lotes de atividade, 0 oportunidades; 524 contatos trabalhados, 381 convites, 111 mensagens, 15 respostas, 12 conversas e 2 reuniões.

Resoluções aplicadas: CT-0140/CT-0141 preservaram a URL original, mas sem identidade canônica; 14 contatos bloqueados tiveram ação/prazo removidos da fila e preservados nas notas de auditoria; prioridade foi separada em nível e ranking; a data serial Excel foi convertida pelo epoch correto. `SRM ASSET` e `SRM Asset` foram consolidadas como uma conta normalizada, preservando os contatos.

Rollback: a promoção futura será vinculada a `import_run_id`, com auditoria e exclusão lógica. A planilha original permanece preservada com hash.
