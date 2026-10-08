"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { formatCommercialDate, formatCommercialDateTime, pipelineMetrics, sumActivities } from "@/lib/metrics";

// TODO: gerar tipos via `supabase gen types` e substituir este boundary.
type Row = Record<string, unknown>;
type AccountRef = { id?: unknown; canonical_name?: unknown };
type StageRef = { name?: unknown; is_closed?: unknown };
type Data = { contacts: Row[]; activities: Row[]; opportunities: Row[]; accounts: Row[]; error: string | null; updatedAt: string };
const tabs = ["Visão diária", "Dia anterior", "Prospecção", "Reunião executiva", "Pipeline", "Contas prioritárias"] as const;
type Tab = (typeof tabs)[number];
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

export function Cockpit({ initialData }: { initialData: Data }) {
  const [tab, setTab] = useState<Tab>(tabs[0]);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const q = deferredQuery.trim().toLocaleLowerCase("pt-BR");

  const filteredContacts = useMemo(() => {
    if (!q) return initialData.contacts;
    return initialData.contacts.filter((row) => {
      const name = typeof row.name === "string" ? row.name : "";
      const account = (row.account as AccountRef | null)?.canonical_name;
      const status = typeof row.status_raw === "string" ? row.status_raw : "";
      return `${name} ${typeof account === "string" ? account : ""} ${status}`.toLocaleLowerCase("pt-BR").includes(q);
    });
  }, [initialData.contacts, q]);

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
          value_amount: row.value_amount as number | string,
          probability: Number(row.probability) || 0,
          stage: row.stage as { is_closed?: boolean } | null,
        }))
      ),
    [initialData.opportunities]
  );

  const contactsByAccount = useMemo(() => {
    const map = new Map<unknown, number>();
    for (const c of initialData.contacts) {
      const id = (c.account as AccountRef | null)?.id;
      if (id == null) continue;
      map.set(id, (map.get(id) ?? 0) + 1);
    }
    return map;
  }, [initialData.contacts]);

  const onTabKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const dir = e.key === "ArrowRight" ? 1 : -1;
    const next = (index + dir + tabs.length) % tabs.length;
    setTab(tabs[next]);
    document.getElementById(`tab-${next}`)?.focus();
  };

  return (
    <div className="shell">
      <aside>
        <div className="brand">
          ANTLIA<small>COCKPIT COMERCIAL</small>
        </div>
        <nav aria-label="Visões do cockpit">
          <div role="tablist" aria-label="Visões do cockpit" className="tablist">
            {tabs.map((name, i) => (
              <button
                key={name}
                id={`tab-${i}`}
                role="tab"
                aria-selected={tab === name}
                aria-controls={`panel-${name}`}
                tabIndex={tab === name ? 0 : -1}
                className={tab === name ? "active" : ""}
                onClick={() => setTab(name)}
                onKeyDown={(e) => onTabKeyDown(e, i)}
              >
                {name}
              </button>
            ))}
          </div>
        </nav>
      </aside>
      <main id="conteudo">
        <header>
          <div>
            <h1>{tab}</h1>
            <p>Fatos, próximos passos e decisões — sem inflar o pipeline.</p>
          </div>
          <span className="updated">Atualizado {formatCommercialDateTime(initialData.updatedAt)}</span>
        </header>
        <section className="content">
          {initialData.error && (
            <div className="alert" role="alert">
              Não foi possível carregar a base: {initialData.error}
            </div>
          )}

          {tab === "Visão diária" && (
            <div role="tabpanel" id="panel-Visão diária" aria-label="Visão diária" tabIndex={0}>
              <div className="kpis">
                <Kpi label="Pipeline aberto" value={safeMoney(pipeline.total)} />
                <Kpi label="Pipeline ponderado" value={safeMoney(pipeline.weighted)} />
                <Kpi label="Contatos na base" value={String(initialData.contacts.length)} />
                <Kpi label="Conversas relevantes" value={String(activityTotals.conversations)} />
                <Kpi label="Reuniões" value={String(activityTotals.meetings)} />
              </div>
              <Panel title="Prioridades de hoje">
                <Empty text="As próximas ações serão exibidas após a promoção reconciliada da migração." />
              </Panel>
            </div>
          )}

          {tab === "Dia anterior" && (
            <div role="tabpanel" id="panel-Dia anterior" aria-label="Dia anterior" tabIndex={0}>
              <Panel title="Atividades registradas">
                <ActivityTable rows={initialData.activities} />
              </Panel>
            </div>
          )}

          {tab === "Prospecção" && (
            <div role="tabpanel" id="panel-Prospecção" aria-label="Prospecção" tabIndex={0}>
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
                  placeholder="Buscar conta ou contato"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <Panel title={`Lista de prospecção · ${filteredContacts.length}`}>
                <ContactTable rows={filteredContacts} />
              </Panel>
              <p className="hint" role="status" aria-live="polite">
                {filteredContacts.length} resultado(s) para “{deferredQuery || "todos"}”.
              </p>
            </div>
          )}

          {tab === "Reunião executiva" && (
            <div role="tabpanel" id="panel-Reunião executiva" aria-label="Reunião executiva" tabIndex={0}>
              <div className="hero">
                <div>
                  <small>RESUMO EXECUTIVO</small>
                  <h2>{pipeline.count ? `${pipeline.count} oportunidades abertas` : "Nenhuma oportunidade qualificada registrada."}</h2>
                  <p>Indicadores derivados exclusivamente de dados persistidos no Supabase.</p>
                </div>
              </div>
              <Panel title="Atividade consolidada">
                <ActivityTable rows={initialData.activities} />
              </Panel>
            </div>
          )}

          {tab === "Pipeline" && (
            <div role="tabpanel" id="panel-Pipeline" aria-label="Pipeline" tabIndex={0}>
              <Panel title={`Pipeline · ${initialData.opportunities.length}`}>
                <OpportunityTable rows={initialData.opportunities} />
              </Panel>
            </div>
          )}

          {tab === "Contas prioritárias" && (
            <div role="tabpanel" id="panel-Contas prioritárias" aria-label="Contas prioritárias" tabIndex={0}>
              <div className="accountGrid">
                {initialData.accounts.slice(0, 30).map((row) => (
                  <article className="card" key={String(row.id)}>
                    <small>CONTA</small>
                    <h3>{str(row.canonical_name, "Conta sem nome")}</h3>
                    <p>{contactsByAccount.get(row.id) ?? 0} contatos mapeados</p>
                  </article>
                ))}
              </div>
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
function ContactTable({ rows }: { rows: Row[] }) {
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
          const account = (r.account as AccountRef | null)?.canonical_name;
          return (
            <tr key={String(r.id)}>
              <td>
                <b>{name}</b>
                <small>{typeof account === "string" ? account : ""}</small>
              </td>
              <td>{str(r.role_title)}</td>
              <td>{str(r.owner_name)}</td>
              <td>
                <span className="pill">{str(r.status_raw, "A validar")}</span>
              </td>
              <td>{formatCommercialDate(r.last_contact_at as string | number | Date | null | undefined)}</td>
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
function ActivityTable({ rows }: { rows: Row[] }) {
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
            <td>{formatCommercialDate(r.effective_on as string | number | Date | null | undefined)}</td>
            <td>{str(r.owner_name)}</td>
            <td>{str((r.channel as { name?: unknown } | null)?.name)}</td>
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
function OpportunityTable({ rows }: { rows: Row[] }) {
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
                <b>{str((r.account as AccountRef | null)?.canonical_name)}</b>
                <small>{str(r.title, "")}</small>
              </td>
              <td>{str(r.owner_name)}</td>
              <td>
                <span className="pill">{str((r.stage as StageRef | null)?.name, "A validar")}</span>
              </td>
              <td>{safeMoney(r.value_amount)}</td>
              <td>{typeof prob === "number" && Number.isFinite(prob) ? `${prob}%` : "—"}</td>
              <td>{formatCommercialDate(r.expected_close_on as string | number | Date | null | undefined)}</td>
              <td>{str(r.next_action)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
