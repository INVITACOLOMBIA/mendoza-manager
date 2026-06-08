"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState, type CSSProperties } from "react";
import { Sidebar } from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";

type Client = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
};

type WorkOrder = {
  id: string;
  title: string;
  client_id: string | null;
  status: string;
  due_date: string | null;
};

type CalendarEvent = {
  id: string;
  title: string;
  description: string | null;
  event_type: string | null;
  start_at: string;
  end_at: string | null;
  google_calendar_event_id: string | null;
  prospect_id: string | null;
  client_id: string | null;
  work_order_id: string | null;
  created_at: string | null;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function localDateTime(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function addHours(hours: number) {
  const date = new Date();
  date.setHours(date.getHours() + hours);
  return localDateTime(date);
}

function dateText(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("es-CO", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function timeText(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function toDateTimeLocal(value: string | null) {
  if (!value) return localDateTime();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return localDateTime();
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toIso(value: string) {
  if (!value) return new Date().toISOString();
  return new Date(value).toISOString();
}

function isToday(value: string) {
  const date = new Date(value);
  const now = new Date();

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function isUpcoming(value: string) {
  const date = new Date(value);
  const now = new Date();
  return date >= now;
}

export default function CalendarioPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState("reunion");
  const [clientId, setClientId] = useState("");
  const [workOrderId, setWorkOrderId] = useState("");
  const [startAt, setStartAt] = useState(localDateTime());
  const [endAt, setEndAt] = useState(addHours(1));
  const [description, setDescription] = useState("");

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("todos");
  const [dateFilter, setDateFilter] = useState("proximos");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadData() {
    setLoading(true);
    setMessage("");

    const [clientsRes, ordersRes, eventsRes] = await Promise.all([
      supabase.from("clients").select("id, full_name, phone, email").order("full_name"),
      supabase.from("work_orders").select("id, title, client_id, status, due_date").order("created_at", { ascending: false }),
      supabase.from("calendar_events").select("*").order("start_at", { ascending: true }),
    ]);

    if (!clientsRes.error) setClients((clientsRes.data ?? []) as Client[]);
    if (!ordersRes.error) setOrders((ordersRes.data ?? []) as WorkOrder[]);
    if (!eventsRes.error) setEvents((eventsRes.data ?? []) as CalendarEvent[]);

    const errors = [clientsRes.error, ordersRes.error, eventsRes.error].filter(Boolean);

    if (errors.length) {
      setMessage("Algunos datos no se pudieron cargar.");
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredOrders = useMemo(() => {
    if (!clientId) return orders;
    return orders.filter((order) => order.client_id === clientId);
  }, [orders, clientId]);

  const filteredEvents = useMemo(() => {
    const term = search.toLowerCase().trim();

    return events.filter((event) => {
      const client = clients.find((item) => item.id === event.client_id);
      const order = orders.find((item) => item.id === event.work_order_id);

      const matchesSearch =
        !term ||
        [
          event.title,
          event.description,
          event.event_type,
          client?.full_name,
          client?.phone,
          client?.email,
          order?.title,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));

      const matchesType = typeFilter === "todos" || event.event_type === typeFilter;

      const matchesDate =
        dateFilter === "todos" ||
        (dateFilter === "hoy" && isToday(event.start_at)) ||
        (dateFilter === "proximos" && isUpcoming(event.start_at)) ||
        (dateFilter === "pasados" && !isUpcoming(event.start_at));

      return matchesSearch && matchesType && matchesDate;
    });
  }, [events, clients, orders, search, typeFilter, dateFilter]);

  const todayEvents = useMemo(() => {
    return events.filter((event) => isToday(event.start_at)).length;
  }, [events]);

  const upcomingEvents = useMemo(() => {
    return events.filter((event) => isUpcoming(event.start_at)).length;
  }, [events]);

  function clientName(id: string | null) {
    return clients.find((client) => client.id === id)?.full_name ?? "Sin cliente";
  }

  function orderName(id: string | null) {
    return orders.find((order) => order.id === id)?.title ?? "Sin orden";
  }

  function clearForm() {
    setEditingId(null);
    setTitle("");
    setEventType("reunion");
    setClientId("");
    setWorkOrderId("");
    setStartAt(localDateTime());
    setEndAt(addHours(1));
    setDescription("");
  }

  function onSelectOrder(id: string) {
    setWorkOrderId(id);

    const order = orders.find((item) => item.id === id);

    if (!order) return;

    setClientId(order.client_id ?? "");
    setTitle("Seguimiento - " + order.title);
    setEventType("orden_trabajo");

    if (order.due_date) {
      setStartAt(order.due_date + "T09:00");
      setEndAt(order.due_date + "T10:00");
    }
  }

  function startEdit(event: CalendarEvent) {
    setEditingId(event.id);
    setTitle(event.title);
    setEventType(event.event_type ?? "reunion");
    setClientId(event.client_id ?? "");
    setWorkOrderId(event.work_order_id ?? "");
    setStartAt(toDateTimeLocal(event.start_at));
    setEndAt(event.end_at ? toDateTimeLocal(event.end_at) : "");
    setDescription(event.description ?? "");
    setMessage("Editando evento.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveEvent(event: FormEvent) {
    event.preventDefault();

    if (!title.trim()) {
      setMessage("El título del evento es obligatorio.");
      return;
    }

    if (!startAt) {
      setMessage("Selecciona fecha y hora de inicio.");
      return;
    }

    setLoading(true);
    setMessage("");

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      event_type: eventType,
      start_at: toIso(startAt),
      end_at: endAt ? toIso(endAt) : null,
      client_id: clientId || null,
      work_order_id: workOrderId || null,
      prospect_id: null,
      google_calendar_event_id: null,
    };

    const result = editingId
      ? await supabase.from("calendar_events").update(payload).eq("id", editingId)
      : await supabase.from("calendar_events").insert({
          id: crypto.randomUUID(),
          ...payload,
          created_at: new Date().toISOString(),
        });

    if (result.error) {
      setMessage("No se pudo guardar el evento: " + result.error.message);
      setLoading(false);
      return;
    }

    setMessage(editingId ? "Evento actualizado correctamente." : "Evento creado correctamente.");
    clearForm();
    await loadData();
    setLoading(false);
  }

  async function deleteEvent(event: CalendarEvent) {
    const ok = confirm("¿Eliminar el evento: " + event.title + "?");
    if (!ok) return;

    setLoading(true);
    setMessage("");

    const { error } = await supabase.from("calendar_events").delete().eq("id", event.id);

    if (error) {
      setMessage("No se pudo eliminar: " + error.message);
    } else {
      setMessage("Evento eliminado correctamente.");
      await loadData();
    }

    setLoading(false);
  }

  function printEvent(event: CalendarEvent) {
    const html = `
      <html>
        <head>
          <title>${event.title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; color: #0B1F33; }
            .header { border-bottom: 2px solid #0B1F33; padding-bottom: 16px; margin-bottom: 24px; }
            h1, h2, p { margin: 0 0 8px; }
            .muted { color: #5D7485; }
            .box { margin-top: 18px; padding: 16px; background: #F4FBFA; border: 1px solid #D8E8E5; border-radius: 16px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Mendoza Manager</h1>
            <p class="muted">Evento de calendario</p>
          </div>

          <h2>${event.title}</h2>
          <p><b>Tipo:</b> ${event.event_type ?? "Evento"}</p>
          <p><b>Cliente:</b> ${clientName(event.client_id)}</p>
          <p><b>Orden:</b> ${orderName(event.work_order_id)}</p>
          <p><b>Inicio:</b> ${dateText(event.start_at)} ${timeText(event.start_at)}</p>
          <p><b>Fin:</b> ${dateText(event.end_at)} ${timeText(event.end_at)}</p>

          <div class="box">
            <b>Descripción</b>
            <p>${event.description ?? "Sin descripción."}</p>
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
              Calendario
            </h1>
            <p style={{ margin: 0, color: "#5D7485", fontWeight: 700 }}>
              Agenda de reuniones, entregas, instalaciones y seguimientos.
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

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
          <TotalCard label="Eventos totales" value={String(events.length)} />
          <TotalCard label="Eventos de hoy" value={String(todayEvents)} />
          <TotalCard label="Próximos eventos" value={String(upcomingEvents)} />
        </div>

        <form onSubmit={saveEvent} style={cardStyle}>
          <h2 style={{ marginTop: 0, fontSize: 24, fontWeight: 900 }}>
            {editingId ? "Editar evento" : "Nuevo evento"}
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "1.2fr .8fr 1fr 1fr", gap: 16 }}>
            <Field label="Título">
              <input value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} placeholder="Reunión, entrega, instalación..." />
            </Field>

            <Field label="Tipo">
              <select value={eventType} onChange={(e) => setEventType(e.target.value)} style={inputStyle}>
                <option value="reunion">Reunión</option>
                <option value="llamada">Llamada</option>
                <option value="instalacion">Instalación</option>
                <option value="entrega">Entrega</option>
                <option value="orden_trabajo">Orden de trabajo</option>
                <option value="recordatorio">Recordatorio</option>
                <option value="otro">Otro</option>
              </select>
            </Field>

            <Field label="Cliente">
              <select value={clientId} onChange={(e) => setClientId(e.target.value)} style={inputStyle}>
                <option value="">Sin cliente</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>{client.full_name}</option>
                ))}
              </select>
            </Field>

            <Field label="Orden relacionada">
              <select value={workOrderId} onChange={(e) => onSelectOrder(e.target.value)} style={inputStyle}>
                <option value="">Sin orden</option>
                {filteredOrders.map((order) => (
                  <option key={order.id} value={order.id}>{order.title}</option>
                ))}
              </select>
            </Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Inicio">
              <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} style={inputStyle} />
            </Field>

            <Field label="Fin">
              <input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} style={inputStyle} />
            </Field>
          </div>

          <Field label="Descripción">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} style={{ ...inputStyle, minHeight: 90 }} />
          </Field>

          <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
            <button disabled={loading} style={darkButtonStyle}>
              {editingId ? "Actualizar evento" : "Guardar evento"}
            </button>

            <button type="button" onClick={clearForm} style={softButtonStyle}>
              Limpiar
            </button>
          </div>
        </form>

        <section style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "center", marginBottom: 18 }}>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>
              Agenda
            </h2>

            <div style={{ display: "flex", gap: 10 }}>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." style={{ ...inputStyle, width: 300, marginTop: 0 }} />

              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ ...inputStyle, width: 170, marginTop: 0 }}>
                <option value="todos">Todos</option>
                <option value="reunion">Reunión</option>
                <option value="llamada">Llamada</option>
                <option value="instalacion">Instalación</option>
                <option value="entrega">Entrega</option>
                <option value="orden_trabajo">Orden</option>
                <option value="recordatorio">Recordatorio</option>
                <option value="otro">Otro</option>
              </select>

              <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} style={{ ...inputStyle, width: 170, marginTop: 0 }}>
                <option value="proximos">Próximos</option>
                <option value="hoy">Hoy</option>
                <option value="pasados">Pasados</option>
                <option value="todos">Todos</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gap: 16 }}>
            {filteredEvents.map((event) => (
              <article key={event.id} style={{
                background: "#F8FFFD",
                border: "1px solid #D8E8E5",
                borderRadius: 24,
                padding: 18,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>{event.title}</h3>
                    <p style={{ margin: "6px 0", color: "#34495E", fontWeight: 800 }}>
                      {clientName(event.client_id)}
                    </p>
                    <p style={{ margin: 0, color: "#5D7485", fontWeight: 700 }}>
                      {dateText(event.start_at)} · {timeText(event.start_at)} a {timeText(event.end_at)}
                    </p>
                    <p style={{ margin: "8px 0 0", color: "#5D7485", fontWeight: 700 }}>
                      Orden: {orderName(event.work_order_id)}
                    </p>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <span style={{
                      display: "inline-block",
                      background: isToday(event.start_at) ? "#DDF7E8" : "#EAF8F5",
                      color: isToday(event.start_at) ? "#157347" : "#0F766E",
                      borderRadius: 999,
                      padding: "7px 10px",
                      fontSize: 12,
                      fontWeight: 900,
                      marginBottom: 8,
                    }}>
                      {event.event_type || "evento"}
                    </span>
                    <p style={{ margin: 0, color: "#34495E", fontWeight: 900 }}>
                      {isToday(event.start_at) ? "Hoy" : isUpcoming(event.start_at) ? "Próximo" : "Pasado"}
                    </p>
                  </div>
                </div>

                {event.description && (
                  <p style={{ margin: "12px 0 0", color: "#34495E" }}>
                    {event.description}
                  </p>
                )}

                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
                  <button type="button" onClick={() => startEdit(event)} style={softButtonStyle}>
                    Editar
                  </button>

                  <button type="button" onClick={() => printEvent(event)} style={softButtonStyle}>
                    Imprimir
                  </button>

                  <button type="button" onClick={() => deleteEvent(event)} style={dangerButtonStyle}>
                    Eliminar
                  </button>
                </div>
              </article>
            ))}

            {filteredEvents.length === 0 && (
              <div style={{ padding: 40, textAlign: "center", color: "#5D7485", fontWeight: 800 }}>
                No hay eventos para mostrar.
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
      borderRadius: 24,
      padding: 18,
    }}>
      <p style={{ margin: 0, color: "#5D7485", fontWeight: 800 }}>{label}</p>
      <strong style={{ display: "block", marginTop: 6, color: "#0F766E", fontSize: 28 }}>{value}</strong>
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
