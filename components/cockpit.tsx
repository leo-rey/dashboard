"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  activityTrend,
  formatCommercialDate,
  formatCommercialDateTime,
  funnelMetrics,
  pipelineByStage,
  pipelineMetrics,
  priorityOpportunities,
  sumActivities,
} from "@/lib/metrics";
import { neutralizeCsv } from "@/lib/validation";
import type { AccountRow, ActivityRow, ContactRow, HomologationRow, OpportunityRow } from "@/lib/database.types";

type Data = { contacts: ContactRow[]; activities: ActivityRow[]; opportunities: OpportunityRow[]; accounts: AccountRow[]; homologations: HomologationRow[]; error: string | null; updatedAt: string };
const tabs = ["Visão diária", "Dia anterior", "Prospecção", "Homologação", "Reunião executiva", "Pipeline", "Contas prioritárias"] as const;
type Tab = (typeof tabs)[number];
const PAGE_SIZE = 50;
const homologationLabels: Record<HomologationRow["status"], string> = {
  a_validar: "A validar",
  pre_cadastro: "Pré-cadastro",
  email_compras: "E-mail para compras",
  reuniao_compras: "Reunião com compras",
  em_homologacao: "Em homologação",
  homologada: "Homologada",
  bloqueada: "Bloqueada",
  sem_avanco: "Sem avanço",
};

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

function str(v: unknown, fallback = "—"): string {
  if (typeof v === "string" && v.trim()) return v;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return fallback;
}

function safeMoney(v: unknown): string {
  const n = Number(v);
  return Number.isFinite(n) ? money.format(n) : "—";
}

