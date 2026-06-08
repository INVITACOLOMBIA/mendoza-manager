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

type Task = {
  id: string;
  work_order_id: string | null;
  prospect_id: string | null;
  client_id: string | null;
  title: string;
  description: string | null;
  task_type: string | null;
  status: string | null;
  due_at: string | null;
  priority: string | null;
  created_at: string | null;
  updated_at: string | null;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function localDateTime(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function tomorrowMorning() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(9, 0, 0, 0);
  return localDateTime(date);
}

function toDateTimeLocal(value: string | null) {
  if (!value) return tomorrowMorning();

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return tomorrowMorning();

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toIso(value: string) {
  if (!value) return null;
  return new Date(value).toISOString();
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
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function isOverdue(value: string | null, status: string | null) {
  if (!value) return false;
  if (status === "completada" || status === "cancelada") return false;

  const date = new Date(value);
  const now = new Date();

  return date < now;
}

function isToday(value: string | null) {
  if (!value) return false;

  const date = new Date(value);
  const now = new Date();

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

export default function TareasPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [clientId, setClientId] = useState("");
  const [workOrderId, setWorkOrderId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [taskType, setTaskType] = useState("seguimiento");
  const [status, setStatus] = useState("pendiente");
  const [priority, setPriority] = useState("media");
  const [dueAt, setDueAt] = useState(tomorrowMorning());

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("pendientes");
  const [priorityFilter, setPriorityFilter] = useState("todas");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadData() {
    setLoading(true);
    setMessage("");

    const [clientsRes, ordersRes, tasksRes] = await Promise.all([
      supabase.from("clients").select("id, full_name, phone, email").order("full_name"),
      supabase.from("work_orders").select("id, title, client_id, status, due_date").order("created_at", { ascending: false }),
      supabase.from("tasks").select("*").order("created_at", { ascending: false }),
    ]);

    if (!clientsRes.error) setClients((clientsRes.data ?? []) as Client[]);
    if (!ordersRes.error) setOrders((ordersRes.data ?? []) as WorkOrder[]);
    if (!tasksRes.error) setTasks((tasksRes.data ?? []) as Task[]);

    const errors = [clientsRes.error, ordersRes.error, tasksRes.error].filter(Boolean);

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

  const filteredTasks = useMemo(() => {
    const term = search.toLowerCase().trim();

    return tasks.filter((task) => {
      const client = clients.find((item) => item.id === task.client_id);
      const order = orders.find((item) => item.id === task.work_order_id);

      const matchesSearch =
        !term ||
        [
          task.title,
          task.description,
          task.task_type,
          task.status,
          task.priority,
          client?.full_name,
          client?.phone,
          client?.email,
          order?.title,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));

      const matchesStatus =
        statusFilter === "todas" ||
        (statusFilter === "pendientes" && task.status !== "completada" && task.status !== "cancelada") ||
        (statusFilter === "vencidas" && isOverdue(task.due_at, task.status)) ||
        (statusFilter === "hoy" && isToday(task.due_at)) ||
        task.status === statusFilter;

      const matchesPriority =
        priorityFilter === "todas" || task.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [tasks, clients, orders, search, statusFilter, priorityFilter]);

  const pendingCount = useMemo(() => {
    return tasks.filter((task) => task.status !== "completada" && task.status !== "cancelada").length;
  }, [tasks]);

  const todayCount = useMemo(() => {
    return tasks.filter((task) => isToday(task.due_at)).length;
  }, [tasks]);

  const overdueCount = useMemo(() => {
    return tasks.filter((task) => isOverdue(task.due_at, task.status)).length;
  }, [tasks]);

  function clientName(id: string | null) {
    return clients.find((client) => client.id === id)?.full_name ?? "Sin cliente";
  }

  function orderName(id: string | null) {
    return orders.find((order) => order.id === id)?.title ?? "Sin orden";
  }

  function clearForm() {
    setEditingId(null);
    setClientId("");
    setWorkOrderId("");
    setTitle("");
    setDescription("");
    setTaskType("seguimiento");
    setStatus("pendiente");
    setPriority("media");
    setDueAt(tomorrowMorning());
  }

  function onSelectOrder(id: string) {
    setWorkOrderId(id);

    const order = orders.find((item) => item.id === id);

    if (!order) return;

    setClientId(order.client_id ?? "");
    setTitle("Seguimiento - " + order.title);
    setTaskType("produccion");

    if (order.due_date) {
      setDueAt(order.due_date + "T09:00");
    }
  }

  function startEdit(task: Task) {
    setEditingId(task.id);
    setClientId(task.client_id ?? "");
    setWorkOrderId(task.work_order_id ?? "");
    setTitle(task.title);
    setDescription(task.description ?? "");
    setTaskType(task.task_type ?? "seguimiento");
    setStatus(task.status ?? "pendiente");
    setPriority(task.priority ?? "media");
    setDueAt(toDateTimeLocal(task.due_at));
    setMessage("Editando tarea.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveTask(event: FormEvent) {
    event.preventDefault();

    if (!title.trim()) {
      setMessage("El título de la tarea es obligatorio.");
      return;
    }

    setLoading(true);
    setMessage("");

    const payload = {
      work_order_id: workOrderId || null,
      prospect_id: null,
      client_id: clientId || null,
      title: title.trim(),
      description: description.trim() || null,
      task_type: taskType,
      status,
      due_at: dueAt ? toIso(dueAt) : null,
      priority,
      updated_at: new Date().toISOString(),
    };

    const result = editingId
      ? await supabase.from("tasks").update(payload).eq("id", editingId)
      : await supabase.from("tasks").insert({
          id: crypto.randomUUID(),
          ...payload,
          created_at: new Date().toISOString(),
        });

    if (result.error) {
      setMessage("No se pudo guardar la tarea: " + result.error.message);
      setLoading(false);
      return;
    }

    setMessage(editingId ? "Tarea actualizada correctamente." : "Tarea creada correctamente.");
    clearForm();
    await loadData();
    setLoading(false);
  }

  async function deleteTask(task: Task) {
    const ok = confirm("¿Eliminar la tarea: " + task.title + "?");
    if (!ok) return;

    setLoading(true);
    setMessage("");

    const { error } = await supabase.from("tasks").delete().eq("id", task.id);

    if (error) {
      setMessage("No se pudo eliminar: " + error.message);
    } else {
      setMessage("Tarea eliminada correctamente.");
      await loadData();
    }

    setLoading(false);
  }

  async function changeStatus(task: Task, nextStatus: string) {
    const { error } = await supabase
      .from("tasks")
      .update({
        status: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", task.id);

    if (error) {
      setMessage("No se pudo actualizar la tarea: " + error.message);
    } else {
      setMessage("Tarea actualizada.");
      await loadData();
    }
  }

  function printTask(task: Task) {
    const html = `
      <html>
        <head>
          <title>${task.title}</title>
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
            <p class="muted">Tarea</p>
          </div>

          <h2>${task.title}</h2>
          <p><b>Cliente:</b> ${clientName(task.client_id)}</p>
          <p><b>Orden:</b> ${orderName(task.work_order_id)}</p>
          <p><b>Tipo:</b> ${task.task_type ?? "—"}</p>
          <p><b>Estado:</b> ${task.status ?? "—"}</p>
          <p><b>Prioridad:</b> ${task.priority ?? "—"}</p>
          <p><b>Vence:</b> ${dateText(task.due_at)}</p>

          <div class="box">
            <b>Descripción</b>
            <p>${task.description ?? "Sin descripción."}</p>
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
              Tareas
            </h1>
            <p style={{ margin: 0, color: "#5D7485", fontWeight: 700 }}>
              Seguimiento interno, llamadas, producción, cobros y recordatorios.
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
          <TotalCard label="Tareas pendientes" value={String(pendingCount)} />
          <TotalCard label="Tareas para hoy" value={String(todayCount)} />
          <TotalCard label="Tareas vencidas" value={String(overdueCount)} danger={overdueCount > 0} />
        </div>

        <form onSubmit={saveTask} style={cardStyle}>
          <h2 style={{ marginTop: 0, fontSize: 24, fontWeight: 900 }}>
            {editingId ? "Editar tarea" : "Nueva tarea"}
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
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

            <Field label="Tipo de tarea">
              <select value={taskType} onChange={(e) => setTaskType(e.target.value)} style={inputStyle}>
                <option value="seguimiento">Seguimiento</option>
                <option value="llamada">Llamada</option>
                <option value="produccion">Producción</option>
                <option value="cobro">Cobro</option>
                <option value="administrativa">Administrativa</option>
                <option value="recordatorio">Recordatorio</option>
                <option value="otro">Otro</option>
              </select>
            </Field>
          </div>

          <Field label="Título">
            <input value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} placeholder="Ej: Llamar al cliente para confirmar diseño" />
          </Field>

          <Field label="Descripción">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} style={{ ...inputStyle, minHeight: 90 }} />
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            <Field label="Estado">
              <select value={status} onChange={(e) => setStatus(e.target.value)} style={inputStyle}>
                <option value="pendiente">Pendiente</option>
                <option value="en_proceso">En proceso</option>
                <option value="completada">Completada</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </Field>

            <Field label="Prioridad">
              <select value={priority} onChange={(e) => setPriority(e.target.value)} style={inputStyle}>
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </Field>

            <Field label="Vencimiento">
              <input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} style={inputStyle} />
            </Field>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
            <button disabled={loading} style={darkButtonStyle}>
              {editingId ? "Actualizar tarea" : "Guardar tarea"}
            </button>

            <button type="button" onClick={clearForm} style={softButtonStyle}>
              Limpiar
            </button>
          </div>
        </form>

        <section style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "center", marginBottom: 18 }}>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>
              Lista de tareas
            </h2>

            <div style={{ display: "flex", gap: 10 }}>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." style={{ ...inputStyle, width: 280, marginTop: 0 }} />

              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ ...inputStyle, width: 170, marginTop: 0 }}>
                <option value="pendientes">Pendientes</option>
                <option value="hoy">Hoy</option>
                <option value="vencidas">Vencidas</option>
                <option value="todas">Todas</option>
                <option value="pendiente">Pendiente</option>
                <option value="en_proceso">En proceso</option>
                <option value="completada">Completada</option>
                <option value="cancelada">Cancelada</option>
              </select>

              <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} style={{ ...inputStyle, width: 160, marginTop: 0 }}>
                <option value="todas">Todas</option>
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gap: 16 }}>
            {filteredTasks.map((task) => (
              <article key={task.id} style={{
                background: "#F8FFFD",
                border: isOverdue(task.due_at, task.status) ? "2px solid #F4C7C7" : "1px solid #D8E8E5",
                borderRadius: 24,
                padding: 18,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>{task.title}</h3>
                    <p style={{ margin: "6px 0", color: "#34495E", fontWeight: 800 }}>
                      {clientName(task.client_id)}
                    </p>
                    <p style={{ margin: 0, color: "#5D7485", fontWeight: 700 }}>
                      Orden: {orderName(task.work_order_id)} · Vence: {dateText(task.due_at)}
                    </p>

                    {task.description && (
                      <p style={{ margin: "10px 0 0", color: "#34495E" }}>
                        {task.description}
                      </p>
                    )}
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <span style={badgeStyle(task.priority || "media", "priority")}>
                      {task.priority || "media"}
                    </span>

                    <span style={{ ...badgeStyle(task.status || "pendiente", "status"), marginLeft: 8 }}>
                      {task.status || "pendiente"}
                    </span>

                    <p style={{ margin: "10px 0 0", color: isOverdue(task.due_at, task.status) ? "#B42318" : "#0F766E", fontWeight: 900 }}>
                      {isOverdue(task.due_at, task.status) ? "Vencida" : isToday(task.due_at) ? "Para hoy" : task.task_type || "tarea"}
                    </p>
                  </div>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
                  <button type="button" onClick={() => startEdit(task)} style={softButtonStyle}>
                    Editar
                  </button>

                  <button type="button" onClick={() => changeStatus(task, "en_proceso")} style={softButtonStyle}>
                    En proceso
                  </button>

                  <button type="button" onClick={() => changeStatus(task, "completada")} style={softButtonStyle}>
                    Completar
                  </button>

                  <button type="button" onClick={() => printTask(task)} style={softButtonStyle}>
                    Imprimir
                  </button>

                  <button type="button" onClick={() => deleteTask(task)} style={dangerButtonStyle}>
                    Eliminar
                  </button>
                </div>
              </article>
            ))}

            {filteredTasks.length === 0 && (
              <div style={{ padding: 40, textAlign: "center", color: "#5D7485", fontWeight: 800 }}>
                No hay tareas para mostrar.
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

function TotalCard({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) {
  return (
    <div style={{
      background: "#FFFFFF",
      border: danger ? "2px solid #F4C7C7" : "1px solid #D8E8E5",
      borderRadius: 24,
      padding: 18,
    }}>
      <p style={{ margin: 0, color: "#5D7485", fontWeight: 800 }}>{label}</p>
      <strong style={{ display: "block", marginTop: 6, color: danger ? "#B42318" : "#0F766E", fontSize: 28 }}>{value}</strong>
    </div>
  );
}

function badgeStyle(value: string, type: "priority" | "status"): CSSProperties {
  const color =
    value === "urgente" || value === "alta" || value === "cancelada"
      ? "#B42318"
      : value === "completada"
        ? "#157347"
        : "#0F766E";

  const background =
    value === "urgente" || value === "alta" || value === "cancelada"
      ? "#FDE2E5"
      : value === "completada"
        ? "#DDF7E8"
        : "#EAF8F5";

  return {
    display: "inline-block",
    background,
    color,
    borderRadius: 999,
    padding: "7px 10px",
    fontSize: 12,
    fontWeight: 900,
    textTransform: type === "priority" ? "uppercase" : "none",
  };
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
