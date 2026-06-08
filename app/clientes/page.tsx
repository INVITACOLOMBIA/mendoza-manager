"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
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
  notes: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type ClientForm = {
  full_name: string;
  phone: string;
  email: string;
  document_number: string;
  address: string;
  city: string;
  notes: string;
  status: string;
};

const emptyForm: ClientForm = {
  full_name: "",
  phone: "",
  email: "",
  document_number: "",
  address: "",
  city: "",
  notes: "",
  status: "activo",
};

function clean(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
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

export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [form, setForm] = useState<ClientForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadClients() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("No se pudieron cargar los clientes: " + error.message);
      setClients([]);
    } else {
      setClients((data ?? []) as Client[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadClients();
  }, []);

  const filteredClients = useMemo(() => {
    const term = search.toLowerCase().trim();

    if (!term) return clients;

    return clients.filter((client) => {
      return [
        client.full_name,
        client.phone,
        client.email,
        client.document_number,
        client.city,
        client.status,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [clients, search]);

  function setField<K extends keyof ClientForm>(key: K, value: ClientForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function startEdit(client: Client) {
    setEditingId(client.id);
    setForm({
      full_name: client.full_name ?? "",
      phone: client.phone ?? "",
      email: client.email ?? "",
      document_number: client.document_number ?? "",
      address: client.address ?? "",
      city: client.city ?? "",
      notes: client.notes ?? "",
      status: client.status ?? "activo",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setMessage("");
  }

  async function saveClient(event: FormEvent) {
    event.preventDefault();

    if (!form.full_name.trim()) {
      setMessage("El nombre del cliente es obligatorio.");
      return;
    }

    setLoading(true);
    setMessage("");

    const payload = {
      full_name: form.full_name.trim(),
      phone: clean(form.phone),
      email: clean(form.email),
      document_number: clean(form.document_number),
      address: clean(form.address),
      city: clean(form.city),
      notes: clean(form.notes),
      status: clean(form.status) ?? "activo",
      updated_at: new Date().toISOString(),
    };

    const result = editingId
      ? await supabase.from("clients").update(payload).eq("id", editingId)
      : await supabase.from("clients").insert({
          ...payload,
          created_at: new Date().toISOString(),
        });

    if (result.error) {
      setMessage("No se pudo guardar el cliente: " + result.error.message);
      setLoading(false);
      return;
    }

    setMessage(editingId ? "Cliente actualizado correctamente." : "Cliente creado correctamente.");
    setForm(emptyForm);
    setEditingId(null);
    await loadClients();
    setLoading(false);
  }

  async function deleteClient(id: string, name: string) {
    const ok = confirm("¿Eliminar el cliente " + name + "? Esta acción no se puede deshacer.");

    if (!ok) return;

    setLoading(true);
    setMessage("");

    const { error } = await supabase.from("clients").delete().eq("id", id);

    if (error) {
      setMessage("No se pudo eliminar el cliente: " + error.message);
    } else {
      setMessage("Cliente eliminado correctamente.");
      await loadClients();
    }

    setLoading(false);
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
              Clientes
            </h1>
            <p style={{ margin: 0, color: "#5D7485", fontWeight: 700 }}>
              Crear, editar, buscar y eliminar clientes.
            </p>
          </div>

          <button
            onClick={loadClients}
            style={{
              border: "1px solid #BFE8E2",
              background: "#EAF8F5",
              borderRadius: 16,
              padding: "12px 18px",
              fontWeight: 900,
              color: "#0B1F33",
            }}
          >
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

        <form
          onSubmit={saveClient}
          style={{
            background: "#FFFFFF",
            border: "1px solid #D8E8E5",
            borderRadius: 28,
            padding: 24,
            marginBottom: 24,
          }}
        >
          <h2 style={{ marginTop: 0, fontSize: 24, fontWeight: 900 }}>
            {editingId ? "Editar cliente" : "Nuevo cliente"}
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            <label style={{ fontWeight: 800 }}>
              Nombre completo *
              <input
                value={form.full_name}
                onChange={(e) => setField("full_name", e.target.value)}
                placeholder="Nombre del cliente"
                style={inputStyle}
              />
            </label>

            <label style={{ fontWeight: 800 }}>
              Teléfono
              <input
                value={form.phone}
                onChange={(e) => setField("phone", e.target.value)}
                placeholder="Teléfono"
                style={inputStyle}
              />
            </label>

            <label style={{ fontWeight: 800 }}>
              Correo
              <input
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                placeholder="correo@ejemplo.com"
                style={inputStyle}
              />
            </label>

            <label style={{ fontWeight: 800 }}>
              Documento
              <input
                value={form.document_number}
                onChange={(e) => setField("document_number", e.target.value)}
                placeholder="Número de documento"
                style={inputStyle}
              />
            </label>

            <label style={{ fontWeight: 800 }}>
              Ciudad
              <input
                value={form.city}
                onChange={(e) => setField("city", e.target.value)}
                placeholder="Ciudad"
                style={inputStyle}
              />
            </label>

            <label style={{ fontWeight: 800 }}>
              Estado
              <select
                value={form.status}
                onChange={(e) => setField("status", e.target.value)}
                style={inputStyle}
              >
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
                <option value="pendiente">Pendiente</option>
              </select>
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
            <label style={{ fontWeight: 800 }}>
              Dirección
              <input
                value={form.address}
                onChange={(e) => setField("address", e.target.value)}
                placeholder="Dirección"
                style={inputStyle}
              />
            </label>

            <label style={{ fontWeight: 800 }}>
              Notas
              <input
                value={form.notes}
                onChange={(e) => setField("notes", e.target.value)}
                placeholder="Observaciones"
                style={inputStyle}
              />
            </label>
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
            <button
              disabled={loading}
              style={{
                border: "1px solid #0B1F33",
                background: "#0B1F33",
                color: "#FFFFFF",
                borderRadius: 16,
                padding: "12px 18px",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              {editingId ? "Actualizar cliente" : "Crear cliente"}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={cancelEdit}
                style={{
                  border: "1px solid #D8E8E5",
                  background: "#FFFFFF",
                  color: "#0B1F33",
                  borderRadius: 16,
                  padding: "12px 18px",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
            )}
          </div>
        </form>

        <div style={{
          background: "#FFFFFF",
          border: "1px solid #D8E8E5",
          borderRadius: 28,
          padding: 20,
          marginBottom: 24,
        }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, teléfono, correo, documento, ciudad o estado..."
            style={inputStyle}
          />
        </div>

        <div style={{
          background: "#FFFFFF",
          border: "1px solid #D8E8E5",
          borderRadius: 28,
          overflow: "hidden",
        }}>
          <div style={{ padding: 20, borderBottom: "1px solid #D8E8E5", fontWeight: 900 }}>
            {filteredClients.length} cliente(s)
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: 1000, borderCollapse: "collapse" }}>
              <thead style={{ background: "#EAF8F5" }}>
                <tr>
                  <th style={thStyle}>Cliente</th>
                  <th style={thStyle}>Teléfono</th>
                  <th style={thStyle}>Correo</th>
                  <th style={thStyle}>Documento</th>
                  <th style={thStyle}>Ciudad</th>
                  <th style={thStyle}>Estado</th>
                  <th style={thStyle}>Creado</th>
                  <th style={thStyle}>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {filteredClients.map((client) => (
                  <tr key={client.id} style={{ borderTop: "1px solid #D8E8E5" }}>
                    <td style={tdStyle}>
                      <strong>{client.full_name}</strong>
                      {client.notes && (
                        <p style={{ margin: "4px 0 0", color: "#5D7485" }}>{client.notes}</p>
                      )}
                    </td>
                    <td style={tdStyle}>{client.phone || "—"}</td>
                    <td style={tdStyle}>{client.email || "—"}</td>
                    <td style={tdStyle}>{client.document_number || "—"}</td>
                    <td style={tdStyle}>{client.city || "—"}</td>
                    <td style={tdStyle}>
                      <span style={{
                        background: "#DDF4F2",
                        color: "#0F766E",
                        borderRadius: 999,
                        padding: "6px 10px",
                        fontWeight: 900,
                        fontSize: 12,
                      }}>
                        {client.status || "activo"}
                      </span>
                    </td>
                    <td style={tdStyle}>{dateText(client.created_at)}</td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={() => startEdit(client)}
                          style={smallButtonStyle}
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => deleteClient(client.id, client.full_name)}
                          style={dangerButtonStyle}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredClients.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ padding: 40, textAlign: "center", color: "#5D7485", fontWeight: 800 }}>
                      No hay clientes para mostrar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
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

const thStyle: React.CSSProperties = {
  padding: 14,
  textAlign: "left",
  color: "#0B1F33",
  fontSize: 13,
  fontWeight: 900,
};

const tdStyle: React.CSSProperties = {
  padding: 14,
  color: "#34495E",
  fontSize: 14,
  verticalAlign: "top",
};

const smallButtonStyle: React.CSSProperties = {
  border: "1px solid #BFE8E2",
  background: "#EAF8F5",
  color: "#0B1F33",
  borderRadius: 12,
  padding: "8px 10px",
  fontWeight: 900,
  cursor: "pointer",
};

const dangerButtonStyle: React.CSSProperties = {
  border: "1px solid #F4C7C7",
  background: "#FDE2E5",
  color: "#B42318",
  borderRadius: 12,
  padding: "8px 10px",
  fontWeight: 900,
  cursor: "pointer",
};