function isSafeHttpsUrl(raw: unknown): raw is string {
  if (typeof raw !== "string") return false;
  try {
    const u = new URL(raw);
    return u.protocol === "https:";
  } catch {
    return false;
  }
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function downloadCsv(filename: string, rows: string[][]) {
  const body = rows.map((r) => r.map((c) => `"${neutralizeCsv(c).replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function Cockpit({ initialData }: { initialData: Data }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(tabs[0]);
  const [query, setQuery] = useState("");
  const [oppQuery, setOppQuery] = useState("");
  const [accountQuery, setAccountQuery] = useState("");
  const [homologationQuery, setHomologationQuery] = useState("");
  const [contactPage, setContactPage] = useState(0);
  const [oppPage, setOppPage] = useState(0);
  const [homologationPage, setHomologationPage] = useState(0);
  const deferredQuery = useDeferredValue(query);
  const deferredOppQuery = useDeferredValue(oppQuery);
  const deferredAccountQuery = useDeferredValue(accountQuery);
  const deferredHomologationQuery = useDeferredValue(homologationQuery);
  const q = deferredQuery.trim().toLocaleLowerCase("pt-BR");
  const oq = deferredOppQuery.trim().toLocaleLowerCase("pt-BR");
  const aq = deferredAccountQuery.trim().toLocaleLowerCase("pt-BR");
  const hq = deferredHomologationQuery.trim().toLocaleLowerCase("pt-BR");

  const filteredContacts = useMemo(() => {
    const base = q
      ? initialData.contacts.filter((row) =>
          `${row.name ?? ""} ${row.account?.canonical_name ?? ""} ${row.role_title ?? ""} ${row.owner_name ?? ""} ${row.status_raw ?? ""}`
            .toLocaleLowerCase("pt-BR")
            .includes(q)
        )
      : initialData.contacts;
    return base;
  }, [initialData.contacts, q]);

  const filteredOpportunities = useMemo(() => {
    if (!oq) return initialData.opportunities;
    return initialData.opportunities.filter((row) =>
      `${row.account?.canonical_name ?? ""} ${row.title ?? ""} ${row.owner_name ?? ""} ${row.stage?.name ?? ""} ${row.next_action ?? ""}`
        .toLocaleLowerCase("pt-BR")
        .includes(oq)
    );
  }, [initialData.opportunities, oq]);

  const filteredHomologations = useMemo(() => {
    if (!hq) return initialData.homologations;
    return initialData.homologations.filter((row) =>
      `${row.company_name ?? ""} ${row.account?.canonical_name ?? ""} ${row.owner_name ?? ""} ${homologationLabels[row.status] ?? row.status} ${row.last_action ?? ""} ${row.next_action ?? ""}`
        .toLocaleLowerCase("pt-BR")
        .includes(hq)
    );
  }, [initialData.homologations, hq]);

  const activityTotals = useMemo(
    () =>
      sumActivities(
        initialData.activities.map((row) => ({
          contacts: Number(row.contacts_count) || 0,
          invites: Number(row.invites_count) || 0,
          messages: Number(row.messages_count) || 0,
          replies: Number(row.replies_count) || 0,
          conversations: Number(row.conversations_count) || 0,
          meetings: Number(row.meetings_count) || 0,
          opportunities: Number(row.opportunities_count) || 0,
        }))
      ),
    [initialData.activities]
  );

  const pipeline = useMemo(
    () =>
      pipelineMetrics(
        initialData.opportunities.map((row) => ({
          value_amount: row.value_amount,
          probability: Number(row.probability) || 0,
          stage: row.stage,
        }))
      ),
    [initialData.opportunities]
  );

  const funnel = useMemo(
    () =>
      funnelMetrics({
        invites: activityTotals.invites,
        replies: activityTotals.replies,
        conversations: activityTotals.conversations,
        meetings: activityTotals.meetings,
        opportunities: activityTotals.opportunities,
      }),
    [activityTotals]
  );

  const trend = useMemo(
    () =>
      activityTrend(
        initialData.activities.map((row) => ({
          effective_on: row.effective_on,
          invites_count: row.invites_count,
          replies_count: row.replies_count,
          conversations_count: row.conversations_count,
          meetings_count: row.meetings_count,
        })),
        14
      ),
    [initialData.activities]
  );

  const maxTrend = useMemo(() => Math.max(1, ...trend.map((t) => t.invites + t.replies + t.conversations + t.meetings)), [trend]);

  const stages = useMemo(
    () =>
      pipelineByStage(
        initialData.opportunities.map((row) => ({
          value_amount: row.value_amount,
          probability: Number(row.probability) || 0,
          stage: row.stage,
        }))
      ),
    [initialData.opportunities]
  );
  const maxStage = useMemo(() => Math.max(1, ...stages.map((s) => s.total)), [stages]);

  const priorities = useMemo(
    () =>
      priorityOpportunities(
        initialData.opportunities.map((row) => ({
          id: row.id,
          title: row.title,
          next_action: row.next_action,
          next_action_due_on: row.next_action_due_on,
          expected_close_on: row.expected_close_on,
          account: row.account,
          stage: row.stage,
        }))
      ),
    [initialData.opportunities]
  );

  const homologationSummary = useMemo(() => {
    const open = initialData.homologations.filter((row) => row.status !== "homologada" && row.status !== "bloqueada" && row.status !== "sem_avanco");
    const due = open.filter((row) => {
      if (!row.next_action_due_on) return false;
      const dueOn = new Date(`${row.next_action_due_on}T00:00:00`);
      return Number.isFinite(dueOn.getTime()) && dueOn <= new Date();
    });
    const byStatus = initialData.homologations.reduce<Record<string, number>>((acc, row) => {
      acc[row.status] = (acc[row.status] ?? 0) + 1;
      return acc;
    }, {});
    return { total: initialData.homologations.length, open: open.length, due: due.length, byStatus };
  }, [initialData.homologations]);

  const lastDay = useMemo(() => {
    if (!initialData.activities.length) return null;
    const sorted = [...initialData.activities].sort((a, b) => (a.effective_on < b.effective_on ? 1 : -1));
    return sorted[0].effective_on;
  }, [initialData.activities]);

  const lastDayRows = useMemo(() => {
    if (!lastDay) return [];
    return initialData.activities.filter((r) => r.effective_on === lastDay);
  }, [initialData.activities, lastDay]);

  const lastDayTotals = useMemo(
    () =>
      sumActivities(
        lastDayRows.map((row) => ({
          contacts: Number(row.contacts_count) || 0,
          invites: Number(row.invites_count) || 0,
          messages: Number(row.messages_count) || 0,
          replies: Number(row.replies_count) || 0,
          conversations: Number(row.conversations_count) || 0,
          meetings: Number(row.meetings_count) || 0,
          opportunities: Number(row.opportunities_count) || 0,
        }))
      ),
    [lastDayRows]
  );

  const accountsEnriched = useMemo(() => {
    const contactCount = new Map<string, number>();
    const pipeValue = new Map<string, number>();
    for (const c of initialData.contacts) {
      const id = c.account?.id;
      if (!id) continue;
      contactCount.set(id, (contactCount.get(id) ?? 0) + 1);
    }
    for (const o of initialData.opportunities) {
      if (o.stage?.is_closed) continue;
      const id = o.account?.id;
      if (!id) continue;
      const n = Number(o.value_amount);
      pipeValue.set(id, (pipeValue.get(id) ?? 0) + (Number.isFinite(n) ? Math.max(0, n) : 0));
    }
    const list = initialData.accounts.map((a) => ({
      ...a,
      contactCount: contactCount.get(a.id) ?? 0,
      pipeValue: pipeValue.get(a.id) ?? 0,
    }));
    const filtered = aq
      ? list.filter((a) => a.canonical_name.toLocaleLowerCase("pt-BR").includes(aq))
      : list;
    return filtered.sort((a, b) => b.pipeValue - a.pipeValue || b.contactCount - a.contactCount).slice(0, 60);
  }, [initialData.accounts, initialData.contacts, initialData.opportunities, aq]);

  const contactPages = Math.max(1, Math.ceil(filteredContacts.length / PAGE_SIZE));
  const oppPages = Math.max(1, Math.ceil(filteredOpportunities.length / PAGE_SIZE));
  const homologationPages = Math.max(1, Math.ceil(filteredHomologations.length / PAGE_SIZE));
  const safeContactPage = Math.min(contactPage, contactPages - 1);
  const safeOppPage = Math.min(oppPage, oppPages - 1);
  const safeHomologationPage = Math.min(homologationPage, homologationPages - 1);
  const contactSlice = filteredContacts.slice(safeContactPage * PAGE_SIZE, safeContactPage * PAGE_SIZE + PAGE_SIZE);
  const oppSlice = filteredOpportunities.slice(safeOppPage * PAGE_SIZE, safeOppPage * PAGE_SIZE + PAGE_SIZE);
  const homologationSlice = filteredHomologations.slice(safeHomologationPage * PAGE_SIZE, safeHomologationPage * PAGE_SIZE + PAGE_SIZE);

  const onTabKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const dir = e.key === "ArrowRight" ? 1 : -1;
    const next = (index + dir + tabs.length) % tabs.length;
    setTab(tabs[next]);
    document.getElementById(`tab-${slugify(tabs[next])}`)?.focus();
  };

  const activeSlug = slugify(tab);

  return (
    <div className="shell">
      <aside>
        <div className="brand">
          ANTLIA<small>COCKPIT COMERCIAL</small>
        </div>
        <nav aria-label="Visões do cockpit">
          <div role="tablist" aria-label="Visões do cockpit" className="tablist">
            {tabs.map((name, i) => {
              const slug = slugify(name);
              return (
                <button
                  key={name}
                  id={`tab-${slug}`}
                  role="tab"
                  aria-selected={tab === name}
                  aria-controls={`panel-${slug}`}
                  tabIndex={tab === name ? 0 : -1}
                  className={tab === name ? "active" : ""}
                  onClick={() => setTab(name)}
                  onKeyDown={(e) => onTabKeyDown(e, i)}
                >
                  {name}
                </button>
              );
            })}
          </div>
        </nav>
        <div className="asideFoot" aria-label="Resumo">
          <span>{initialData.contacts.length} contatos</span>
          <span>{homologationSummary.open} homologações em andamento</span>
          <span>{pipeline.count} oportunidades abertas</span>
          <span>{safeMoney(pipeline.total)} em pipeline</span>
        </div>
      </aside>
      <main id="conteudo">
        <header>
          <div>
            <h1>{tab}</h1>
            <p>Fatos, próximos passos e decisões — sem inflar o pipeline.</p>
          </div>
          <div className="headerActions">
            <span className="updated">Atualizado {formatCommercialDateTime(initialData.updatedAt)}</span>
            <button type="button" className="button primary" onClick={() => router.refresh()}>
              Atualizar dados
            </button>
          </div>
        </header>
        <section className="content">
          {initialData.error && (
            <div className="alert" role="alert">
              Não foi possível carregar a base: {initialData.error}{" "}
              <button type="button" className="linkBtn" onClick={() => router.refresh()}>
                Tentar novamente
              </button>
            </div>
          )}

          {tab === "Visão diária" && (
            <div role="tabpanel" id={`panel-${activeSlug}`} aria-label="Visão diária" tabIndex={0}>
              <div className="kpis">
                <Kpi label="Pipeline aberto" value={safeMoney(pipeline.total)} />
                <Kpi label="Pipeline ponderado" value={safeMoney(pipeline.weighted)} />
                <Kpi label="Contatos na base" value={String(initialData.contacts.length)} />
                <Kpi label="Conversas relevantes" value={String(activityTotals.conversations)} />
                <Kpi label="Reuniões" value={String(activityTotals.meetings)} />
                <Kpi label="Resposta / convite" value={`${funnel.replyRate}%`} />
              </div>
              <div className="grid2">
                <Panel title={`Prioridades de hoje · ${priorities.length}`}>
                  {priorities.length === 0 ? (
                    <Empty text="Nenhuma oportunidade aberta com próxima ação. Cadastre o próximo passo para alimentar esta fila." />
                  ) : (
                    <ul className="priorityList">
                      {priorities.map((p) => (
                        <li key={p.id} className={p.overdue ? "overdue" : p.dueSoon ? "dueSoon" : ""}>
                          <div>
                            <b>{p.accountName}</b>
                            <small>{p.title}{p.nextAction ? ` — ${p.nextAction}` : ""}</small>
                          </div>
                          <span className="pill">
                            {p.overdue ? `Atrasada · ${formatCommercialDate(p.nextActionDueOn)}` : p.nextActionDueOn ? formatCommercialDate(p.nextActionDueOn) : "Sem data"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>
                <Panel title="Funil de conversão">
                  <FunnelBars funnel={funnel} totals={activityTotals} />
                </Panel>
              </div>
              <Panel title="Atividade · últimos 14 dias com dados">
                {trend.length === 0 ? (
                  <Empty text="Nenhuma atividade registrada." />
                ) : (
                  <div className="trend" role="img" aria-label={`Atividade dos últimos ${trend.length} dias com dados`}>
                    {trend.map((t) => {
                      const total = t.invites + t.replies + t.conversations + t.meetings;
                      const height = Math.max(4, Math.round((total / maxTrend) * 100));
                      return (
                        <div key={t.date} className="trendBar" title={`${t.label}: ${total} interações`}>
                          <div className="trendCol" style={{ height: `${height}px` }} />
                          <small>{t.label.slice(0, 5)}</small>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Panel>
            </div>
          )}

          {tab === "Dia anterior" && (
            <div role="tabpanel" id={`panel-${activeSlug}`} aria-label="Dia anterior" tabIndex={0}>
              <div className="kpis">
                <Kpi label="Último dia com dados" value={lastDay ? formatCommercialDate(lastDay) : "—"} />
                <Kpi label="Convites no dia" value={String(lastDayTotals.invites)} />
                <Kpi label="Respostas no dia" value={String(lastDayTotals.replies)} />
                <Kpi label="Conversas no dia" value={String(lastDayTotals.conversations)} />
                <Kpi label="Reuniões no dia" value={String(lastDayTotals.meetings)} />
              </div>
              <Panel title={`Lotes de ${lastDay ? formatCommercialDate(lastDay) : "—"} · ${lastDayRows.length}`}>
                <ActivityTable rows={lastDayRows} />
              </Panel>
              <Panel title="Histórico completo">
                <ActivityTable rows={initialData.activities} />
              </Panel>
            </div>
          )}

          {tab === "Prospecção" && (
            <div role="tabpanel" id={`panel-${activeSlug}`} aria-label="Prospecção" tabIndex={0}>
              <div className="kpis">
                <Kpi label="Contatos trabalhados" value={String(activityTotals.contacts)} />
                <Kpi label="Convites" value={String(activityTotals.invites)} />
                <Kpi label="Mensagens" value={String(activityTotals.messages)} />
                <Kpi label="Respostas" value={String(activityTotals.replies)} />
                <Kpi label="Conversas" value={String(activityTotals.conversations)} />
              </div>
              <div className="filters">
                <input
                  type="search"
                  aria-label="Buscar conta ou contato na prospecção"
                  aria-controls="contact-table"
                  placeholder="Buscar conta, contato, cargo, responsável ou status"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setContactPage(0);
                  }}
                />
                <button
                  type="button"
                  className="button"
                  onClick={() =>
                    downloadCsv(
                      "prospeccao.csv",
                      [
                        ["contato", "conta", "cargo", "responsavel", "status", "ultimo_contato", "linkedin"],
                        ...filteredContacts.map((r) => [
                          str((r as ContactRow).name, ""),
                          str((r as ContactRow).account?.canonical_name, ""),
                          str((r as ContactRow).role_title, ""),
                          str((r as ContactRow).owner_name, ""),
                          str((r as ContactRow).status_raw, ""),
                          str((r as ContactRow).last_contact_at, ""),
                          str((r as ContactRow).linkedin_url, ""),
                        ]),
                      ]
                    )
                  }
                >
                  Exportar CSV
                </button>
              </div>
              <Panel title={`Lista de prospecção · ${filteredContacts.length}`}>
                <ContactTable rows={contactSlice} />
              </Panel>
              <div className="pager">
                <button type="button" className="button" disabled={safeContactPage === 0} onClick={() => setContactPage((p) => Math.max(0, p - 1))}>
                  Anterior
                </button>
                <span role="status">Página {safeContactPage + 1} de {contactPages} · {filteredContacts.length} resultado(s) para “{deferredQuery || "todos"}”.</span>
                <button type="button" className="button" disabled={safeContactPage + 1 >= contactPages} onClick={() => setContactPage((p) => p + 1)}>
                  Próxima
                </button>
              </div>
            </div>
          )}

          {tab === "Homologação" && (
            <div role="tabpanel" id={`panel-${activeSlug}`} aria-label="Homologação" tabIndex={0}>
              <div className="kpis">
                <Kpi label="Empresas mapeadas" value={String(homologationSummary.total)} />
                <Kpi label="Processos em andamento" value={String(homologationSummary.open)} />
                <Kpi label="Ações vencidas ou hoje" value={String(homologationSummary.due)} />
                <Kpi label="Pré-cadastros" value={String(homologationSummary.byStatus.pre_cadastro ?? 0)} />
                <Kpi label="Em homologação" value={String(homologationSummary.byStatus.em_homologacao ?? 0)} />
              </div>
              <div className="filters">
                <input
                  type="search"
                  aria-label="Buscar homologação"
                  aria-controls="homologation-table"
                  placeholder="Buscar empresa, responsável, status ou ação"
                  value={homologationQuery}
                  onChange={(e) => {
                    setHomologationQuery(e.target.value);
                    setHomologationPage(0);
                  }}
                />
                <button
                  type="button"
                  className="button"
                  onClick={() =>
                    downloadCsv(
                      "homologacao.csv",
                      [
                        ["empresa", "conta_relacionada", "responsavel", "status", "ultima_acao", "data_ultima_acao", "proxima_acao", "prazo", "contato_compras", "portal", "evidencia"],
                        ...filteredHomologations.map((r) => [
                          str(r.company_name, ""),
                          str(r.account?.canonical_name, ""),
                          str(r.owner_name, ""),
                          homologationLabels[r.status] ?? r.status,
                          str(r.last_action, ""),
                          str(r.last_action_at, ""),
                          str(r.next_action, ""),
                          str(r.next_action_due_on, ""),
                          str(r.buyer_area_contact, ""),
                          str(r.supplier_portal_url, ""),
                          str(r.evidence_level, ""),
                        ]),
                      ]
                    )
                  }
                >
                  Exportar CSV
                </button>
              </div>
              <Panel title={`Homologações de fornecedores · ${filteredHomologations.length}`}>
                <HomologationTable rows={homologationSlice} />
              </Panel>
              <div className="pager">
                <button type="button" className="button" disabled={safeHomologationPage === 0} onClick={() => setHomologationPage((p) => Math.max(0, p - 1))}>
                  Anterior
                </button>
                <span role="status">Página {safeHomologationPage + 1} de {homologationPages} · {filteredHomologations.length} resultado(s) para “{deferredHomologationQuery || "todos"}”.</span>
                <button type="button" className="button" disabled={safeHomologationPage + 1 >= homologationPages} onClick={() => setHomologationPage((p) => p + 1)}>
                  Próxima
                </button>
              </div>
            </div>
          )}

          {tab === "Reunião executiva" && (
            <div role="tabpanel" id={`panel-${activeSlug}`} aria-label="Reunião executiva" tabIndex={0}>
              <div className="hero">
                <div>
                  <small>RESUMO EXECUTIVO</small>
                  <h2>{pipeline.count ? `${pipeline.count} oportunidades abertas · ${safeMoney(pipeline.total)}` : "Nenhuma oportunidade qualificada registrada."}</h2>
                  <p>Ponderado {safeMoney(pipeline.weighted)} · {activityTotals.conversations} conversas · {activityTotals.meetings} reuniões. Indicadores derivados exclusivamente de dados persistidos no Supabase.</p>
                </div>
              </div>
              <div className="grid2">
                <Panel title="Pipeline por estágio">
                  {stages.length === 0 ? (
                    <Empty text="Nenhum estágio com oportunidade aberta." />
                  ) : (
                    <ul className="stageList">
                      {stages.map((s) => (
                        <li key={s.name}>
                          <div className="stageHead">
                            <b>{s.name}</b>
                            <span>{s.count} · {safeMoney(s.total)}</span>
                          </div>
                          <div className="barTrack" role="img" aria-label={`${s.name}: ${safeMoney(s.total)}`}>
                            <div className="barFill" style={{ width: `${Math.max(2, Math.round((s.total / maxStage) * 100))}%` }} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>
                <Panel title="Funil de conversão">
                  <FunnelBars funnel={funnel} totals={activityTotals} />
                </Panel>
              </div>
              <Panel title="Atividade consolidada">
                <ActivityTable rows={initialData.activities} />
              </Panel>
            </div>
          )}

          {tab === "Pipeline" && (
            <div role="tabpanel" id={`panel-${activeSlug}`} aria-label="Pipeline" tabIndex={0}>
              <div className="kpis">
                <Kpi label="Oportunidades abertas" value={String(pipeline.count)} />
                <Kpi label="Valor aberto" value={safeMoney(pipeline.total)} />
                <Kpi label="Valor ponderado" value={safeMoney(pipeline.weighted)} />
                <Kpi label="Ticket médio" value={pipeline.count ? safeMoney(pipeline.total / pipeline.count) : "—"} />
              </div>
              <div className="filters">
                <input
                  type="search"
                  aria-label="Buscar oportunidade"
                  placeholder="Buscar conta, oportunidade, responsável ou estágio"
                  value={oppQuery}
                  onChange={(e) => {
                    setOppQuery(e.target.value);
                    setOppPage(0);
                  }}
                />
                <button
                  type="button"
                  className="button"
                  onClick={() =>
                    downloadCsv(
                      "pipeline.csv",
                      [
                        ["conta", "oportunidade", "responsavel", "estagio", "valor", "probabilidade", "fechamento", "proxima_acao"],
                        ...filteredOpportunities.map((r) => [
                          str(r.account?.canonical_name, ""),
                          str(r.title, ""),
                          str(r.owner_name, ""),
                          str(r.stage?.name, ""),
                          str(r.value_amount, ""),
                          str(r.probability, ""),
                          str(r.expected_close_on, ""),
                          str(r.next_action, ""),
                        ]),
                      ]
                    )
                  }
                >
                  Exportar CSV
                </button>
              </div>
              <Panel title={`Pipeline · ${filteredOpportunities.length}`}>
                <OpportunityTable rows={oppSlice} />
              </Panel>
              <div className="pager">
                <button type="button" className="button" disabled={safeOppPage === 0} onClick={() => setOppPage((p) => Math.max(0, p - 1))}>
                  Anterior
                </button>
                <span role="status">Página {safeOppPage + 1} de {oppPages}</span>
                <button type="button" className="button" disabled={safeOppPage + 1 >= oppPages} onClick={() => setOppPage((p) => p + 1)}>
                  Próxima
                </button>
              </div>
            </div>
          )}

          {tab === "Contas prioritárias" && (
            <div role="tabpanel" id={`panel-${activeSlug}`} aria-label="Contas prioritárias" tabIndex={0}>
              <div className="filters">
                <input
                  type="search"
                  aria-label="Buscar conta prioritária"
                  placeholder="Buscar conta"
                  value={accountQuery}
                  onChange={(e) => setAccountQuery(e.target.value)}
                />
              </div>
              <div className="accountGrid">
                {accountsEnriched.slice(0, 30).map((row) => (
                  <article className="card" key={String(row.id)}>
                    <small>CONTA</small>
                    <h3>{str(row.canonical_name, "Conta sem nome")}</h3>
                    <p>{row.contactCount} contatos mapeados · {safeMoney(row.pipeValue)} em pipeline</p>
                  </article>
                ))}
              </div>
              {accountsEnriched.length === 0 && <Empty text="Nenhuma conta encontrada." />}
              <p className="hint" role="status">{accountsEnriched.length} conta(s) para “{deferredAccountQuery || "todas"}”, ordenadas por pipeline.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <article className="card kpi">
      <small>{label}</small>
      <strong>{value}</strong>
    </article>
  );
}
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card panel">
      <h2>{title}</h2>
      <div className="tableWrap" tabIndex={0} role="region" aria-label={`${title} — tabela rolável`}>
        {children}
      </div>
    </section>
  );
}
function Empty({ text }: { text: string }) {
  return <p className="empty">{text}</p>;
}

function FunnelBars({ funnel, totals }: { funnel: { replyRate: number; conversationRate: number; meetingRate: number; opportunityRate: number }; totals: { invites: number; replies: number; conversations: number; meetings: number; opportunities: number } }) {
  const steps = [
    { label: `Convites → respostas (${totals.replies}/${totals.invites})`, rate: funnel.replyRate },
    { label: `Respostas → conversas (${totals.conversations}/${totals.replies})`, rate: funnel.conversationRate },
    { label: `Conversas → reuniões (${totals.meetings}/${totals.conversations})`, rate: funnel.meetingRate },
    { label: `Reuniões → oportunidades (${totals.opportunities}/${totals.meetings})`, rate: funnel.opportunityRate },
  ];
  return (
    <ul className="stageList">
      {steps.map((s) => (
        <li key={s.label}>
          <div className="stageHead">
            <b>{s.label}</b>
            <span>{s.rate}%</span>
          </div>
          <div className="barTrack" role="img" aria-label={`${s.label}: ${s.rate}%`}>
            <div className="barFill" style={{ width: `${Math.max(2, Math.min(100, s.rate))}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function ContactTable({ rows }: { rows: ContactRow[] }) {
  if (!rows.length) return <Empty text="Nenhum contato encontrado." />;
  return (
    <table id="contact-table">
      <caption className="sr-only">Contatos de prospecção</caption>
      <thead>
        <tr>
          <th scope="col">Contato / empresa</th>
          <th scope="col">Cargo</th>
          <th scope="col">Responsável</th>
          <th scope="col">Status</th>
          <th scope="col">Último contato</th>
          <th scope="col">LinkedIn</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const name = typeof r.name === "string" ? r.name : "—";
          return (
            <tr key={String(r.id)}>
              <td>
                <b>{name}</b>
                <small>{typeof r.account?.canonical_name === "string" ? r.account.canonical_name : ""}</small>
              </td>
              <td>{str(r.role_title)}</td>
              <td>{str(r.owner_name)}</td>
              <td>
                <span className="pill">{str(r.status_raw, "A validar")}</span>
              </td>
              <td>{formatCommercialDate(r.last_contact_at)}</td>
              <td>
                {isSafeHttpsUrl(r.linkedin_url) ? (
                  <a href={r.linkedin_url} target="_blank" rel="noopener noreferrer" aria-label={`Abrir LinkedIn de ${name} em nova aba`}>
                    Abrir perfil ↗
                  </a>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
function ActivityTable({ rows }: { rows: ActivityRow[] }) {
  if (!rows.length) return <Empty text="Nenhuma atividade registrada." />;
  return (
    <table>
      <caption className="sr-only">Atividades registradas</caption>
      <thead>
        <tr>
          <th scope="col">Data</th>
          <th scope="col">Responsável</th>
          <th scope="col">Canal</th>
          <th scope="col">Contatos</th>
          <th scope="col">Convites</th>
          <th scope="col">Mensagens</th>
          <th scope="col">Respostas</th>
          <th scope="col">Conversas</th>
          <th scope="col">Reuniões</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={String(r.id)}>
            <td>{formatCommercialDate(r.effective_on)}</td>
            <td>{str(r.owner_name)}</td>
            <td>{str(r.channel?.name)}</td>
            <td>{Number(r.contacts_count) || 0}</td>
            <td>{Number(r.invites_count) || 0}</td>
            <td>{Number(r.messages_count) || 0}</td>
            <td>{Number(r.replies_count) || 0}</td>
            <td>{Number(r.conversations_count) || 0}</td>
            <td>{Number(r.meetings_count) || 0}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
function OpportunityTable({ rows }: { rows: OpportunityRow[] }) {
  if (!rows.length) return <Empty text="Nenhuma oportunidade registrada." />;
  return (
    <table>
      <caption className="sr-only">Oportunidades do pipeline</caption>
      <thead>
        <tr>
          <th scope="col">Conta / oportunidade</th>
          <th scope="col">Responsável</th>
          <th scope="col">Estágio</th>
          <th scope="col">Valor</th>
          <th scope="col">Prob.</th>
          <th scope="col">Fechamento</th>
          <th scope="col">Próxima ação</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const prob = r.probability;
          return (
            <tr key={String(r.id)}>
              <td>
                <b>{str(r.account?.canonical_name)}</b>
                <small>{str(r.title, "")}</small>
              </td>
              <td>{str(r.owner_name)}</td>
              <td>
                <span className="pill">{str(r.stage?.name, "A validar")}</span>
              </td>
              <td>{safeMoney(r.value_amount)}</td>
              <td>{typeof prob === "number" && Number.isFinite(prob) ? `${prob}%` : "—"}</td>
              <td>{formatCommercialDate(r.expected_close_on)}</td>
              <td>{str(r.next_action)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function HomologationTable({ rows }: { rows: HomologationRow[] }) {
  if (!rows.length) return <Empty text="Nenhuma homologação registrada." />;
  return (
    <table id="homologation-table">
      <caption className="sr-only">Homologações de fornecedores</caption>
      <thead>
        <tr>
          <th scope="col">Empresa</th>
          <th scope="col">Responsável</th>
          <th scope="col">Status</th>
          <th scope="col">Última ação</th>
          <th scope="col">Próxima ação</th>
          <th scope="col">Compras / portal</th>
          <th scope="col">Evidência</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={String(r.id)}>
            <td>
              <b>{str(r.company_name)}</b>
              <small>{r.account?.canonical_name ? `Conta relacionada: ${r.account.canonical_name}` : str(r.notes, "")}</small>
            </td>
            <td>{str(r.owner_name)}</td>
            <td>
              <span className={`pill status-${r.status}`}>{homologationLabels[r.status] ?? r.status}</span>
            </td>
            <td>
              {str(r.last_action)}
              <small>{formatCommercialDate(r.last_action_at)}</small>
            </td>
            <td>
              {str(r.next_action)}
              <small>{formatCommercialDate(r.next_action_due_on)}</small>
            </td>
            <td>
              {str(r.buyer_area_contact)}
              <small>
                {isSafeHttpsUrl(r.supplier_portal_url) ? (
                  <a href={r.supplier_portal_url} target="_blank" rel="noopener noreferrer" aria-label={`Abrir portal de fornecedores de ${r.company_name} em nova aba`}>
                    Abrir portal ↗
                  </a>
                ) : (
                  "—"
                )}
              </small>
            </td>
            <td>{str(r.evidence_level)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
