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

type SaleItem = {
  id: string;
  sale_id: string;
  description: string | null;
  item_type: string | null;
  quantity: number | null;
  unit_price: number | null;
  total: number | null;
  created_at: string | null;
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

type PaymentMethod = {
  id: string;
  name?: string | null;
  method_name?: string | null;
  label?: string | null;
  destination?: string | null;
  account_data?: string | null;
  payment_data?: string | null;
  display_order?: number | null;
  sort_order?: number | null;
  notes?: string | null;
  observation?: string | null;
  is_active?: boolean | null;
  active?: boolean | null;
};

type BusinessSettings = {
  id: string | null;
  business_name: string;
  provider_full_name: string;
  document_type: string;
  document_number: string;
  main_whatsapp: string;
  main_email: string;
  signature_url: string;
  signature_name: string;
  signature_role: string;
  signature_document: string;
  payment_qr_url: string;
  payment_qr_title: string;
  payment_qr_note: string;
};

const defaultBusinessSettings: BusinessSettings = {
  id: null,
  business_name: "Mendoza Creaciones",
  provider_full_name: "",
  document_type: "C.C.",
  document_number: "",
  main_whatsapp: "313 618 8107",
  main_email: "invitaadmon@gmail.com",
  signature_url: "",
  signature_name: "",
  signature_role: "Prestador del servicio",
  signature_document: "",
  payment_qr_url: "",
  payment_qr_title: "QR de pago",
  payment_qr_note: "Escanea el código QR para realizar tu pago.",
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

function escapeHtml(value: string | null | undefined) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isGenericSaleDescription(value: string | null | undefined) {
  const text = String(value ?? "").trim();
  return !text || /^venta\s+/i.test(text) || text.toLowerCase() === "servicio no especificado";
}

function nextAccountNumber(accounts: CollectionAccount[]) {
  const last = accounts
    .map((account) => Number(String(account.account_number ?? "").replace(/\D/g, "")))
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => b - a)[0] ?? 24;

  return "CC-" + String(last + 1).padStart(4, "0");
}

function pick(row: Record<string, any> | null | undefined, keys: string[], fallback = "") {
  if (!row) return fallback;

  for (const key of keys) {
    const value = row[key];

    if (value !== undefined && value !== null && String(value) !== "") {
      return String(value);
    }
  }

  return fallback;
}

function paymentName(method: PaymentMethod) {
  return String(method.name ?? method.method_name ?? "Medio de pago");
}

function paymentLabel(method: PaymentMethod) {
  return String(method.label ?? "Dato");
}

function paymentDestination(method: PaymentMethod) {
  return String(method.destination ?? method.account_data ?? method.payment_data ?? "");
}

function paymentOrder(method: PaymentMethod) {
  return Number(method.display_order ?? method.sort_order ?? 0);
}

function paymentActive(method: PaymentMethod) {
  return Boolean(method.is_active ?? method.active ?? true);
}

export default function CuentasCobroPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [accounts, setAccounts] = useState<CollectionAccount[]>([]);
  const [items, setItems] = useState<CollectionAccountItem[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings>(defaultBusinessSettings);

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

    const [clientsRes, salesRes, saleItemsRes, accountsRes, itemsRes, settingsRes, methodsRes] = await Promise.all([
      supabase.from("clients").select("id, full_name, phone, email, document_number").order("full_name"),
      supabase.from("sales").select("*").order("created_at", { ascending: false }),
      supabase.from("sale_items").select("*").order("created_at", { ascending: true }),
      supabase.from("collection_accounts").select("*").order("created_at", { ascending: false }),
      supabase.from("collection_account_items").select("*").order("created_at", { ascending: true }),
      supabase.from("business_settings").select("*").limit(1).maybeSingle(),
      supabase.from("payment_methods").select("*"),
    ]);

    if (!clientsRes.error) setClients((clientsRes.data ?? []) as Client[]);
    if (!salesRes.error) setSales((salesRes.data ?? []) as Sale[]);
    if (!saleItemsRes.error) setSaleItems((saleItemsRes.data ?? []) as SaleItem[]);
    if (!accountsRes.error) setAccounts((accountsRes.data ?? []) as CollectionAccount[]);
    if (!itemsRes.error) setItems((itemsRes.data ?? []) as CollectionAccountItem[]);

    if (!settingsRes.error && settingsRes.data) {
      const row = settingsRes.data as Record<string, any>;

      setBusinessSettings({
        id: String(row.id ?? "") || null,
        business_name: pick(row, ["business_name", "commercial_name", "brand_name"], defaultBusinessSettings.business_name),
        provider_full_name: pick(row, ["provider_full_name", "provider_name", "full_name", "owner_name"], ""),
        document_type: pick(row, ["document_type", "id_type"], defaultBusinessSettings.document_type),
        document_number: pick(row, ["document_number", "id_number", "provider_document"], ""),
        main_whatsapp: pick(row, ["main_whatsapp", "whatsapp", "phone_whatsapp"], defaultBusinessSettings.main_whatsapp),
        main_email: pick(row, ["main_email", "email", "contact_email"], defaultBusinessSettings.main_email),
        signature_url: pick(row, ["signature_url"], ""),
        signature_name: pick(row, ["signature_name"], pick(row, ["provider_full_name", "provider_name", "full_name", "owner_name"], "")),
        signature_role: pick(row, ["signature_role"], defaultBusinessSettings.signature_role),
        signature_document: pick(row, ["signature_document"], pick(row, ["document_number", "id_number", "provider_document"], "")),
        payment_qr_url: pick(row, ["payment_qr_url", "qr_payment_url", "qr_url"], ""),
        payment_qr_title: pick(row, ["payment_qr_title", "qr_payment_title", "qr_title"], defaultBusinessSettings.payment_qr_title),
        payment_qr_note: pick(row, ["payment_qr_note", "qr_payment_note", "qr_note"], defaultBusinessSettings.payment_qr_note),
      });
    }

    if (!methodsRes.error) {
      setPaymentMethods(((methodsRes.data ?? []) as PaymentMethod[]).sort((a, b) => paymentOrder(a) - paymentOrder(b)));
    }

    const errors = [clientsRes.error, salesRes.error, saleItemsRes.error, accountsRes.error, itemsRes.error].filter(Boolean);

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

  function itemsForSale(saleId: string | null) {
    if (!saleId) return [];
    return saleItems.filter((item) => item.sale_id === saleId);
  }

  function saleForItem(item: CollectionAccountItem) {
    return sales.find((sale) => sale.id === item.sale_id) ?? null;
  }

  function serviceDescription(item: CollectionAccountItem) {
    const savedDescription = String(item.description ?? "").trim();

    if (!isGenericSaleDescription(savedDescription)) {
      return savedDescription;
    }

    const descriptions = Array.from(
      new Set(
        itemsForSale(item.sale_id)
          .map((saleItem) => String(saleItem.description ?? "").trim())
          .filter(Boolean)
      )
    );

    return descriptions.length ? descriptions.join(" · ") : "Servicio no especificado";
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

  async function saveSignatureSettings(event: FormEvent) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    const payload = {
      signature_url: businessSettings.signature_url.trim() || null,
      signature_name: businessSettings.signature_name.trim() || null,
      signature_role: businessSettings.signature_role.trim() || "Prestador del servicio",
      signature_document: businessSettings.signature_document.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const result = businessSettings.id
      ? await supabase.from("business_settings").update(payload).eq("id", businessSettings.id)
      : await supabase.from("business_settings").insert({
          business_name: businessSettings.business_name || "Mendoza Creaciones",
          main_whatsapp: businessSettings.main_whatsapp || "313 618 8107",
          main_email: businessSettings.main_email || "invitaadmon@gmail.com",
          ...payload,
        });

    if (result.error) {
      setMessage("No se pudo guardar la firma: " + result.error.message);
    } else {
      setMessage("Firma guardada correctamente.");
      await loadData();
    }

    setLoading(false);
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

    const rows = selectedSales.flatMap((sale) => {
      const relatedItems = itemsForSale(sale.id);
      const saleBalance = Math.max(Number(sale.balance ?? 0), 0);
      const serviceDate = String(sale.issued_at || sale.created_at || new Date().toISOString()).slice(0, 10);
      const createdAt = new Date().toISOString();

      if (!relatedItems.length) {
        return [{
          collection_account_id: accountId,
          sale_id: sale.id,
          description: "Servicio no especificado",
          service_date: serviceDate,
          quantity: 1,
          unit_price: saleBalance,
          total: saleBalance,
          balance: saleBalance,
          created_at: createdAt,
        }];
      }

      const originalTotal = relatedItems.reduce(
        (sum, item) => sum + Math.max(Number(item.total ?? 0), 0),
        0
      );
      let assignedBalance = 0;

      return relatedItems.map((item, index) => {
        const rawQuantity = Number(item.quantity ?? 1);
        const quantity = rawQuantity > 0 ? rawQuantity : 1;
        const isLast = index === relatedItems.length - 1;
        const proportionalTotal = originalTotal > 0
          ? Math.round(saleBalance * (Math.max(Number(item.total ?? 0), 0) / originalTotal))
          : Math.round(saleBalance / relatedItems.length);
        const remainingBalance = Math.max(saleBalance - assignedBalance, 0);
        const lineTotal = isLast
          ? remainingBalance
          : Math.min(Math.max(proportionalTotal, 0), remainingBalance);

        assignedBalance += lineTotal;

        return {
          collection_account_id: accountId,
          sale_id: sale.id,
          description: String(item.description ?? "").trim() || "Servicio no especificado",
          service_date: serviceDate,
          quantity,
          unit_price: lineTotal / quantity,
          total: lineTotal,
          balance: lineTotal,
          created_at: createdAt,
        };
      });
    });

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
      .map((item) => "• " + serviceDescription(item) + ": " + money(item.total))
      .join("\n");

    const activePaymentMethods = paymentMethods.filter(paymentActive);
    const methods = activePaymentMethods.length
      ? activePaymentMethods.map((method) => `${paymentName(method)}: ${paymentDestination(method)}`).join("\n")
      : "NEQUI: 3209876635\nLLAVE: 1063175897\nPAYPAL: victordoria96@hotmail.com";

    return [
      "Hola " + (client?.full_name ?? "cliente") + ", te comparto la cuenta de cobro " + account.account_number + ".",
      "",
      lines || "Servicios pendientes de pago.",
      "",
      "Total: " + money(account.total),
      "Saldo: " + money(account.balance),
      "Vence: " + dateText(account.due_date),
      "",
      "Medios de pago:",
      methods,
      "",
      businessSettings.business_name || "Mendoza Creaciones",
    ].join("\n");
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
    const activePaymentMethods = paymentMethods.filter(paymentActive).sort((a, b) => paymentOrder(a) - paymentOrder(b));

    const paymentMethodsHtml = activePaymentMethods.length
      ? activePaymentMethods
          .map((method) => {
            const destination = paymentDestination(method);
            if (!destination) return "";
            return `<p><b>${paymentName(method)}:</b> ${paymentLabel(method)} ${destination}</p>`;
          })
          .filter(Boolean)
          .join("")
      : `
        <p><b>NEQUI:</b> 3209876635</p>
        <p><b>LLAVE:</b> 1063175897</p>
        <p><b>PAYPAL:</b> victordoria96@hotmail.com</p>
      `;

    const signatureName =
      businessSettings.signature_name ||
      businessSettings.provider_full_name ||
      "Firma autorizada";

    const signatureDocument =
      businessSettings.signature_document ||
      businessSettings.document_number ||
      "";

    const signatureRole =
      businessSettings.signature_role ||
      "Prestador del servicio";

    const signatureHtml = `
      <div class="signature">
        ${
          businessSettings.signature_url
            ? `<img src="${businessSettings.signature_url}" alt="Firma" class="signature-img" />`
            : ""
        }
        <div class="signature-line"></div>
        <p class="signature-name">${signatureName}</p>
        <p>${signatureRole}</p>
        ${
          signatureDocument
            ? `<p>${businessSettings.document_type || "Documento"} ${signatureDocument}</p>`
            : ""
        }
      </div>
    `;

    const qrHtml = businessSettings.payment_qr_url
      ? `
        <div class="qr-box">
          <p><b>${businessSettings.payment_qr_title || "QR de pago"}</b></p>
          <img src="${businessSettings.payment_qr_url}" alt="QR de pago" />
          <p>${businessSettings.payment_qr_note || "Escanea el QR para realizar tu pago."}</p>
        </div>
      `
      : "<div></div>";

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${account.account_number}</title>
          <style>
            @page {
              size: letter;
              margin: 8mm;
            }

            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            html,
            body {
              width: 100%;
              margin: 0;
              padding: 0;
              background: #FFFFFF;
              color: #0B1F33;
              font-family: Arial, sans-serif;
              font-size: 10px;
              line-height: 1.18;
            }

            body {
              padding: 0;
            }

            .header {
              display: flex;
              justify-content: space-between;
              gap: 12px;
              border-bottom: 1.5px solid #0B1F33;
              padding-bottom: 7px;
              margin-bottom: 8px;
            }

            h1,
            h2,
            h3,
            p {
              margin: 0 0 3px;
            }

            h1 {
              font-size: 18px;
              line-height: 1.05;
            }

            h2 {
              font-size: 15px;
              line-height: 1.05;
            }

            h3 {
              font-size: 12px;
              line-height: 1.05;
            }

            .muted {
              color: #5D7485;
              font-size: 9px;
            }

            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 6px;
              margin: 7px 0;
            }

            .info-box {
              border: 1px solid #D8E8E5;
              border-radius: 8px;
              padding: 6px 7px;
              background: #F8FFFD;
              min-height: 0;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 8px;
              font-size: 9.5px;
            }

            th,
            td {
              padding: 4px 5px;
              border-bottom: 1px solid #D8E8E5;
              text-align: left;
              vertical-align: top;
            }

            th {
              background: #EAF8F5;
              font-size: 9px;
            }

            td:nth-child(2),
            th:nth-child(2) {
              width: 80px;
            }

            td:nth-child(3),
            th:nth-child(3) {
              width: 55px;
              text-align: center;
            }

            td:nth-child(4),
            th:nth-child(4) {
              width: 95px;
              text-align: right;
            }

            .service-description {
              font-weight: 700;
              white-space: pre-line;
              overflow-wrap: anywhere;
            }

            .service-reference {
              display: block;
              margin-top: 2px;
              color: #5D7485;
              font-size: 8px;
              font-weight: 400;
              overflow-wrap: anywhere;
            }

            .total {
              margin-top: 7px;
              text-align: right;
              font-size: 10.5px;
              line-height: 1.12;
            }

            .total p {
              margin-bottom: 2px;
            }

            .box {
              margin-top: 7px;
              padding: 7px 8px;
              background: #F4FBFA;
              border: 1px solid #D8E8E5;
              border-radius: 9px;
              page-break-inside: avoid;
            }

            .box p {
              margin-bottom: 2px;
            }

            .footer-grid {
              display: grid;
              grid-template-columns: 1fr 125px;
              gap: 12px;
              align-items: end;
              margin-top: 10px;
              page-break-inside: avoid;
            }

            .signature {
              text-align: center;
              min-height: 72px;
              page-break-inside: avoid;
            }

            .signature-img {
              max-width: 165px;
              max-height: 45px;
              object-fit: contain;
              display: block;
              margin: 0 auto 2px;
            }

            .signature-line {
              border-top: 1px solid #0B1F33;
              margin: 38px auto 4px;
              width: 180px;
            }

            .signature-img + .signature-line {
              margin-top: 3px;
            }

            .signature-name {
              font-weight: 800;
              margin: 0;
            }

            .signature p {
              margin: 1px 0;
              font-size: 9px;
            }

            .qr-box {
              text-align: center;
              border: 1px solid #D8E8E5;
              background: #F8FFFD;
              border-radius: 9px;
              padding: 6px;
              font-size: 8px;
              page-break-inside: avoid;
            }

            .qr-box img {
              width: 82px;
              height: 82px;
              object-fit: contain;
              display: block;
              margin: 2px auto;
            }

            @media print {
              html,
              body {
                width: 100%;
                height: auto;
              }

              body {
                zoom: 0.92;
              }

              .header,
              .info-grid,
              table,
              .total,
              .box,
              .footer-grid {
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>${businessSettings.business_name || "Mendoza Creaciones"}</h1>
              <p class="muted">
                WhatsApp: ${businessSettings.main_whatsapp || "313 618 8107"} ·
                ${businessSettings.main_email || "invitaadmon@gmail.com"}
              </p>
            </div>
            <div style="text-align:right">
              <h2>Cuenta de cobro</h2>
              <h3>${account.account_number}</h3>
              <p class="muted">Vence: ${dateText(account.due_date)}</p>
            </div>
          </div>

          <div class="info-grid">
            <div class="info-box">
              <p><b>Cliente:</b> ${client?.full_name ?? "Sin cliente"}</p>
              <p><b>Documento:</b> ${client?.document_number ?? "—"}</p>
              <p><b>Estado:</b> ${String(account.status ?? "generada").replaceAll("_", " ")}</p>
            </div>
            <div class="info-box">
              <p><b>Periodo:</b> ${dateText(account.period_start)} al ${dateText(account.period_end)}</p>
              <p><b>Fecha generación:</b> ${dateText(account.created_at)}</p>
              <p><b>Fecha de pago sugerida:</b> ${dateText(account.due_date)}</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Servicio prestado</th>
                <th>Fecha</th>
                <th>Cantidad</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map((item) => {
                const sale = saleForItem(item);
                const reference = sale?.sale_number
                  ? `<span class="service-reference">Referencia: ${escapeHtml(sale.sale_number)}</span>`
                  : "";

                return `
                <tr>
                  <td><span class="service-description">${escapeHtml(serviceDescription(item))}</span>${reference}</td>
                  <td>${dateText(item.service_date)}</td>
                  <td>${Number(item.quantity ?? 1)}</td>
                  <td>${money(item.total)}</td>
                </tr>
              `;
              }).join("")}
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

          <div class="box">
            <b>Medios de pago</b>
            ${paymentMethodsHtml}
          </div>

          <div class="footer-grid">
            ${signatureHtml}
            ${qrHtml}
          </div>
        </body>
      </html>
    `;

    const frame = document.createElement("iframe");
    frame.style.position = "fixed";
    frame.style.right = "0";
    frame.style.bottom = "0";
    frame.style.width = "0";
    frame.style.height = "0";
    frame.style.border = "0";
    document.body.appendChild(frame);

    const frameWindow = frame.contentWindow;
    const frameDoc = frame.contentDocument || frameWindow?.document;

    if (!frameWindow || !frameDoc) {
      const win = window.open("", "_blank", "width=900,height=700");

      if (!win) {
        setMessage("El navegador bloqueó la ventana de impresión. Revisa permisos de ventanas emergentes.");
        return;
      }

      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 700);
      return;
    }

    frameDoc.open();
    frameDoc.write(html);
    frameDoc.close();

    setTimeout(() => {
      frameWindow.focus();
      frameWindow.print();

      setTimeout(() => {
        if (document.body.contains(frame)) {
          document.body.removeChild(frame);
        }
      }, 1000);
    }, 850);
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
              Generar cortes de cobro, imprimir con firma, enviar y eliminar cuentas creadas por error.
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

        <form onSubmit={saveSignatureSettings} style={cardStyle}>
          <h2 style={{ marginTop: 0, fontSize: 24, fontWeight: 900 }}>
            Firma para cuentas de cobro
          </h2>

          <p style={{ color: "#5D7485", fontWeight: 700, marginTop: 0 }}>
            Pega una URL pública de tu firma. Si no agregas imagen, el documento saldrá con línea de firma y tus datos.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr", gap: 16 }}>
            <label style={labelStyle}>
              URL de imagen de firma
              <input
                value={businessSettings.signature_url}
                onChange={(e) => setBusinessSettings({ ...businessSettings, signature_url: e.target.value })}
                placeholder="https://..."
                style={inputStyle}
              />
            </label>

            <label style={labelStyle}>
              Nombre firma
              <input
                value={businessSettings.signature_name}
                onChange={(e) => setBusinessSettings({ ...businessSettings, signature_name: e.target.value })}
                placeholder="Nombre completo"
                style={inputStyle}
              />
            </label>

            <label style={labelStyle}>
              Rol / cargo
              <input
                value={businessSettings.signature_role}
                onChange={(e) => setBusinessSettings({ ...businessSettings, signature_role: e.target.value })}
                placeholder="Prestador del servicio"
                style={inputStyle}
              />
            </label>

            <label style={labelStyle}>
              Documento
              <input
                value={businessSettings.signature_document}
                onChange={(e) => setBusinessSettings({ ...businessSettings, signature_document: e.target.value })}
                placeholder="Cédula o NIT"
                style={inputStyle}
              />
            </label>
          </div>

          <div style={{
            marginTop: 18,
            background: "#F8FFFD",
            border: "1px solid #D8E8E5",
            borderRadius: 20,
            padding: 18,
            textAlign: "center",
          }}>
            {businessSettings.signature_url ? (
              <img
                src={businessSettings.signature_url}
                alt="Firma"
                style={{ maxWidth: 240, maxHeight: 90, objectFit: "contain", display: "block", margin: "0 auto 8px" }}
              />
            ) : (
              <div style={{ borderBottom: "1.5px solid #0B1F33", width: 240, height: 55, margin: "0 auto 8px" }} />
            )}

            <strong style={{ display: "block", color: "#0B1F33" }}>
              {businessSettings.signature_name || businessSettings.provider_full_name || "Nombre de firma"}
            </strong>
            <span style={{ color: "#5D7485", fontWeight: 700 }}>
              {businessSettings.signature_role || "Prestador del servicio"}
            </span>
          </div>

          <div style={{ marginTop: 18 }}>
            <button disabled={loading} style={softButtonStyle}>
              Guardar firma
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
                    PDF / imprimir
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
