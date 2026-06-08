"use client";

import { FormEvent, useEffect, useMemo, useState, type CSSProperties } from "react";
import { Sidebar } from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";

type Client = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
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
  created_at: string | null;
  issued_at: string | null;
};

type CollectionAccount = {
  id: string;
  account_number: string;
  client_id: string | null;
  total: number | null;
  balance: number | null;
  status: string | null;
  due_date: string | null;
  created_at: string | null;
};

type Payment = {
  id: string;
  client_id: string | null;
  sale_id: string | null;
  collection_account_id: string | null;
  amount: number;
  payment_method: string | null;
  payment_status: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string | null;
};

type Debt = {
  key: string;
  type: "sale" | "collection_account";
  id: string;
  label: string;
  client_id: string | null;
  total: number;
  paid: number;
  balance: number;
  date: string | null;
  status: string | null;
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

export default function PagosPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [accounts, setAccounts] = useState<CollectionAccount[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  const [clientId, setClientId] = useState("");
  const [selectedDebtKey, setSelectedDebtKey] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadData() {
    setLoading(true);
    setMessage("");

    const [clientsRes, salesRes, accountsRes, paymentsRes] = await Promise.all([
      supabase.from("clients").select("id, full_name, phone, email").order("full_name"),
      supabase.from("sales").select("*").order("created_at", { ascending: false }),
      supabase.from("collection_accounts").select("*").order("created_at", { ascending: false }),
      supabase.from("payments").select("*").order("created_at", { ascending: false }),
    ]);

    if (!clientsRes.error) setClients((clientsRes.data ?? []) as Client[]);
    if (!salesRes.error) setSales((salesRes.data ?? []) as Sale[]);
    if (!accountsRes.error) setAccounts((accountsRes.data ?? []) as CollectionAccount[]);
    if (!paymentsRes.error) setPayments((paymentsRes.data ?? []) as Payment[]);

    const errors = [clientsRes.error, salesRes.error, accountsRes.error, paymentsRes.error].filter(Boolean);

    if (errors.length) {
      setMessage("Algunos datos no se pudieron cargar. Revisa permisos o columnas.");
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const debts = useMemo<Debt[]>(() => {
    const saleDebts: Debt[] = sales
      .filter((sale) => Number(sale.balance ?? 0) > 0)
      .map((sale) => ({
        key: "sale:" + sale.id,
        type: "sale",
        id: sale.id,
        label: "Venta " + sale.sale_number,
        client_id: sale.client_id,
        total: Number(sale.total ?? 0),
        paid: Number(sale.paid_amount ?? 0),
        balance: Number(sale.balance ?? 0),
        date: sale.issued_at || sale.created_at,
        status: sale.payment_status || sale.status,
      }));

    const accountDebts: Debt[] = accounts
      .filter((account) => Number(account.balance ?? 0) > 0)
      .map((account) => ({
        key: "collection_account:" + account.id,
        type: "collection_account",
        id: account.id,
        label: "Cuenta de cobro " + account.account_number,
        client_id: account.client_id,
        total: Number(account.total ?? 0),
        paid: Math.max(Number(account.total ?? 0) - Number(account.balance ?? 0), 0),
        balance: Number(account.balance ?? 0),
        date: account.due_date || account.created_at,
        status: account.status,
      }));

    return [...saleDebts, ...accountDebts];
  }, [sales, accounts]);

  const clientDebts = useMemo(() => {
    if (!clientId) return debts;
    return debts.filter((debt) => debt.client_id === clientId);
  }, [debts, clientId]);

  const selectedDebt = useMemo(() => {
    return debts.find((debt) => debt.key === selectedDebtKey) ?? null;
  }, [debts, selectedDebtKey]);

  const filteredPayments = useMemo(() => {
    const term = search.toLowerCase().trim();

    return payments.filter((payment) => {
      const client = clients.find((item) => item.id === payment.client_id);
      const sale = sales.find((item) => item.id === payment.sale_id);
      const account = accounts.find((item) => item.id === payment.collection_account_id);

      const matchesClient = !clientId || payment.client_id === clientId;
      const matchesSearch =
        !term ||
        [
          client?.full_name,
          sale?.sale_number,
          account?.account_number,
          payment.payment_method,
          payment.payment_status,
          payment.notes,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));

      return matchesClient && matchesSearch;
    });
  }, [payments, clients, sales, accounts, search, clientId]);

  function clientName(id: string | null) {
    return clients.find((client) => client.id === id)?.full_name ?? "Sin cliente";
  }

  function paymentRelation(payment: Payment) {
    if (payment.sale_id) {
      const sale = sales.find((item) => item.id === payment.sale_id);
      return sale ? "Venta " + sale.sale_number : "Venta";
    }

    if (payment.collection_account_id) {
      const account = accounts.find((item) => item.id === payment.collection_account_id);
      return account ? "Cuenta " + account.account_number : "Cuenta de cobro";
    }

    return "Pago general";
  }

  function selectDebt(debt: Debt) {
    setSelectedDebtKey(debt.key);
    setClientId(debt.client_id ?? "");
    setAmount(String(debt.balance));
    setNotes("Abono a " + debt.label);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function clearForm() {
    setSelectedDebtKey("");
    setAmount("");
    setPaymentMethod("efectivo");
    setPaidAt(new Date().toISOString().slice(0, 10));
    setNotes("");
  }

  async function registerPayment(event: FormEvent) {
    event.preventDefault();

    if (!clientId) {
      setMessage("Selecciona un cliente.");
      return;
    }

    const paymentAmount = Number(amount || 0);

    if (paymentAmount <= 0) {
      setMessage("El valor del pago debe ser mayor a cero.");
      return;
    }

    if (!selectedDebt) {
      setMessage("Selecciona una venta o cuenta de cobro pendiente.");
      return;
    }

    if (paymentAmount > selectedDebt.balance) {
      setMessage("El pago no puede ser mayor al saldo pendiente.");
      return;
    }

    setLoading(true);
    setMessage("");

    const newBalance = Math.max(selectedDebt.balance - paymentAmount, 0);

    const paymentPayload = {
      client_id: clientId,
      sale_id: selectedDebt.type === "sale" ? selectedDebt.id : null,
      collection_account_id: selectedDebt.type === "collection_account" ? selectedDebt.id : null,
      amount: paymentAmount,
      payment_method: paymentMethod,
      payment_status: "recibido",
      paid_at: paidAt ? new Date(paidAt + "T12:00:00").toISOString() : new Date().toISOString(),
      notes: notes.trim() || "Pago registrado",
      created_at: new Date().toISOString(),
    };

    const paymentRes = await supabase.from("payments").insert(paymentPayload);

    if (paymentRes.error) {
      setMessage("No se pudo registrar el pago: " + paymentRes.error.message);
      setLoading(false);
      return;
    }

    if (selectedDebt.type === "sale") {
      const newPaid = selectedDebt.paid + paymentAmount;

      const updateRes = await supabase
        .from("sales")
        .update({
          paid_amount: newPaid,
          balance: newBalance,
          payment_status: newBalance <= 0 ? "pagada" : "abono",
          status: newBalance <= 0 ? "pagada" : "emitida",
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedDebt.id);

      if (updateRes.error) {
        setMessage("El pago se registró, pero no se pudo actualizar la venta: " + updateRes.error.message);
        setLoading(false);
        return;
      }
    }

    if (selectedDebt.type === "collection_account") {
      const updateRes = await supabase
        .from("collection_accounts")
        .update({
          balance: newBalance,
          status: newBalance <= 0 ? "pagada" : "abono",
        })
        .eq("id", selectedDebt.id);

      if (updateRes.error) {
        setMessage("El pago se registró, pero no se pudo actualizar la cuenta de cobro: " + updateRes.error.message);
        setLoading(false);
        return;
      }
    }

    setMessage("Pago registrado correctamente.");
    clearForm();
    await loadData();
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
              Pagos
            </h1>
            <p style={{ margin: 0, color: "#5D7485", fontWeight: 700 }}>
              Registrar abonos, actualizar saldos y consultar pagos realizados.
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

        <form onSubmit={registerPayment} style={cardStyle}>
          <h2 style={{ marginTop: 0, fontSize: 24, fontWeight: 900 }}>
            Registrar pago
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.4fr .8fr .8fr", gap: 16 }}>
            <label style={labelStyle}>
              Cliente
              <select value={clientId} onChange={(e) => { setClientId(e.target.value); setSelectedDebtKey(""); }} style={inputStyle}>
                <option value="">Seleccionar cliente</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>{client.full_name}</option>
                ))}
              </select>
            </label>

            <label style={labelStyle}>
              Deuda pendiente
              <select value={selectedDebtKey} onChange={(e) => {
                const debt = debts.find((item) => item.key === e.target.value);
                setSelectedDebtKey(e.target.value);
                if (debt) setAmount(String(debt.balance));
              }} style={inputStyle}>
                <option value="">Seleccionar venta o cuenta</option>
                {clientDebts.map((debt) => (
                  <option key={debt.key} value={debt.key}>
                    {debt.label} - Saldo {money(debt.balance)}
                  </option>
                ))}
              </select>
            </label>

            <label style={labelStyle}>
              Valor pagado
              <input value={amount} onChange={(e) => setAmount(e.target.value)} style={inputStyle} placeholder="0" />
            </label>

            <label style={labelStyle}>
              Fecha
              <input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} style={inputStyle} />
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16, marginTop: 16 }}>
            <label style={labelStyle}>
              Método de pago
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} style={inputStyle}>
                <option value="efectivo">Efectivo</option>
                <option value="nequi">Nequi</option>
                <option value="transferencia">Transferencia</option>
                <option value="paypal">PayPal</option>
                <option value="otro">Otro</option>
              </select>
            </label>

            <label style={labelStyle}>
              Notas
              <input value={notes} onChange={(e) => setNotes(e.target.value)} style={inputStyle} placeholder="Detalle del pago" />
            </label>
          </div>

          {selectedDebt && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginTop: 20 }}>
              <TotalCard label="Documento" value={selectedDebt.label} />
              <TotalCard label="Total" value={money(selectedDebt.total)} />
              <TotalCard label="Pagado" value={money(selectedDebt.paid)} />
              <TotalCard label="Saldo" value={money(selectedDebt.balance)} />
            </div>
          )}

          <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
            <button disabled={loading} style={darkButtonStyle}>
              Registrar pago
            </button>

            <button type="button" onClick={clearForm} style={softButtonStyle}>
              Limpiar
            </button>
          </div>
        </form>

        <div style={cardStyle}>
          <h2 style={{ marginTop: 0, fontSize: 24, fontWeight: 900 }}>
            Deudas pendientes
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {clientDebts.map((debt) => (
              <button
                key={debt.key}
                type="button"
                onClick={() => selectDebt(debt)}
                style={{
                  textAlign: "left",
                  background: "#F8FFFD",
                  border: selectedDebtKey === debt.key ? "2px solid #0F766E" : "1px solid #D8E8E5",
                  borderRadius: 22,
                  padding: 18,
                  cursor: "pointer",
                  color: "#0B1F33",
                }}
              >
                <p style={{ margin: 0, color: "#5D7485", fontWeight: 800 }}>{clientName(debt.client_id)}</p>
                <h3 style={{ margin: "8px 0", fontSize: 18, fontWeight: 900 }}>{debt.label}</h3>
                <p style={{ margin: 0, color: "#34495E", fontWeight: 700 }}>Fecha: {dateText(debt.date)}</p>
                <strong style={{ display: "block", marginTop: 10, color: "#0F766E", fontSize: 24 }}>
                  {money(debt.balance)}
                </strong>
              </button>
            ))}

            {clientDebts.length === 0 && (
              <div style={{ gridColumn: "1 / -1", padding: 30, textAlign: "center", color: "#5D7485", fontWeight: 800 }}>
                No hay deudas pendientes para este filtro.
              </div>
            )}
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", marginBottom: 18 }}>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>
              Historial de pagos
            </h2>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar pago, cliente, método o nota..."
              style={{ ...inputStyle, maxWidth: 440 }}
            />
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: 1000, borderCollapse: "collapse" }}>
              <thead style={{ background: "#EAF8F5" }}>
                <tr>
                  <th style={thStyle}>Cliente</th>
                  <th style={thStyle}>Relación</th>
                  <th style={thStyle}>Valor</th>
                  <th style={thStyle}>Método</th>
                  <th style={thStyle}>Estado</th>
                  <th style={thStyle}>Fecha</th>
                  <th style={thStyle}>Notas</th>
                </tr>
              </thead>

              <tbody>
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} style={{ borderTop: "1px solid #D8E8E5" }}>
                    <td style={tdStyle}>{clientName(payment.client_id)}</td>
                    <td style={tdStyle}>{paymentRelation(payment)}</td>
                    <td style={tdStyle}><strong>{money(payment.amount)}</strong></td>
                    <td style={tdStyle}>{payment.payment_method || "—"}</td>
                    <td style={tdStyle}>
                      <span style={{
                        background: "#DDF7E8",
                        color: "#157347",
                        borderRadius: 999,
                        padding: "6px 10px",
                        fontWeight: 900,
                        fontSize: 12,
                      }}>
                        {payment.payment_status || "recibido"}
                      </span>
                    </td>
                    <td style={tdStyle}>{dateText(payment.paid_at || payment.created_at)}</td>
                    <td style={tdStyle}>{payment.notes || "—"}</td>
                  </tr>
                ))}

                {filteredPayments.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: 40, textAlign: "center", color: "#5D7485", fontWeight: 800 }}>
                      No hay pagos para mostrar.
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

function TotalCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      background: "#F8FFFD",
      border: "1px solid #D8E8E5",
      borderRadius: 20,
      padding: 16,
    }}>
      <p style={{ margin: 0, color: "#5D7485", fontWeight: 800 }}>{label}</p>
      <strong style={{ display: "block", marginTop: 6, fontSize: 18, color: "#0F766E" }}>{value}</strong>
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

const thStyle: CSSProperties = {
  padding: 14,
  textAlign: "left",
  color: "#0B1F33",
  fontSize: 13,
  fontWeight: 900,
};

const tdStyle: CSSProperties = {
  padding: 14,
  color: "#34495E",
  fontSize: 14,
  verticalAlign: "top",
};

const softButtonStyle: CSSProperties = {
  border: "1px solid #BFE8E2",
  background: "#EAF8F5",
  borderRadius: 16,
  padding: "12px 18px",
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
