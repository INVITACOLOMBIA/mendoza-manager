"use client";

import { FormEvent, useEffect, useMemo, useState, type CSSProperties } from "react";
import { Sidebar } from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";

type Client = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  document_number: string | null;
};

type Sale = {
  id: string;
  sale_number: string;
  client_id: string | null;
  total: number | null;
  paid_amount: number | null;
  balance: number | null;
  payment_status: string | null;
  status: string | null;
  document_type: string | null;
  issued_at: string | null;
  created_at: string | null;
  collection_account_id: string | null;
  last_collection_account_id: string | null;
};

type CollectionAccount = {
  id: string;
  account_number: string;
  client_id: string | null;
  period_type: string;
  period_start: string | null;
  period_end: string | null;
  due_date: string | null;
  status: string;
  subtotal: number | null;
  discount: number | null;
  total: number | null;
  balance: number | null;
  notes: string | null;
  sent_at: string | null;
  paid_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type CollectionAccountItem = {
  id: string;
  collection_account_id: string;
  sale_id: string | null;
  description: string;
  service_date: string | null;
  quantity: number | null;
  unit_price: number | null;
  total: number | null;
  balance: number | null;
  created_at: string | null;
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

function inputDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function firstDayOfMonth() {
  const date = new Date();
  return inputDate(new Date(date.getFullYear(), date.getMonth(), 1));
}

function lastDayOfMonth() {
  const date = new Date();
  return inputDate(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

function dueDateDefault() {
  const date = new Date();
  date.setDate(date.getDate() + 5);
  return inputDate(date);
}

function cleanPhone(value: string | null) {
  return String(value ?? "").replace(/\D/g, "");
}

function nextAccountNumber(accounts: CollectionAccount[]) {
  const last = accounts
    .map((account) => Number(String(account.account_number ?? "").replace(/\D/g, "")))
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => b - a)[0] ?? 24;

  return "CC-" + String(last + 1).padStart(4, "0");
}

export default function CuentasCobroPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [accounts, setAccounts] = useState<CollectionAccount[]>([]);
  const [items, setItems] = useState<CollectionAccountItem[]>([]);

  const [clientId, setClientId] = useState("");
  const [periodType, setPeriodType] = useState("mensual");
  const [periodStart, setPeriodStart] = useState(firstDayOfMonth());
  const [periodEnd, setPeriodEnd] = useState(lastDayOfMonth());
  const [dueDate, setDueDate] = useState(dueDateDefault());
  const [discount, setDiscount] = useState("0");
  const [notes, setNotes] = useState("Cuenta de cobro generada por servicios pendientes de pago.");
  const [selectedSaleIds, setSelectedSaleIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadData() {
    setLoading(true);
    setMessage("");

    const [clientsRes, salesRes, accountsRes, itemsRes] = await Promise.all([
      supabase.from("clients").select("id, full_name, phone, email, document_number").order("full_name"),
      supabase.from("sales").select("*").order("created_at", { ascending: false }),
      supabase.from("collection_accounts").select("*").order("created_at", { ascending: false }),
      supabase.from("collection_account_items").select("*").order("created_at", { ascending: true }),
    ]);

    if (!clientsRes.error) setClients((clientsRes.data ?? []) as Client[]);
    if (!salesRes.error) setSales((salesRes.data ?? []) as Sale[]);
    if (!accountsRes.error) setAccounts((accountsRes.data ?? []) as CollectionAccount[]);
    if (!itemsRes.error) setItems((itemsRes.data ?? []) as CollectionAccountItem[]);

    const errors = [clientsRes.error, salesRes.error, accountsRes.error, itemsRes.error].filter(Boolean);

    if (errors.length) {
      setMessage("Algunos datos no se pudieron cargar. Revisa permisos o columnas.");
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const pendingSales = useMemo(() => {
    return sales.filter((sale) => {
      const hasBalance = Number(sale.balance ?? 0) > 0;
      const sameClient = clientId ? sale.client_id === clientId : true;
      const notCancelled = !["anulada", "cancelada"].includes(String(sale.status ?? "").toLowerCase());
      return hasBalance && sameClient && notCancelled;
    });
  }, [sales, clientId]);

  const selectedSales = useMemo(() => {
    return sales.filter((sale) => selectedSaleIds.includes(sale.id));
  }, [sales, selectedSaleIds]);

  const subtotal = useMemo(() => {
    return selectedSales.reduce((sum, sale) => sum + Number(sale.balance ?? 0), 0);
  }, [selectedSales]);

  const discountValue = Number(discount || 0);
  const total = Math.max(subtotal - discountValue, 0);

  const filteredAccounts = useMemo(() => {
    const term = search.toLowerCase().trim();

    return accounts.filter((account) => {
      const client = clients.find((item) => item.id === account.client_id);

      const matchesSearch =
        !term ||
        [
          account.account_number,
          account.status,
          account.notes,
          client?.full_name,
          client?.phone,
          client?.email,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));

      return matchesSearch;
    });
  }, [accounts, clients, search]);

  function clientName(id: string | null) {
    return clients.find((client) => client.id === id)?.full_name ?? "Sin cliente";
  }

  function clientData(id: string | null) {
    return clients.find((client) => client.id === id) ?? null;
  }

  function accountItems(accountId: string) {
    return items.filter((item) => item.collection_account_id === accountId);
  }

  function toggleSale(id: string) {
    setSelectedSaleIds((prev) =>
      prev.includes(id) ? prev.filter((saleId) => saleId !== id) : [...prev, id]
    );
  }

  function selectAllSales() {
    setSelectedSaleIds(pendingSales.map((sale) => sale.id));
  }

  function clearForm() {
    setClientId("");
    setPeriodType("mensual");
    setPeriodStart(firstDayOfMonth());
    setPeriodEnd(lastDayOfMonth());
    setDueDate(dueDateDefault());
    setDiscount("0");
    setNotes("Cuenta de cobro generada por servicios pendientes de pago.");
    setSelectedSaleIds([]);
  }

  async function createAccount(event: FormEvent) {
    event.preventDefault();

    if (!clientId) {
      setMessage("Selecciona un cliente.");
      return;
    }

    if (!selectedSales.length) {
      setMessage("Selecciona al menos una venta pendiente.");
      return;
    }

    setLoading(true);
    setMessage("");

    const number = nextAccountNumber(accounts);

    const accountPayload = {
      account_number: number,
      client_id: clientId,
      period_type: periodType,
      period_start: periodStart || null,
      period_end: periodEnd || null,
      due_date: dueDate || null,
      status: "generada",
      subtotal,
      discount: discountValue,
      total,
      balance: total,
      notes: notes.trim() || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const accountRes = await supabase
      .from("collection_accounts")
      .insert(accountPayload)
      .select("id")
      .single();

    if (accountRes.error) {
      setMessage("No se pudo crear la cuenta de cobro: " + accountRes.error.message);
      setLoading(false);
      return;
    }

    const accountId = accountRes.data.id as string;

    const rows = selectedSales.map((sale) => ({
      collection_account_id: accountId,
      sale_id: sale.id,
      description: "Venta " + sale.sale_number,
      service_date: String(sale.issued_at || sale.created_at || new Date().toISOString()).slice(0, 10),
      quantity: 1,
      unit_price: Number(sale.balance ?? 0),
      total: Number(sale.balance ?? 0),
      balance: Number(sale.balance ?? 0),
      created_at: new Date().toISOString(),
    }));

    const itemsRes = await supabase.from("collection_account_items").insert(rows);

    if (itemsRes.error) {
      setMessage("La cuenta se creó, pero no se pudieron guardar los ítems: " + itemsRes.error.message);
      setLoading(false);
      return;
    }

    for (const sale of selectedSales) {
      await supabase
        .from("sales")
        .update({
          collection_account_id: accountId,
          last_collection_account_id: accountId,
          billing_status: "cuenta_cobro",
          updated_at: new Date().toISOString(),
        })
        .eq("id", sale.id);
    }

    setMessage("Cuenta de cobro creada correctamente: " + number);
    clearForm();
    await loadData();
    setLoading(false);
  }

  async function markSent(account: CollectionAccount) {
    const { error } = await supabase
      .from("collection_accounts")
      .update({
        status: "enviada",
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", account.id);

    if (error) {
      setMessage("No se pudo marcar enviada: " + error.message);
    } else {
      setMessage("Cuenta marcada como enviada.");
      await loadData();
    }
  }

  async function markPaid(account: CollectionAccount) {
    const { error } = await supabase
      .from("collection_accounts")
      .update({
        status: "pagada",
        balance: 0,
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", account.id);

    if (error) {
      setMessage("No se pudo marcar pagada: " + error.message);
    } else {
      setMessage("Cuenta marcada como pagada.");
      await loadData();
    }
  }

  async function deleteAccount(account: CollectionAccount) {
    const ok = confirm(
      "¿Eliminar la cuenta de cobro " +
        account.account_number +
        "? Usa esto solo si fue creada por error."
    );

    if (!ok) return;

    setLoading(true);
    setMessage("");

    await supabase.from("payments").update({ collection_account_id: null }).eq("collection_account_id", account.id);
    await supabase
      .from("sales")
      .update({
        collection_account_id: null,
        billing_status: null,
        updated_at: new Date().toISOString(),
      })
      .eq("collection_account_id", account.id);

    await supabase
      .from("sales")
      .update({
        last_collection_account_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("last_collection_account_id", account.id);

    await supabase.from("collection_account_items").delete().eq("collection_account_id", account.id);

    const { error } = await supabase.from("collection_accounts").delete().eq("id", account.id);

    if (error) {
      setMessage("No se pudo eliminar la cuenta: " + error.message);
    } else {
      setMessage("Cuenta de cobro eliminada correctamente.");
      await loadData();
    }

    setLoading(false);
  }

  function summaryText(account: CollectionAccount) {
    const client = clientData(account.client_id);
    const lines = accountItems(account.id)
      .map((item) => "• " + item.description + ": " + money(item.total))
      .join("\\n");

    return [
      "Hola " + (client?.full_name ?? "cliente") + ", te comparto la cuenta de cobro " + account.account_number + ".",
      "",
      lines || "Servicios pendientes de pago.",
      "",
      "Total: " + money(account.total),
      "Saldo: " + money(account.balance),
      "Vence: " + dateText(account.due_date),
      "",
      "Mendoza Manager",
    ].join("\\n");
  }

  function whatsappLink(account: CollectionAccount) {
    const client = clientData(account.client_id);
    const phone = cleanPhone(client?.phone ?? null);
    const target = phone ? "57" + phone.slice(-10) : "";
    return "https://wa.me/" + target + "?text=" + encodeURIComponent(summaryText(account));
  }

  function printAccount(account: CollectionAccount) {
    const client = clientData(account.client_id);
    const rows = accountItems(account.id);

    const html = `
      <html>
        <head>
          <title>${account.account_number}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; color: #0B1F33; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0B1F33; padding-bottom: 16px; margin-bottom: 24px; }
            h1, h2, p { margin: 0 0 8px; }
            .muted { color: #5D7485; }
            table { width: 100%; border-collapse: collapse; margin-top: 24px; }
            th, td { padding: 12px; border-bottom: 1px solid #D8E8E5; text-align: left; }
            th { background: #EAF8F5; }
            .total { margin-top: 24px; text-align: right; font-size: 20px; }
            .box { margin-top: 24px; padding: 16px; background: #F4FBFA; border: 1px solid #D8E8E5; border-radius: 16px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>Mendoza Manager</h1>
              <p class="muted">Cuenta de cobro</p>
            </div>
            <div>
              <h2>${account.account_number}</h2>
              <p class="muted">Vence: ${dateText(account.due_date)}</p>
            </div>
          </div>

          <p><b>Cliente:</b> ${client?.full_name ?? "Sin cliente"}</p>
          <p><b>Documento:</b> ${client?.document_number ?? "—"}</p>
          <p><b>Periodo:</b> ${dateText(account.period_start)} al ${dateText(account.period_end)}</p>

          <table>
            <thead>
              <tr>
                <th>Servicio / venta</th>
                <th>Fecha</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map((item) => `
                <tr>
                  <td>${item.description}</td>
                  <td>${dateText(item.service_date)}</td>
                  <td>${money(item.total)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>

          <div class="total">
            <p>Subtotal: <b>${money(account.subtotal)}</b></p>
            <p>Descuento: <b>${money(account.discount)}</b></p>
            <p>Total: <b>${money(account.total)}</b></p>
            <p>Saldo: <b>${money(account.balance)}</b></p>
          </div>

          <div class="box">
            <b>Notas</b>
            <p>${account.notes ?? "Sin observaciones."}</p>
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
              Cuentas de cobro
            </h1>
            <p style={{ margin: 0, color: "#5D7485", fontWeight: 700 }}>
              Generar cortes de cobro, imprimir, enviar y eliminar cuentas creadas por error.
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

        <form onSubmit={createAccount} style={cardStyle}>
          <h2 style={{ marginTop: 0, fontSize: 24, fontWeight: 900 }}>
            Nueva cuenta de cobro
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "1.2fr .8fr .8fr .8fr .8fr", gap: 16 }}>
            <label style={labelStyle}>
              Cliente
              <select value={clientId} onChange={(e) => { setClientId(e.target.value); setSelectedSaleIds([]); }} style={inputStyle}>
                <option value="">Seleccionar cliente</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>{client.full_name}</option>
                ))}
              </select>
            </label>

            <label style={labelStyle}>
              Tipo corte
              <select value={periodType} onChange={(e) => setPeriodType(e.target.value)} style={inputStyle}>
                <option value="mensual">Mensual</option>
                <option value="quincenal">Quincenal</option>
                <option value="personalizado">Personalizado</option>
              </select>
            </label>

            <label style={labelStyle}>
              Desde
              <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} style={inputStyle} />
            </label>

            <label style={labelStyle}>
              Hasta
              <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} style={inputStyle} />
            </label>

            <label style={labelStyle}>
              Vence
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={inputStyle} />
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: ".7fr 2fr", gap: 16, marginTop: 16 }}>
            <label style={labelStyle}>
              Descuento
              <input value={discount} onChange={(e) => setDiscount(e.target.value)} style={inputStyle} />
            </label>

            <label style={labelStyle}>
              Notas
              <input value={notes} onChange={(e) => setNotes(e.target.value)} style={inputStyle} />
            </label>
          </div>

          <div style={{ marginTop: 22, padding: 18, background: "#F8FFFD", border: "1px solid #D8E8E5", borderRadius: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 14 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>
                  Ventas pendientes
                </h3>
                <p style={{ margin: "4px 0 0", color: "#5D7485", fontWeight: 700 }}>
                  Selecciona las ventas que incluirás en esta cuenta.
                </p>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={selectAllSales} style={softButtonStyle}>
                  Seleccionar todo
                </button>
                <button type="button" onClick={() => setSelectedSaleIds([])} style={softButtonStyle}>
                  Limpiar
                </button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {pendingSales.map((sale) => {
                const active = selectedSaleIds.includes(sale.id);

                return (
                  <button
                    key={sale.id}
                    type="button"
                    onClick={() => toggleSale(sale.id)}
                    style={{
                      textAlign: "left",
                      background: active ? "#DDF4F2" : "#FFFFFF",
                      border: active ? "2px solid #0F766E" : "1px solid #D8E8E5",
                      borderRadius: 20,
                      padding: 16,
                      color: "#0B1F33",
                      cursor: "pointer",
                    }}
                  >
                    <p style={{ margin: 0, color: "#5D7485", fontWeight: 800 }}>{sale.sale_number}</p>
                    <h4 style={{ margin: "8px 0", fontSize: 17, fontWeight: 900 }}>{dateText(sale.issued_at || sale.created_at)}</h4>
                    <strong style={{ color: "#0F766E", fontSize: 22 }}>{money(sale.balance)}</strong>
                  </button>
                );
              })}

              {pendingSales.length === 0 && (
                <div style={{ gridColumn: "1 / -1", padding: 30, textAlign: "center", color: "#5D7485", fontWeight: 800 }}>
                  No hay ventas pendientes para este cliente.
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginTop: 20 }}>
            <TotalCard label="Seleccionadas" value={String(selectedSales.length)} />
            <TotalCard label="Subtotal" value={money(subtotal)} />
            <TotalCard label="Descuento" value={money(discountValue)} />
            <TotalCard label="Total cuenta" value={money(total)} />
          </div>

          <div style={{ marginTop: 24 }}>
            <button disabled={loading} style={darkButtonStyle}>
              Generar cuenta de cobro
            </button>
          </div>
        </form>

        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", marginBottom: 18 }}>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>
              Historial de cuentas
            </h2>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar cuenta, cliente o estado..."
              style={{ ...inputStyle, maxWidth: 440 }}
            />
          </div>

          <div style={{ display: "grid", gap: 16 }}>
            {filteredAccounts.map((account) => (
              <article key={account.id} style={{
                background: "#F8FFFD",
                border: "1px solid #D8E8E5",
                borderRadius: 24,
                padding: 18,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>{account.account_number}</h3>
                    <p style={{ margin: "6px 0", color: "#34495E", fontWeight: 800 }}>{clientName(account.client_id)}</p>
                    <p style={{ margin: 0, color: "#5D7485", fontWeight: 700 }}>
                      Periodo {dateText(account.period_start)} al {dateText(account.period_end)} · Vence {dateText(account.due_date)}
                    </p>
                    <p style={{ margin: "8px 0 0", color: "#5D7485", fontWeight: 700 }}>
                      {accountItems(account.id).length} ítem(s) · Estado: {account.status}
                    </p>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <p style={{ margin: 0, color: "#5D7485", fontWeight: 800 }}>Total</p>
                    <strong style={{ display: "block", color: "#0F766E", fontSize: 28 }}>{money(account.total)}</strong>
                    <p style={{ margin: "6px 0 0", color: "#34495E", fontWeight: 800 }}>Saldo: {money(account.balance)}</p>
                  </div>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
                  <button type="button" onClick={() => printAccount(account)} style={softButtonStyle}>
                    Imprimir
                  </button>

                  <a href={whatsappLink(account)} target="_blank" style={{ ...softButtonStyle, textDecoration: "none" }}>
                    WhatsApp
                  </a>

                  <button type="button" onClick={() => markSent(account)} style={softButtonStyle}>
                    Marcar enviada
                  </button>

                  <button type="button" onClick={() => markPaid(account)} style={softButtonStyle}>
                    Marcar pagada
                  </button>

                  <button type="button" onClick={() => deleteAccount(account)} style={dangerButtonStyle}>
                    Eliminar
                  </button>
                </div>
              </article>
            ))}

            {filteredAccounts.length === 0 && (
              <div style={{ padding: 40, textAlign: "center", color: "#5D7485", fontWeight: 800 }}>
                No hay cuentas de cobro para mostrar.
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function TotalCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      background: "#FFFFFF",
      border: "1px solid #D8E8E5",
      borderRadius: 20,
      padding: 16,
    }}>
      <p style={{ margin: 0, color: "#5D7485", fontWeight: 800 }}>{label}</p>
      <strong style={{ display: "block", marginTop: 6, fontSize: 22, color: "#0F766E" }}>{value}</strong>
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

const labelStyle: CSSProperties = {
  fontWeight: 800,
  color: "#0B1F33",
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
