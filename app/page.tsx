"use client";

import Link from "next/link";
import { ReactNode, useEffect, useMemo, useState } from "react";
import {
  AreaChart,
  CalendarClock,
  ClipboardList,
  CreditCard,
  FileText,
  LineChart,
  Plus,
  RefreshCw,
  TrendingUp,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";

type Prospect = {
  id: string;
  full_name: string | null;
  status: string | null;
  estimated_value?: number | null;
  expected_value?: number | null;
  probability?: number | null;
  probability_to_close?: number | null;
  next_follow_up?: string | null;
  created_at?: string | null;
};

type Quote = {
  id: string;
  quote_number: string;
  total: number | null;
  status: string | null;
  valid_until?: string | null;
  created_at?: string | null;
  clients?: { full_name: string | null } | null;
  prospects?: { full_name: string | null } | null;
};

type WorkOrder = {
  id: string;
  title: string;
  status: string | null;
  balance: number | null;
  due_date: string | null;
  clients?: { full_name: string | null } | null;
};

type Payment = {
  id: string;
  amount: number | null;
  payment_status: string | null;
  paid_at: string | null;
  created_at: string | null;
};

type Sale = {
  id: string;
  total: number | null;
  balance: number | null;
  paid_amount: number | null;
  created_at: string | null;
  issued_at?: string | null;
  payment_status?: string | null;
  status?: string | null;
};

type CollectionAccount = {
  id: string;
  account_number: string | null;
  total: number | null;
  balance: number | null;
  status: string | null;
  created_at: string | null;
  paid_at?: string | null;
  updated_at?: string | null;
};

type Task = {
  id: string;
  title: string;
  status: string | null;
  priority: string | null;
  due_at: string | null;
  clients?: { full_name: string | null } | null;
  prospects?: { full_name: string | null } | null;
  work_orders?: { title: string | null } | null;
};

type ChartPoint = {
  label: string;
  value: number;
};

type BarPoint = {
  label: string;
  value: number;
  helper?: string;
};

function money(value?: number | null) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

function compactMoney(value?: number | null) {
  const amount = Number(value ?? 0);

  if (Math.abs(amount) >= 1000000) {
    return `$${(amount / 1000000).toFixed(amount >= 10000000 ? 0 : 1)} M`;
  }

  if (Math.abs(amount) >= 1000) {
    return `$${(amount / 1000).toFixed(0)} mil`;
  }

  return money(amount);
}

function normalize(value?: string | null) {
  return String(value ?? "").toLowerCase().replaceAll(" ", "_");
}

function shortDate(value?: string | null) {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha inválida";
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function isCurrentMonth(value?: string | null) {
  if (!value) return false;
  const date = new Date(value);
  const now = new Date();
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}

function daysAgo(days: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date;
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function dayLabel(date: Date) {
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function isWithinLastDays(value: string | null | undefined, days: number) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() >= daysAgo(days).getTime();
}

function isCancelled(value?: string | null) {
  return ["anulada", "cancelada", "cancelado", "rechazada", "rechazado", "fallida", "fallido"].includes(normalize(value));
}

function isPaid(value?: string | null) {
  return ["pagada", "pagado", "recibido", "aprobado", "confirmado", "completado", "completed"].includes(normalize(value));
}

function paymentCountsAsIncome(payment: Payment) {
  const status = normalize(payment.payment_status);

  if (!status) return true;

  return !["pendiente", "anulado", "anulada", "cancelado", "cancelada", "fallido", "fallida", "rechazado", "rechazada"].includes(status);
}

export default function DashboardPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [collectionAccounts, setCollectionAccounts] = useState<CollectionAccount[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadData() {
    setLoading(true);
    setMessage("");

    const [prospectsRes, quotesRes, ordersRes, paymentsRes, salesRes, collectionAccountsRes, tasksRes] = await Promise.all([
      supabase.from("prospects").select("id, full_name, status, estimated_value, expected_value, probability, probability_to_close, next_follow_up, created_at").order("created_at", { ascending: false }),
      supabase.from("quotes").select("id, quote_number, total, status, valid_until, created_at, clients(full_name), prospects(full_name)").order("created_at", { ascending: false }),
      supabase.from("work_orders").select("id, title, status, balance, due_date, clients(full_name)").order("created_at", { ascending: false }),
      supabase.from("payments").select("id, amount, payment_status, paid_at, created_at").order("created_at", { ascending: false }),
      supabase.from("sales").select("id, total, balance, paid_amount, payment_status, status, created_at, issued_at").order("created_at", { ascending: false }),
      supabase.from("collection_accounts").select("id, account_number, total, balance, status, paid_at, created_at, updated_at").order("created_at", { ascending: false }),
      supabase.from("tasks").select("id, title, status, priority, due_at, clients(full_name), prospects(full_name), work_orders(title)").order("due_at", { ascending: true, nullsFirst: false }),
    ]);

    if (!prospectsRes.error) setProspects((prospectsRes.data ?? []) as Prospect[]);
    if (!quotesRes.error) setQuotes((quotesRes.data ?? []) as unknown as Quote[]);
    if (!ordersRes.error) setOrders((ordersRes.data ?? []) as unknown as WorkOrder[]);
    if (!paymentsRes.error) setPayments((paymentsRes.data ?? []) as Payment[]);
    if (!salesRes.error) setSales((salesRes.data ?? []) as Sale[]);
    if (!collectionAccountsRes.error) setCollectionAccounts((collectionAccountsRes.data ?? []) as CollectionAccount[]);
    if (!tasksRes.error) setTasks((tasksRes.data ?? []) as unknown as Task[]);

    const errors = [
      prospectsRes.error,
      quotesRes.error,
      ordersRes.error,
      paymentsRes.error,
      salesRes.error,
      collectionAccountsRes.error,
      tasksRes.error,
    ].filter(Boolean);

    if (errors.length) {
      setMessage("Algunos datos no se pudieron cargar. Revisa que todas las tablas existan en Supabase.");
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const dashboard = useMemo(() => {
    const incomePayments30 = payments
      .filter((payment) => paymentCountsAsIncome(payment))
      .filter((payment) => isWithinLastDays(payment.paid_at ?? payment.created_at, 30))
      .reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0);

    const incomeSales30 = sales
      .filter((sale) => isWithinLastDays(sale.issued_at ?? sale.created_at, 30))
      .reduce((sum, sale) => sum + Number(sale.paid_amount ?? 0), 0);

    const incomeLast30Days = Math.max(incomePayments30, incomeSales30);

    const receivedPaymentsAll = payments
      .filter((payment) => paymentCountsAsIncome(payment))
      .reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0);

    const salesPaidAll = sales.reduce((sum, sale) => sum + Number(sale.paid_amount ?? 0), 0);

    const monthlySales = sales
      .filter((sale) => isCurrentMonth(sale.issued_at ?? sale.created_at))
      .reduce((sum, sale) => sum + Number(sale.total ?? 0), 0);

    const projectedQuotes = quotes
      .filter((quote) => !["rechazada", "perdida", "perdido"].includes(normalize(quote.status)))
      .reduce((sum, quote) => sum + Number(quote.total ?? 0), 0);

    const projectedProspects = prospects
      .filter((prospect) => !["perdido", "perdida", "ganado", "ganada"].includes(normalize(prospect.status)))
      .reduce((sum, prospect) => {
        const estimate = Number(prospect.estimated_value ?? prospect.expected_value ?? 0);
        const probability = Number(prospect.probability ?? prospect.probability_to_close ?? 0);
        return sum + estimate * (probability > 0 ? probability / 100 : 1);
      }, 0);

    const pendingSales = sales
      .filter((sale) => !isCancelled(sale.status))
      .reduce((sum, sale) => sum + Number(sale.balance ?? 0), 0);

    const pendingAccounts = collectionAccounts
      .filter((account) => !isCancelled(account.status) && !isPaid(account.status))
      .reduce((sum, account) => sum + Number(account.balance ?? 0), 0);

    const pendingOrders = orders
      .filter((order) => !["entregado", "cancelado", "terminado"].includes(normalize(order.status)))
      .reduce((sum, order) => sum + Number(order.balance ?? 0), 0);

    const pendingToEnter = Math.max(pendingAccounts, pendingSales, pendingOrders);

    const activeProspects = prospects.filter((prospect) => !["perdido", "perdida", "ganado", "ganada"].includes(normalize(prospect.status))).length;
    const pendingTasks = tasks.filter((task) => !["completada", "cancelada"].includes(normalize(task.status))).length;

    const days = Array.from({ length: 30 }, (_, index) => {
      const date = daysAgo(29 - index);
      return {
        key: dateKey(date),
        label: dayLabel(date),
        value: 0,
      };
    });

    const dayMap = new Map(days.map((day) => [day.key, day]));

    payments
      .filter((payment) => paymentCountsAsIncome(payment))
      .forEach((payment) => {
        const rawDate = payment.paid_at ?? payment.created_at;
        if (!rawDate || !isWithinLastDays(rawDate, 30)) return;

        const key = dateKey(new Date(rawDate));
        const day = dayMap.get(key);

        if (day) {
          day.value += Number(payment.amount ?? 0);
        }
      });

    if (days.every((day) => day.value === 0)) {
      sales.forEach((sale) => {
        const rawDate = sale.issued_at ?? sale.created_at;
        if (!rawDate || !isWithinLastDays(rawDate, 30)) return;

        const key = dateKey(new Date(rawDate));
        const day = dayMap.get(key);

        if (day) {
          day.value += Number(sale.paid_amount ?? 0);
        }
      });
    }

    const pendingBySource: BarPoint[] = [
      {
        label: "Cuentas de cobro",
        value: pendingAccounts,
        helper: "Saldo acumulado",
      },
      {
        label: "Ventas",
        value: pendingSales,
        helper: "Saldo de ventas",
      },
      {
        label: "Órdenes",
        value: pendingOrders,
        helper: "Saldo de órdenes",
      },
    ];

    const quotesByStatusMap = quotes.reduce((acc, quote) => {
      const status = String(quote.status ?? "sin estado").replaceAll("_", " ");
      acc.set(status, (acc.get(status) ?? 0) + Number(quote.total ?? 0));
      return acc;
    }, new Map<string, number>());

    const quotesByStatus: BarPoint[] = Array.from(quotesByStatusMap.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    return {
      incomeLast30Days,
      received: Math.max(receivedPaymentsAll, salesPaidAll),
      monthlySales,
      projected: projectedQuotes + projectedProspects,
      pendingToEnter,
      pendingSales,
      pendingAccounts,
      pendingOrders,
      activeProspects,
      pendingTasks,
      incomeDaily: days,
      pendingBySource,
      quotesByStatus,
    };
  }, [payments, sales, quotes, prospects, orders, collectionAccounts, tasks]);

  const latestQuotes = quotes.slice(0, 4);
  const upcomingTasks = tasks
    .filter((task) => !["completada", "cancelada"].includes(normalize(task.status)))
    .slice(0, 5);

  const upcomingOrders = orders
    .filter((order) => !["entregado", "cancelado", "terminado"].includes(normalize(order.status)))
    .slice(0, 5);

  return (
    <main className="flex min-h-screen bg-[#F4FBFA] text-[#0B1F33]">
      <Sidebar />

      <section className="flex-1 p-4 md:p-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-[#0F766E]">Panel principal</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight md:text-5xl">Mendoza Manager</h1>
            <p className="mt-2 max-w-3xl text-[#5D7485]">
              Control comercial, cartera pendiente, ingresos recientes, cotizaciones, pagos y operación diaria.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/cotizaciones" className="mm-btn-primary">
              <Plus size={18} /> Nueva cotización
            </Link>
            <Link href="/pagos" className="mm-btn-soft">
              <WalletCards size={18} /> Registrar pago
            </Link>
            <button onClick={loadData} className="mm-btn-soft">
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Actualizar
            </button>
          </div>
        </div>

        {message && (
          <div className="mb-6 rounded-3xl border border-[#BFE8E2] bg-[#EAF8F5] p-4 text-sm font-semibold text-[#0F766E]">
            {message}
          </div>
        )}

        <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Metric
            title="Pendiente por ingresar"
            value={money(dashboard.pendingToEnter)}
            helper="Cartera total pendiente"
            icon={<CreditCard size={20} />}
          />
          <Metric
            title="Ingresado últimos 30 días"
            value={money(dashboard.incomeLast30Days)}
            helper="Pagos o abonos recientes"
            icon={<TrendingUp size={20} />}
          />
          <Metric
            title="Ventas del mes"
            value={money(dashboard.monthlySales)}
            helper="Ventas emitidas este mes"
            icon={<WalletCards size={20} />}
          />
          <Metric
            title="Proyección comercial"
            value={money(dashboard.projected)}
            helper="Cotizaciones + prospectos"
            icon={<AreaChart size={20} />}
          />
          <Metric
            title="Prospectos activos"
            value={String(dashboard.activeProspects)}
            helper={`${dashboard.pendingTasks} tareas pendientes`}
            icon={<UsersRound size={20} />}
          />
        </div>

        <div className="mb-6 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <section className="rounded-[2rem] border border-[#D8E8E5] bg-white p-5 shadow-[0_18px_45px_rgba(11,31,51,0.08)]">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#5D7485]">Flujo de caja</p>
                <h2 className="text-2xl font-black text-[#0B1F33]">Ingresos de los últimos 30 días</h2>
              </div>
              <div className="rounded-2xl bg-[#DDF4F2] p-3 text-[#0F766E]">
                <LineChart size={26} />
              </div>
            </div>

            <IncomeLineChart data={dashboard.incomeDaily} />
          </section>

          <section className="rounded-[2rem] border border-[#D8E8E5] bg-white p-5 shadow-[0_18px_45px_rgba(11,31,51,0.08)]">
            <div className="mb-5">
              <p className="text-sm font-semibold text-[#5D7485]">Cartera</p>
              <h2 className="text-2xl font-black text-[#0B1F33]">Pendiente por fuente</h2>
            </div>

            <HorizontalBars data={dashboard.pendingBySource} />
          </section>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-[2rem] border border-[#D8E8E5] bg-white p-5 shadow-[0_18px_45px_rgba(11,31,51,0.08)]">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#5D7485]">Documentos</p>
                <h2 className="text-2xl font-black text-[#0B1F33]">Acciones rápidas</h2>
              </div>
              <div className="rounded-2xl bg-[#DDF4F2] p-3 text-[#0F766E]">
                <FileText size={26} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <QuickAction href="/cotizaciones" label="Crear cotización" icon={<FileText size={20} />} />
              <QuickAction href="/pagos" label="Registrar pago" icon={<WalletCards size={20} />} />
              <QuickAction href="/ordenes" label="Nueva orden" icon={<ClipboardList size={20} />} />
              <QuickAction href="/calendario" label="Agendar entrega" icon={<CalendarClock size={20} />} />
            </div>
          </section>

          <section className="rounded-[2rem] border border-[#D8E8E5] bg-white p-5 shadow-[0_18px_45px_rgba(11,31,51,0.08)]">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#5D7485]">No perder ventas</p>
                <h2 className="text-2xl font-black text-[#0B1F33]">Seguimientos prioritarios</h2>
              </div>
            </div>

            <div className="space-y-3">
              {upcomingTasks.map((task) => (
                <article key={task.id} className="rounded-3xl border border-[#D8E8E5] bg-[#F8FFFD] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-black text-[#0B1F33]">{task.title}</h3>
                      <p className="mt-1 text-sm font-semibold text-[#5D7485]">
                        {task.clients?.full_name ?? task.prospects?.full_name ?? task.work_orders?.title ?? "Sin relación"}
                      </p>
                    </div>
                    <span className="rounded-full border border-[#BFE8E2] bg-[#DDF4F2] px-3 py-1 text-xs font-black text-[#0F766E]">
                      {shortDate(task.due_at)}
                    </span>
                  </div>
                </article>
              ))}

              {!upcomingTasks.length && (
                <p className="rounded-3xl border border-dashed border-[#D8E8E5] bg-[#F8FFFD] p-8 text-center text-[#5D7485]">
                  No tienes tareas pendientes por ahora.
                </p>
              )}
            </div>
          </section>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-[2rem] border border-[#D8E8E5] bg-white p-5 shadow-[0_18px_45px_rgba(11,31,51,0.08)]">
            <div className="mb-5">
              <p className="text-sm font-semibold text-[#5D7485]">Cotizaciones</p>
              <h2 className="text-2xl font-black text-[#0B1F33]">Valor por estado</h2>
            </div>

            <HorizontalBars data={dashboard.quotesByStatus.length ? dashboard.quotesByStatus : [{ label: "Sin cotizaciones", value: 0 }]} />
          </section>

          <section className="rounded-[2rem] border border-[#D8E8E5] bg-white p-5 shadow-[0_18px_45px_rgba(11,31,51,0.08)]">
            <div className="mb-5">
              <p className="text-sm font-semibold text-[#5D7485]">Ventas y seguimiento</p>
              <h2 className="text-2xl font-black text-[#0B1F33]">Cotizaciones recientes</h2>
            </div>

            <div className="space-y-3">
              {latestQuotes.map((quote) => (
                <article key={quote.id} className="rounded-3xl border border-[#D8E8E5] bg-[#F8FFFD] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-black text-[#0B1F33]">{quote.quote_number}</h3>
                      <p className="mt-1 text-sm font-semibold text-[#5D7485]">
                        {quote.clients?.full_name ?? quote.prospects?.full_name ?? "Sin contacto"}
                      </p>
                      <span className="mt-2 inline-flex rounded-full border border-[#BFE8E2] bg-[#DDF4F2] px-3 py-1 text-xs font-black text-[#0F766E]">
                        {quote.status ?? "sin estado"}
                      </span>
                    </div>
                    <p className="text-xl font-black text-[#0F766E]">{money(quote.total)}</p>
                  </div>
                </article>
              ))}

              {!latestQuotes.length && (
                <p className="rounded-3xl border border-dashed border-[#D8E8E5] bg-[#F8FFFD] p-8 text-center text-[#5D7485]">
                  Aún no tienes cotizaciones registradas.
                </p>
              )}
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-[2rem] border border-[#D8E8E5] bg-white p-5 shadow-[0_18px_45px_rgba(11,31,51,0.08)]">
          <div className="mb-5">
            <p className="text-sm font-semibold text-[#5D7485]">Operación</p>
            <h2 className="text-2xl font-black text-[#0B1F33]">Próximas entregas</h2>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {upcomingOrders.map((order) => (
              <article key={order.id} className="rounded-3xl border border-[#D8E8E5] bg-[#F8FFFD] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-black text-[#0B1F33]">{order.title}</h3>
                    <p className="mt-1 text-sm font-semibold text-[#5D7485]">
                      {order.clients?.full_name ?? "Sin cliente"}
                    </p>
                    <span className="mt-2 inline-flex rounded-full border border-[#D8E8E5] bg-white px-3 py-1 text-xs font-black text-[#34495E]">
                      {order.status ?? "sin estado"}
                    </span>
                  </div>
                  <p className="font-black text-[#0F766E]">{shortDate(order.due_date)}</p>
                </div>
              </article>
            ))}

            {!upcomingOrders.length && (
              <p className="rounded-3xl border border-dashed border-[#D8E8E5] bg-[#F8FFFD] p-8 text-center text-[#5D7485] md:col-span-2 xl:col-span-3">
                No tienes entregas próximas registradas.
              </p>
            )}
          </div>
        </section>
      </section>

      <style jsx global>{`
        .mm-btn-soft {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: .5rem;
          border-radius: 1rem;
          border: 1px solid #BFE8E2;
          background: #EAF8F5;
          padding: .75rem 1rem;
          font-weight: 900;
          color: #0B1F33 !important;
          transition: .2s ease;
          text-decoration: none;
        }

        .mm-btn-soft:hover {
          background: #DDF4F2;
          border-color: #1AB7A6;
        }

        .mm-btn-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: .5rem;
          border-radius: 1rem;
          border: 1px solid #0B1F33;
          background: #0B1F33;
          padding: .85rem 1rem;
          font-weight: 900;
          color: #FFFFFF !important;
          transition: .2s ease;
          text-decoration: none;
        }

        .mm-btn-primary * {
          color: #FFFFFF !important;
        }

        .mm-btn-primary:hover {
          background: #123653;
          border-color: #123653;
        }
      `}</style>
    </main>
  );
}

function Metric({ title, value, helper, icon }: { title: string; value: string; helper?: string; icon: ReactNode }) {
  return (
    <div className="rounded-3xl border border-[#D8E8E5] bg-white p-5 shadow-[0_14px_35px_rgba(11,31,51,0.07)]">
      <div className="mb-3 inline-flex rounded-2xl bg-[#DDF4F2] p-3 text-[#0F766E]">
        {icon}
      </div>
      <p className="text-sm font-semibold text-[#5D7485]">{title}</p>
      <p className="mt-1 text-2xl font-black text-[#0B1F33]">{value}</p>
      {helper && <p className="mt-1 text-xs font-bold text-[#7890A0]">{helper}</p>}
    </div>
  );
}

function IncomeLineChart({ data }: { data: ChartPoint[] }) {
  const max = Math.max(...data.map((point) => point.value), 1);
  const width = 720;
  const height = 250;
  const paddingX = 22;
  const paddingY = 22;
  const usableWidth = width - paddingX * 2;
  const usableHeight = height - paddingY * 2;

  const points = data.map((point, index) => {
    const x = paddingX + (index / Math.max(data.length - 1, 1)) * usableWidth;
    const y = paddingY + usableHeight - (point.value / max) * usableHeight;
    return { ...point, x, y };
  });

  const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
  const areaPath = `${linePath} L ${paddingX + usableWidth} ${paddingY + usableHeight} L ${paddingX} ${paddingY + usableHeight} Z`;
  const total = data.reduce((sum, point) => sum + point.value, 0);
  const bestDay = data.reduce((best, point) => point.value > best.value ? point : best, data[0] ?? { label: "—", value: 0 });

  return (
    <div>
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <MiniStat label="Total 30 días" value={money(total)} />
        <MiniStat label="Mejor día" value={bestDay ? `${bestDay.label} · ${compactMoney(bestDay.value)}` : "Sin datos"} />
        <MiniStat label="Promedio diario" value={money(total / 30)} />
      </div>

      <div className="overflow-hidden rounded-3xl border border-[#D8E8E5] bg-[#F8FFFD] p-4">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-[260px] w-full">
          <defs>
            <linearGradient id="incomeGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#1AB7A6" stopOpacity="0.24" />
              <stop offset="100%" stopColor="#1AB7A6" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {[0, 0.25, 0.5, 0.75, 1].map((step) => {
            const y = paddingY + step * usableHeight;
            return (
              <line
                key={step}
                x1={paddingX}
                x2={paddingX + usableWidth}
                y1={y}
                y2={y}
                stroke="#D8E8E5"
                strokeDasharray="5 6"
              />
            );
          })}

          <path d={areaPath} fill="url(#incomeGradient)" />
          <path d={linePath} fill="none" stroke="#0F766E" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />

          {points.map((point, index) => (
            <circle key={`${point.label}-${index}`} cx={point.x} cy={point.y} r={point.value > 0 ? 4 : 2.5} fill={point.value > 0 ? "#0F766E" : "#BFE8E2"} />
          ))}
        </svg>

        <div className="mt-2 flex justify-between text-xs font-black uppercase tracking-[0.18em] text-[#7890A0]">
          <span>{data[0]?.label ?? "Inicio"}</span>
          <span>{data[Math.floor(data.length / 2)]?.label ?? "Mitad"}</span>
          <span>{data[data.length - 1]?.label ?? "Hoy"}</span>
        </div>
      </div>
    </div>
  );
}

function HorizontalBars({ data }: { data: BarPoint[] }) {
  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="space-y-4">
      {data.map((item) => {
        const percent = Math.max((item.value / max) * 100, item.value > 0 ? 5 : 0);

        return (
          <div key={item.label} className="rounded-3xl border border-[#D8E8E5] bg-[#F8FFFD] p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <p className="font-black text-[#0B1F33]">{item.label}</p>
                {item.helper && <p className="text-xs font-bold text-[#7890A0]">{item.helper}</p>}
              </div>
              <p className="font-black text-[#0F766E]">{money(item.value)}</p>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-[#EAF8F5]">
              <div
                className="h-full rounded-full bg-[#0F766E]"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#D8E8E5] bg-white p-3">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#7890A0]">{label}</p>
      <p className="mt-1 font-black text-[#0B1F33]">{value}</p>
    </div>
  );
}

function QuickAction({ href, label, icon }: { href: string; label: string; icon: ReactNode }) {
  return (
    <Link
      href={href}
      className="group flex min-h-[86px] items-center justify-between rounded-3xl border border-[#BFE8E2] bg-[#EAF8F5] px-5 py-4 font-black text-[#0B1F33] transition hover:-translate-y-0.5 hover:border-[#1AB7A6] hover:bg-[#DDF4F2] hover:shadow-[0_12px_30px_rgba(11,31,51,0.08)]"
    >
      <span className="flex items-center gap-3">
        <span className="rounded-2xl bg-white p-2 text-[#0F766E] shadow-sm">
          {icon}
        </span>
        {label}
      </span>

      <span className="text-[#0F766E] opacity-0 transition group-hover:opacity-100">
        →
      </span>
    </Link>
  );
}
