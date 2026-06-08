"use client";

import { FormEvent, useEffect, useMemo, useState, type CSSProperties } from "react";
import { Sidebar } from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";

type BusinessSettings = {
  id: string;
  business_name: string | null;
  owner_full_name: string | null;
  owner_document_type: string | null;
  owner_document_number: string | null;
  whatsapp: string | null;
  phone: string | null;
  email: string | null;
  billing_email: string | null;
  support_email: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  quote_validity_days: number | null;
  collection_account_prefix: string | null;
  collection_account_next_number: number | null;
  default_due_days: number | null;
  notes: string | null;
  payment_qr_url?: string | null;
  payment_qr_title?: string | null;
  payment_qr_note?: string | null;
  updated_at: string | null;
};

type PaymentMethod = {
  id: string;
  method_name: string | null;
  account_label: string | null;
  account_value: string | null;
  active: boolean | null;
  sort_order: number | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  name: string | null;
  label: string | null;
  destination: string | null;
  display_order: number | null;
  is_active: boolean | null;
};

type SettingsForm = {
  business_name: string;
  owner_full_name: string;
  owner_document_type: string;
  owner_document_number: string;
  whatsapp: string;
  phone: string;
  email: string;
  billing_email: string;
  support_email: string;
  address: string;
  city: string;
  country: string;
  quote_validity_days: string;
  collection_account_prefix: string;
  collection_account_next_number: string;
  default_due_days: string;
  notes: string;
  payment_qr_url: string;
  payment_qr_title: string;
  payment_qr_note: string;
};

type PaymentForm = {
  name: string;
  label: string;
  destination: string;
  display_order: string;
  notes: string;
  active: boolean;
};

const emptySettings: SettingsForm = {
  business_name: "Mendoza Manager",
  owner_full_name: "",
  owner_document_type: "Cédula de ciudadanía",
  owner_document_number: "",
  whatsapp: "",
  phone: "",
  email: "",
  billing_email: "",
  support_email: "",
  address: "",
  city: "",
  country: "Colombia",
  quote_validity_days: "5",
  collection_account_prefix: "CC-",
  collection_account_next_number: "25",
  default_due_days: "5",
  notes: "",
  payment_qr_url: "",
  payment_qr_title: "QR de pago",
  payment_qr_note: "Escanea el código QR para realizar tu pago.",
};

const emptyPayment: PaymentForm = {
  name: "",
  label: "",
  destination: "",
  display_order: "10",
  notes: "",
  active: true,
};

