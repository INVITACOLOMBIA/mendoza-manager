"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState, type CSSProperties } from "react";
import { Sidebar } from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";

type Client = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  document_number: string | null;
  address: string | null;
  city: string | null;
};

type Quote = {
  id: string;
  quote_number: string;
  client_id: string | null;
  status: string;
  total: number | null;
  delivery_time: string | null;
  notes: string | null;
  valid_until: string | null;
  created_at: string | null;
};

type WorkOrder = {
  id: string;
  quote_id: string | null;
  client_id: string | null;
  title: string;
  description: string | null;
  status: string;
  start_date: string | null;
  due_date: string | null;
  delivered_at: string | null;
  total_value: number | null;
  advance_value: number | null;
  balance: number | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  billing_status: string | null;
  last_collection_account_id: string | null;
};

function money(value: number | null | undefined) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

function dateText(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function nextWeek() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().slice(0, 10);
}

function numeric(value: string) {
  const parsed = Number(String(value || "0").replace(/,/g, "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function OrdenesPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [orders, setOrders] = useState<WorkOrder[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [quoteId, setQuoteId] = useState("");
  const [clientId, setClientId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("pendiente");
  const [startDate, setStartDate] = useState(today());
  const [dueDate, setDueDate] = useState(nextWeek());
  const [totalValue, setTotalValue] = useState("0");
  const [advanceValue, setAdvanceValue] = useState("0");
  const [notes, setNotes] = useState("");
  const [billingStatus, setBillingStatus] = useState("pendiente");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const balance = Math.max(numeric(totalValue) - numeric(advanceValue), 0);

  async function loadData() {
    setLoading(true);
    setMessage("");

    const [clientsRes, quotesRes, ordersRes] = await Promise.all([
      supabase.from("clients").select("id, full_name, phone, email, document_number, address, city").order("full_name"),
      supabase.from("quotes").select("*").order("created_at", { ascending: false }),
      supabase.from("work_orders").select("*").order("created_at", { ascending: false }),
    ]);

    if (!clientsRes.error) setClients((clientsRes.data ?? []) as Client[]);
    if (!quotesRes.error) setQuotes((quotesRes.data ?? []) as Quote[]);
    if (!ordersRes.error) setOrders((ordersRes.data ?? []) as WorkOrder[]);

    const errors = [clientsRes.error, quotesRes.error, ordersRes.error].filter(Boolean);

    if (errors.length) {
      setMessage("Algunos datos no se pudieron cargar.");
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredOrders = useMemo(() => {
    const term = search.toLowerCase().trim();

    return orders.filter((order) => {
      const client = clients.find((item) => item.id === order.client_id);
      const quote = quotes.find((item) => item.id === order.quote_id);

      const matchesSearch =
        !term ||
        [
          order.title,
          order.description,
          order.status,
          order.notes,
          order.billing_status,
          client?.full_name,
          client?.phone,
          client?.email,
          quote?.quote_number,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));

      const matchesStatus = statusFilter === "todos" || order.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [orders, clients, quotes, search, statusFilter]);

  function clientName(id: string | null) {
    return clients.find((client) => client.id === id)?.full_name ?? "Sin cliente";
  }

  function clientData(id: string | null) {
    return clients.find((client) => client.id === id) ?? null;
  }

  function quoteLabel(id: string | null) {
    const quote = quotes.find((item) => item.id === id);
    return quote ? quote.quote_number : "Sin cotización";
  }

  function clearForm() {
    setEditingId(null);
    setQuoteId("");
    setClientId("");
    setTitle("");
    setDescription("");
    setStatus("pendiente");
    setStartDate(today());
    setDueDate(nextWeek());
    setTotalValue("0");
    setAdvanceValue("0");
    setNotes("");
    setBillingStatus("pendiente");
  }

  function onSelectQuote(id: string) {
    setQuoteId(id);

    const quote = quotes.find((item) => item.id === id);

    if (!quote) return;

    setClientId(quote.client_id ?? "");
    setTitle("Orden de trabajo - " + quote.quote_number);
    setDescription("Orden generada a partir de la cotización " + quote.quote_number);
    setTotalValue(String(quote.total ?? 0));
    setAdvanceValue(String(Math.round(Number(quote.total ?? 0) * 0.5)));
    setNotes(quote.notes ?? "");
  }

  function startEdit(order: WorkOrder) {
    setEditingId(order.id);
    setQuoteId(order.quote_id ?? "");
    setClientId(order.client_id ?? "");
    setTitle(order.title ?? "");
    setDescription(order.description ?? "");
    setStatus(order.status ?? "pendiente");
    setStartDate(order.start_date ?? today());
    setDueDate(order.due_date ?? nextWeek());
    setTotalValue(String(order.total_value ?? 0));
    setAdvanceValue(String(order.advance_value ?? 0));
    setNotes(order.notes ?? "");
    setBillingStatus(order.billing_status ?? "pendiente");
    setMessage("Editando orden de trabajo.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveOrder(event: FormEvent) {
    event.preventDefault();

    if (!clientId) {
      setMessage("Selecciona un cliente.");
      return;
    }

    if (!title.trim()) {
      setMessage("El título de la orden es obligatorio.");
      return;
    }

    setLoading(true);
    setMessage("");

    const deliveredValue = status === "entregada" ? new Date().toISOString() : null;

    const payload = {
      quote_id: quoteId || null,
      client_id: clientId,
      title: title.trim(),
      description: description.trim() || null,
      status,
      start_date: startDate || null,
      due_date: dueDate || null,
      delivered_at: deliveredValue,
      total_value: numeric(totalValue),
      advance_value: numeric(advanceValue),
      balance,
      notes: notes.trim() || null,
      billing_status: billingStatus,
      updated_at: new Date().toISOString(),
    };

    const result = editingId
      ? await supabase.from("work_orders").update(payload).eq("id", editingId)
      : await supabase.from("work_orders").insert({
          id: crypto.randomUUID(),
          ...payload,
          created_at: new Date().toISOString(),
        });

    if (result.error) {
      setMessage("No se pudo guardar la orden: " + result.error.message);
      setLoading(false);
      return;
    }

    setMessage(editingId ? "Orden actualizada correctamente." : "Orden creada correctamente.");
    clearForm();
    await loadData();
    setLoading(false);
  }

  async function deleteOrder(order: WorkOrder) {
    const ok = confirm("¿Eliminar la orden de trabajo: " + order.title + "?");
    if (!ok) return;

    setLoading(true);
    setMessage("");

    const { error } = await supabase.from("work_orders").delete().eq("id", order.id);

    if (error) {
      setMessage("No se pudo eliminar: " + error.message);
    } else {
      setMessage("Orden eliminada correctamente.");
      await loadData();
    }

    setLoading(false);
  }

  async function changeStatus(order: WorkOrder, nextStatus: string) {
    const payload: Partial<WorkOrder> & { updated_at: string } = {
      status: nextStatus,
      updated_at: new Date().toISOString(),
    };

    if (nextStatus === "entregada") {
      payload.delivered_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("work_orders")
      .update(payload)
      .eq("id", order.id);

    if (error) {
      setMessage("No se pudo actualizar el estado: " + error.message);
    } else {
      setMessage("Estado actualizado.");
      await loadData();
    }
  }

  function printOrder(order: WorkOrder) {
    const client = clientData(order.client_id);

    const html = `
      <html>
        <head>
          <title>${order.title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; color: #0B1F33; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0B1F33; padding-bottom: 16px; margin-bottom: 24px; }
            h1, h2, h3, p { margin: 0 0 8px; }
            .muted { color: #5D7485; }
            .box { margin-top: 18px; padding: 16px; background: #F4FBFA; border: 1px solid #D8E8E5; border-radius: 16px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 18px; }
            .total { font-size: 20px; text-align: right; margin-top: 24px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>Mendoza Manager</h1>
              <p class="muted">Orden de trabajo</p>
            </div>
            <div>
              <h2>${order.title}</h2>
              <p><b>Estado:</b> ${order.status}</p>
              <p><b>Cotización:</b> ${quoteLabel(order.quote_id)}</p>
            </div>
          </div>

          <h3>Cliente</h3>
          <p><b>Nombre:</b> ${client?.full_name ?? "Sin cliente"}</p>
          <p><b>Documento:</b> ${client?.document_number ?? "—"}</p>
          <p><b>Teléfono:</b> ${client?.phone ?? "—"}</p>
          <p><b>Dirección:</b> ${client?.address ?? "—"} ${client?.city ?? ""}</p>

          <div class="grid">
            <div class="box">
              <h3>Fechas</h3>
              <p><b>Inicio:</b> ${dateText(order.start_date)}</p>
              <p><b>Entrega estimada:</b> ${dateText(order.due_date)}</p>
              <p><b>Entregado:</b> ${dateText(order.delivered_at)}</p>
            </div>

            <div class="box">
              <h3>Valores</h3>
              <p><b>Total:</b> ${money(order.total_value)}</p>
              <p><b>Anticipo:</b> ${money(order.advance_value)}</p>
              <p><b>Saldo:</b> ${money(order.balance)}</p>
            </div>
          </div>

          <div class="box">
            <h3>Descripción del trabajo</h3>
            <p>${order.description ?? "Sin descripción."}</p>
          </div>

          <div class="box">
            <h3>Notas</h3>
            <p>${order.notes ?? "Sin observaciones."}</p>
          </div>
        </body>
      </html>
    `;

    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  }

  return (
    <main style={{ display: "flex", minHeight: "100vh", background: "#F4FBFA", color: "#0B1F33" }}>
      <Sidebar />

      <section style={{ flex: 1, padding: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", marginBottom: 28 }}>
          <div>
            <p style={{ margin: 0, color: "#0F766E", fontWeight: 900, letterSpacing: 4 }}>
              MENDOZA MANAGER
            </p>
            <h1 style={{ margin: "8px 0", fontSize: 46, fontWeight: 900 }}>
              Órdenes de trabajo
            </h1>
            <p style={{ margin: 0, color: "#5D7485", fontWeight: 700 }}>
              Producción, instalación, seguimiento, entrega y saldos por orden.
            </p>
          </div>

          <button type="button" onClick={loadData} style={softButtonStyle}>
            {loading ? "Cargando..." : "Actualizar"}
          </button>
        </div>

        {message && (
          <div style={{
            background: "#EAF8F5",
            border: "1px solid #BFE8E2",
            color: "#0F766E",
            borderRadius: 20,
            padding: 16,
            marginBottom: 20,
            fontWeight: 800,
          }}>
            {message}
          </div>
        )}

        <form onSubmit={saveOrder} style={cardStyle}>
          <h2 style={{ marginTop: 0, fontSize: 24, fontWeight: 900 }}>
            {editingId ? "Editar orden" : "Nueva orden de trabajo"}
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            <Field label="Cotización relacionada">
              <select value={quoteId} onChange={(e) => onSelectQuote(e.target.value)} style={inputStyle}>
                <option value="">Sin cotización</option>
                {quotes.map((quote) => (
                  <option key={quote.id} value={quote.id}>
                    {quote.quote_number} - {clientName(quote.client_id)} - {money(quote.total)}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Cliente">
              <select value={clientId} onChange={(e) => setClientId(e.target.value)} style={inputStyle}>
                <option value="">Seleccionar cliente</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>{client.full_name}</option>
                ))}
              </select>
            </Field>

            <Field label="Estado">
              <select value={status} onChange={(e) => setStatus(e.target.value)} style={inputStyle}>
                <option value="pendiente">Pendiente</option>
                <option value="en_proceso">En proceso</option>
                <option value="pausada">Pausada</option>
                <option value="terminada">Terminada</option>
                <option value="entregada">Entregada</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </Field>
          </div>

          <Field label="Título de la orden">
            <input value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} placeholder="Ej: Instalación aviso principal" />
          </Field>

          <Field label="Descripción del trabajo">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} style={{ ...inputStyle, minHeight: 90 }} />
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16 }}>
            <Field label="Fecha inicio">
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} />
            </Field>

            <Field label="Fecha entrega">
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={inputStyle} />
            </Field>

            <Field label="Valor total">
              <input value={totalValue} onChange={(e) => setTotalValue(e.target.value)} style={inputStyle} />
            </Field>

            <Field label="Anticipo">
              <input value={advanceValue} onChange={(e) => setAdvanceValue(e.target.value)} style={inputStyle} />
            </Field>

            <TotalCard label="Saldo" value={money(balance)} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16 }}>
            <Field label="Estado de cobro">
              <select value={billingStatus} onChange={(e) => setBillingStatus(e.target.value)} style={inputStyle}>
                <option value="pendiente">Pendiente</option>
                <option value="parcial">Parcial</option>
                <option value="cuenta_cobro">Cuenta de cobro</option>
                <option value="pagada">Pagada</option>
              </select>
            </Field>

            <Field label="Notas internas">
              <input value={notes} onChange={(e) => setNotes(e.target.value)} style={inputStyle} />
            </Field>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
            <button disabled={loading} style={darkButtonStyle}>
              {editingId ? "Actualizar orden" : "Guardar orden"}
            </button>

            <button type="button" onClick={clearForm} style={softButtonStyle}>
              Limpiar
            </button>
          </div>
        </form>

        <section style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "center", marginBottom: 18 }}>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>
              Historial de órdenes
            </h2>

            <div style={{ display: "flex", gap: 10 }}>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." style={{ ...inputStyle, width: 320, marginTop: 0 }} />

              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ ...inputStyle, width: 170, marginTop: 0 }}>
                <option value="todos">Todos</option>
                <option value="pendiente">Pendiente</option>
                <option value="en_proceso">En proceso</option>
                <option value="pausada">Pausada</option>
                <option value="terminada">Terminada</option>
                <option value="entregada">Entregada</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gap: 16 }}>
            {filteredOrders.map((order) => (
              <article key={order.id} style={{
                background: "#F8FFFD",
                border: "1px solid #D8E8E5",
                borderRadius: 24,
                padding: 18,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>{order.title}</h3>
                    <p style={{ margin: "6px 0", color: "#34495E", fontWeight: 800 }}>{clientName(order.client_id)}</p>
                    <p style={{ margin: 0, color: "#5D7485", fontWeight: 700 }}>
                      {quoteLabel(order.quote_id)} · Inicio {dateText(order.start_date)} · Entrega {dateText(order.due_date)}
                    </p>
                    <p style={{ margin: "8px 0 0", color: "#5D7485", fontWeight: 700 }}>
                      Cobro: {order.billing_status || "pendiente"}
                    </p>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <span style={{
                      display: "inline-block",
                      background: order.status === "entregada" ? "#DDF7E8" : "#EAF8F5",
                      color: order.status === "entregada" ? "#157347" : "#0F766E",
                      borderRadius: 999,
                      padding: "7px 10px",
                      fontSize: 12,
                      fontWeight: 900,
                      marginBottom: 8,
                    }}>
                      {order.status}
                    </span>
                    <strong style={{ display: "block", color: "#0F766E", fontSize: 26 }}>{money(order.total_value)}</strong>
                    <p style={{ margin: "4px 0 0", color: "#34495E", fontWeight: 800 }}>Saldo: {money(order.balance)}</p>
                  </div>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
                  <button type="button" onClick={() => startEdit(order)} style={softButtonStyle}>
                    Editar
                  </button>

                  <button type="button" onClick={() => printOrder(order)} style={softButtonStyle}>
                    Imprimir
                  </button>

                  <button type="button" onClick={() => changeStatus(order, "en_proceso")} style={softButtonStyle}>
                    En proceso
                  </button>

                  <button type="button" onClick={() => changeStatus(order, "terminada")} style={softButtonStyle}>
                    Terminada
                  </button>

                  <button type="button" onClick={() => changeStatus(order, "entregada")} style={softButtonStyle}>
                    Entregada
                  </button>

                  <button type="button" onClick={() => deleteOrder(order)} style={dangerButtonStyle}>
                    Eliminar
                  </button>
                </div>
              </article>
            ))}

            {filteredOrders.length === 0 && (
              <div style={{ padding: 40, textAlign: "center", color: "#5D7485", fontWeight: 800 }}>
                No hay órdenes de trabajo para mostrar.
              </div>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: "block", fontWeight: 800, color: "#0B1F33", marginTop: 14 }}>
      {label}
      {children}
    </label>
  );
}

function TotalCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      background: "#FFFFFF",
      border: "1px solid #D8E8E5",
      borderRadius: 18,
      padding: 14,
      marginTop: 14,
    }}>
      <p style={{ margin: 0, color: "#5D7485", fontWeight: 800, fontSize: 12 }}>{label}</p>
      <strong style={{ display: "block", marginTop: 4, color: "#0F766E", fontSize: 18 }}>{value}</strong>
    </div>
  );
}

const cardStyle: CSSProperties = {
  background: "#FFFFFF",
  border: "1px solid #D8E8E5",
  borderRadius: 28,
  padding: 24,
  marginBottom: 24,
};

const inputStyle: CSSProperties = {
  width: "100%",
  marginTop: 8,
  border: "1px solid #D8E8E5",
  background: "#FFFFFF",
  borderRadius: 16,
  padding: "12px 14px",
  color: "#0B1F33",
  outline: "none",
  fontWeight: 700,
};

const softButtonStyle: CSSProperties = {
  border: "1px solid #BFE8E2",
  background: "#EAF8F5",
  borderRadius: 16,
  padding: "10px 14px",
  fontWeight: 900,
  color: "#0B1F33",
  cursor: "pointer",
};

const darkButtonStyle: CSSProperties = {
  border: "1px solid #0B1F33",
  background: "#0B1F33",
  color: "#FFFFFF",
  borderRadius: 16,
  padding: "12px 18px",
  fontWeight: 900,
  cursor: "pointer",
};

const dangerButtonStyle: CSSProperties = {
  border: "1px solid #F4C7C7",
  background: "#FDE2E5",
  color: "#B42318",
  borderRadius: 16,
  padding: "10px 14px",
  fontWeight: 900,
  cursor: "pointer",
};