function text(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function numberValue(value: string, fallback = 0) {
  const parsed = Number(String(value || "").replace(/[^0-9]/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function methodName(method: PaymentMethod) {
  return text(method.name ?? method.method_name, "Medio de pago");
}

function methodLabel(method: PaymentMethod) {
  return text(method.label ?? method.account_label, "Dato");
}

function methodDestination(method: PaymentMethod) {
  return text(method.destination ?? method.account_value, "");
}

function methodOrder(method: PaymentMethod) {
  return Number(method.display_order ?? method.sort_order ?? 10);
}

function methodActive(method: PaymentMethod) {
  return Boolean(method.is_active ?? method.active ?? true);
}

function methodNotes(method: PaymentMethod) {
  return text(method.notes, "");
}

export default function ConfiguracionPage() {
  const [settingId, setSettingId] = useState<string>("main");
  const [settings, setSettings] = useState<SettingsForm>(emptySettings);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [paymentForm, setPaymentForm] = useState<PaymentForm>(emptyPayment);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadData() {
    setLoading(true);
    setMessage("");

    const settingsRes = await supabase
      .from("business_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (!settingsRes.error && settingsRes.data) {
      const row = settingsRes.data as BusinessSettings;
      setSettingId(row.id || "main");

      setSettings({
        business_name: text(row.business_name, "Mendoza Manager"),
        owner_full_name: text(row.owner_full_name),
        owner_document_type: text(row.owner_document_type, "Cédula de ciudadanía"),
        owner_document_number: text(row.owner_document_number),
        whatsapp: text(row.whatsapp),
        phone: text(row.phone),
        email: text(row.email),
        billing_email: text(row.billing_email),
        support_email: text(row.support_email),
        address: text(row.address),
        city: text(row.city),
        country: text(row.country, "Colombia"),
        quote_validity_days: text(row.quote_validity_days, "5"),
        collection_account_prefix: text(row.collection_account_prefix, "CC-"),
        collection_account_next_number: text(row.collection_account_next_number, "25"),
        default_due_days: text(row.default_due_days, "5"),
        notes: text(row.notes),
        payment_qr_url: text(row.payment_qr_url),
        payment_qr_title: text(row.payment_qr_title, "QR de pago"),
        payment_qr_note: text(row.payment_qr_note, "Escanea el código QR para realizar tu pago."),
      });
    }

    const methodsRes = await supabase.from("payment_methods").select("*");

    if (!methodsRes.error) {
      const rows = ((methodsRes.data ?? []) as PaymentMethod[]).sort((a, b) => methodOrder(a) - methodOrder(b));
      setPaymentMethods(rows);
    }

    const errors = [settingsRes.error, methodsRes.error].filter(Boolean);

    if (errors.length) {
      setMessage("Algunos datos no se pudieron cargar.");
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const activeMethods = useMemo(() => {
    return paymentMethods.filter((method) => methodActive(method));
  }, [paymentMethods]);

  function setSetting<K extends keyof SettingsForm>(key: K, value: SettingsForm[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  async function saveSettings(event: FormEvent) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    const payload = {
      id: settingId || "main",
      business_name: settings.business_name.trim() || "Mendoza Manager",
      owner_full_name: settings.owner_full_name.trim() || null,
      owner_document_type: settings.owner_document_type.trim() || null,
      owner_document_number: settings.owner_document_number.trim() || null,
      whatsapp: settings.whatsapp.trim() || null,
      phone: settings.phone.trim() || null,
      email: settings.email.trim() || null,
      billing_email: settings.billing_email.trim() || null,
      support_email: settings.support_email.trim() || null,
      address: settings.address.trim() || null,
      city: settings.city.trim() || null,
      country: settings.country.trim() || "Colombia",
      quote_validity_days: numberValue(settings.quote_validity_days, 5),
      collection_account_prefix: settings.collection_account_prefix.trim() || "CC-",
      collection_account_next_number: numberValue(settings.collection_account_next_number, 25),
      default_due_days: numberValue(settings.default_due_days, 5),
      notes: settings.notes.trim() || null,
      payment_qr_url: settings.payment_qr_url.trim() || null,
      payment_qr_title: settings.payment_qr_title.trim() || "QR de pago",
      payment_qr_note: settings.payment_qr_note.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const result = await supabase
      .from("business_settings")
      .upsert(payload, { onConflict: "id" });

    if (result.error) {
      setMessage("No se pudo guardar la configuración: " + result.error.message);
      setLoading(false);
      return;
    }

    setMessage("Configuración guardada correctamente.");
    await loadData();
    setLoading(false);
  }

  function editPayment(method: PaymentMethod) {
    setEditingPaymentId(method.id);
    setPaymentForm({
      name: methodName(method),
      label: methodLabel(method),
      destination: methodDestination(method),
      display_order: String(methodOrder(method)),
      notes: methodNotes(method),
      active: methodActive(method),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelPaymentEdit() {
    setEditingPaymentId(null);
    setPaymentForm(emptyPayment);
  }

  async function savePayment(event: FormEvent) {
    event.preventDefault();

    if (!paymentForm.name.trim()) {
      setMessage("Escribe el nombre del medio de pago.");
      return;
    }

    if (!paymentForm.destination.trim()) {
      setMessage("Escribe el dato de pago.");
      return;
    }

    setLoading(true);
    setMessage("");

    const payload = {
      method_name: paymentForm.name.trim(),
      account_label: paymentForm.label.trim() || "Dato",
      account_value: paymentForm.destination.trim(),
      active: paymentForm.active,
      sort_order: numberValue(paymentForm.display_order, 10),
      notes: paymentForm.notes.trim() || null,
      name: paymentForm.name.trim(),
      label: paymentForm.label.trim() || "Dato",
      destination: paymentForm.destination.trim(),
      display_order: numberValue(paymentForm.display_order, 10),
      is_active: paymentForm.active,
      updated_at: new Date().toISOString(),
    };

    const result = editingPaymentId
      ? await supabase.from("payment_methods").update(payload).eq("id", editingPaymentId)
      : await supabase.from("payment_methods").insert({
          id: crypto.randomUUID(),
          ...payload,
          created_at: new Date().toISOString(),
        });

    if (result.error) {
      setMessage("No se pudo guardar el medio de pago: " + result.error.message);
      setLoading(false);
      return;
    }

    setMessage(editingPaymentId ? "Medio de pago actualizado." : "Medio de pago creado.");
    setEditingPaymentId(null);
    setPaymentForm(emptyPayment);
    await loadData();
    setLoading(false);
  }

  async function deletePayment(id: string) {
    const ok = confirm("¿Eliminar este medio de pago?");
    if (!ok) return;

    setLoading(true);
    setMessage("");

    const { error } = await supabase.from("payment_methods").delete().eq("id", id);

    if (error) {
      setMessage("No se pudo eliminar el medio de pago: " + error.message);
    } else {
      setMessage("Medio de pago eliminado.");
      await loadData();
    }

    setLoading(false);
  }

  async function togglePayment(method: PaymentMethod) {
    const next = !methodActive(method);

    const { error } = await supabase
      .from("payment_methods")
      .update({
        active: next,
        is_active: next,
        updated_at: new Date().toISOString(),
      })
      .eq("id", method.id);

    if (error) {
      setMessage("No se pudo cambiar el estado: " + error.message);
    } else {
      await loadData();
    }
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
              Configuración
            </h1>
            <p style={{ margin: 0, color: "#5D7485", fontWeight: 700 }}>
              Datos del negocio, medios de pago, QR y consecutivos.
            </p>
          </div>

          <button onClick={loadData} style={softButtonStyle}>
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

        <div style={{ display: "grid", gridTemplateColumns: "1.3fr .8fr", gap: 24 }}>
          <form onSubmit={saveSettings} style={cardStyle}>
            <h2 style={{ marginTop: 0, fontSize: 24, fontWeight: 900 }}>
              Datos del negocio
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
              <Field label="Nombre del negocio">
                <input value={settings.business_name} onChange={(e) => setSetting("business_name", e.target.value)} style={inputStyle} />
              </Field>

              <Field label="Nombre del propietario/prestador">
                <input value={settings.owner_full_name} onChange={(e) => setSetting("owner_full_name", e.target.value)} style={inputStyle} />
              </Field>

              <Field label="Tipo de documento">
                <input value={settings.owner_document_type} onChange={(e) => setSetting("owner_document_type", e.target.value)} style={inputStyle} />
              </Field>

              <Field label="Número de documento">
                <input value={settings.owner_document_number} onChange={(e) => setSetting("owner_document_number", e.target.value)} style={inputStyle} />
              </Field>

              <Field label="WhatsApp">
                <input value={settings.whatsapp} onChange={(e) => setSetting("whatsapp", e.target.value)} style={inputStyle} />
              </Field>

              <Field label="Teléfono">
                <input value={settings.phone} onChange={(e) => setSetting("phone", e.target.value)} style={inputStyle} />
              </Field>

              <Field label="Correo principal">
                <input value={settings.email} onChange={(e) => setSetting("email", e.target.value)} style={inputStyle} />
              </Field>

              <Field label="Correo de facturación">
                <input value={settings.billing_email} onChange={(e) => setSetting("billing_email", e.target.value)} style={inputStyle} />
              </Field>

              <Field label="Correo de soporte">
                <input value={settings.support_email} onChange={(e) => setSetting("support_email", e.target.value)} style={inputStyle} />
              </Field>

              <Field label="Ciudad">
                <input value={settings.city} onChange={(e) => setSetting("city", e.target.value)} style={inputStyle} />
              </Field>

              <Field label="Dirección">
                <input value={settings.address} onChange={(e) => setSetting("address", e.target.value)} style={inputStyle} />
              </Field>

              <Field label="País">
                <input value={settings.country} onChange={(e) => setSetting("country", e.target.value)} style={inputStyle} />
              </Field>
            </div>

            <h2 style={{ fontSize: 24, fontWeight: 900, marginTop: 32 }}>
              Reglas de documentos
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
              <Field label="Validez cotizaciones">
                <input value={settings.quote_validity_days} onChange={(e) => setSetting("quote_validity_days", e.target.value)} style={inputStyle} />
              </Field>

              <Field label="Prefijo cuenta cobro">
                <input value={settings.collection_account_prefix} onChange={(e) => setSetting("collection_account_prefix", e.target.value)} style={inputStyle} />
              </Field>

              <Field label="Próximo consecutivo">
                <input value={settings.collection_account_next_number} onChange={(e) => setSetting("collection_account_next_number", e.target.value)} style={inputStyle} />
              </Field>

              <Field label="Días para pago">
                <input value={settings.default_due_days} onChange={(e) => setSetting("default_due_days", e.target.value)} style={inputStyle} />
              </Field>
            </div>

            <h2 style={{ fontSize: 24, fontWeight: 900, marginTop: 32 }}>
              QR de pago
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 190px", gap: 16 }}>
              <div>
                <Field label="Título del QR">
                  <input value={settings.payment_qr_title} onChange={(e) => setSetting("payment_qr_title", e.target.value)} style={inputStyle} />
                </Field>

                <Field label="URL pública de imagen QR">
                  <input value={settings.payment_qr_url} onChange={(e) => setSetting("payment_qr_url", e.target.value)} style={inputStyle} placeholder="https://..." />
                </Field>

                <Field label="Nota del QR">
                  <input value={settings.payment_qr_note} onChange={(e) => setSetting("payment_qr_note", e.target.value)} style={inputStyle} />
                </Field>
              </div>

              <div style={{
                border: "1px solid #D8E8E5",
                borderRadius: 22,
                background: "#F8FFFD",
                padding: 14,
                textAlign: "center",
              }}>
                <p style={{ margin: "0 0 10px", fontWeight: 900 }}>{settings.payment_qr_title || "QR"}</p>
                {settings.payment_qr_url ? (
                  <img src={settings.payment_qr_url} alt="QR de pago" style={{ width: 140, height: 140, objectFit: "contain", borderRadius: 16, background: "#FFF" }} />
                ) : (
                  <div style={{
                    width: 140,
                    height: 140,
                    margin: "0 auto",
                    border: "1px dashed #BFE8E2",
                    borderRadius: 16,
                    display: "grid",
                    placeItems: "center",
                    color: "#5D7485",
                    fontWeight: 900,
                  }}>
                    Sin QR
                  </div>
                )}
              </div>
            </div>

            <Field label="Notas internas">
              <textarea value={settings.notes} onChange={(e) => setSetting("notes", e.target.value)} style={{ ...inputStyle, minHeight: 90 }} />
            </Field>

            <div style={{ marginTop: 24 }}>
              <button disabled={loading} style={darkButtonStyle}>
                Guardar configuración
              </button>
            </div>
          </form>

          <div>
            <section style={cardStyle}>
              <h2 style={{ marginTop: 0, fontSize: 24, fontWeight: 900 }}>
                {editingPaymentId ? "Editar medio de pago" : "Medios de pago"}
              </h2>

              <form onSubmit={savePayment}>
                <Field label="Nombre">
                  <input value={paymentForm.name} onChange={(e) => setPaymentForm({ ...paymentForm, name: e.target.value })} style={inputStyle} placeholder="NEQUI" />
                </Field>

                <Field label="Etiqueta">
                  <input value={paymentForm.label} onChange={(e) => setPaymentForm({ ...paymentForm, label: e.target.value })} style={inputStyle} placeholder="Número / cuenta / correo" />
                </Field>

                <Field label="Dato de pago">
                  <input value={paymentForm.destination} onChange={(e) => setPaymentForm({ ...paymentForm, destination: e.target.value })} style={inputStyle} placeholder="320..." />
                </Field>

                <Field label="Orden">
                  <input value={paymentForm.display_order} onChange={(e) => setPaymentForm({ ...paymentForm, display_order: e.target.value })} style={inputStyle} />
                </Field>

                <Field label="Notas">
                  <input value={paymentForm.notes} onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} style={inputStyle} />
                </Field>

                <label style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 14, fontWeight: 900 }}>
                  <input type="checkbox" checked={paymentForm.active} onChange={(e) => setPaymentForm({ ...paymentForm, active: e.target.checked })} />
                  Activo
                </label>

                <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
                  <button disabled={loading} style={darkButtonStyle}>
                    {editingPaymentId ? "Actualizar" : "Agregar"}
                  </button>

                  {editingPaymentId && (
                    <button type="button" onClick={cancelPaymentEdit} style={softButtonStyle}>
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            </section>

            <section style={cardStyle}>
              <h2 style={{ marginTop: 0, fontSize: 22, fontWeight: 900 }}>
                Medios activos: {activeMethods.length}
              </h2>

              <div style={{ display: "grid", gap: 12 }}>
                {paymentMethods.map((method) => (
                  <article key={method.id} style={{
                    background: "#F8FFFD",
                    border: "1px solid #D8E8E5",
                    borderRadius: 20,
                    padding: 14,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>{methodName(method)}</h3>
                        <p style={{ margin: "6px 0", color: "#5D7485", fontWeight: 800 }}>{methodLabel(method)}</p>
                        <strong style={{ color: "#0F766E" }}>{methodDestination(method) || "Sin dato"}</strong>
                        {methodNotes(method) && <p style={{ margin: "8px 0 0", color: "#5D7485" }}>{methodNotes(method)}</p>}
                      </div>

                      <span style={{
                        height: 30,
                        borderRadius: 999,
                        padding: "7px 10px",
                        fontSize: 12,
                        fontWeight: 900,
                        background: methodActive(method) ? "#DDF7E8" : "#FDE2E5",
                        color: methodActive(method) ? "#157347" : "#B42318",
                      }}>
                        {methodActive(method) ? "Activo" : "Inactivo"}
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      <button type="button" onClick={() => editPayment(method)} style={softButtonStyle}>
                        Editar
                      </button>

                      <button type="button" onClick={() => togglePayment(method)} style={softButtonStyle}>
                        {methodActive(method) ? "Inactivar" : "Activar"}
                      </button>

                      <button type="button" onClick={() => deletePayment(method.id)} style={dangerButtonStyle}>
                        Eliminar
                      </button>
                    </div>
                  </article>
                ))}

                {paymentMethods.length === 0 && (
                  <div style={{ padding: 24, color: "#5D7485", fontWeight: 800 }}>
                    No tienes medios de pago registrados.
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block", fontWeight: 800, color: "#0B1F33", marginTop: 14 }}>
      {label}
      {children}
    </label>
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
