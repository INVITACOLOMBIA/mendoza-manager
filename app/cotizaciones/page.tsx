"use client";

import { FormEvent, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
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

type CatalogItem = {
  id: string;
  internal_code: string;
  name: string;
  item_type: string;
  short_description: string | null;
  price_type: string;
  price: number | null;
  delivery_time: string | null;
  requires_advance: boolean | null;
  active: boolean | null;
};

type Quote = {
  id: string;
  quote_number: string;
  prospect_id: string | null;
  client_id: string | null;
  status: string;
  subtotal: number | null;
  discount: number | null;
  total: number | null;
  valid_until: string | null;
  delivery_time: string | null;
  notes: string | null;
  sent_at: string | null;
  accepted_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type QuoteItem = {
  id: string;
  quote_id: string;
  catalog_item_id: string | null;
  description: string;
  quantity: number | null;
  unit_price: number | null;
  total: number | null;
  created_at: string | null;
  requires_advance: boolean | null;
};

type BusinessSettings = {
  id: string;
  business_name: string | null;
  owner_full_name: string | null;
  whatsapp: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  quote_validity_days: number | null;
  notes: string | null;
  payment_qr_url?: string | null;
  payment_qr_title?: string | null;
  payment_qr_note?: string | null;
};

type PaymentMethod = {
  id: string;
  name: string | null;
  method_name: string | null;
  label: string | null;
  account_label: string | null;
  destination: string | null;
  account_value: string | null;
  display_order: number | null;
  sort_order: number | null;
  is_active: boolean | null;
  active: boolean | null;
};

type DraftItem = {
  local_id: string;
  catalog_item_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  requires_advance: boolean;
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

function inputDateFromNow(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function numeric(value: string) {
  const parsed = Number(String(value || "0").replace(/,/g, "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function nextQuoteNumber(quotes: Quote[]) {
  const last = quotes
    .map((quote) => Number(String(quote.quote_number ?? "").replace(/\D/g, "")))
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => b - a)[0] ?? 0;

  return "COT-" + String(last + 1).padStart(4, "0");
}

function cleanPhone(value: string | null) {
  return String(value ?? "").replace(/\D/g, "");
}

function paymentName(method: PaymentMethod) {
  return method.name || method.method_name || "Medio de pago";
}

function paymentLabel(method: PaymentMethod) {
  return method.label || method.account_label || "Dato";
}

function paymentDestination(method: PaymentMethod) {
  return method.destination || method.account_value || "";
}

function paymentActive(method: PaymentMethod) {
  return Boolean(method.is_active ?? method.active ?? true);
}

function paymentOrder(method: PaymentMethod) {
  return Number(method.display_order ?? method.sort_order ?? 10);
}

export default function CotizacionesPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [quoteNumber, setQuoteNumber] = useState("");
  const [clientId, setClientId] = useState("");
  const [validUntil, setValidUntil] = useState(inputDateFromNow(5));
  const [deliveryTime, setDeliveryTime] = useState("");
  const [discount, setDiscount] = useState("0");
  const [notes, setNotes] = useState("Cotización válida según fecha indicada. Los precios pueden variar después del vencimiento.");
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);

  const [catalogItemId, setCatalogItemId] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("0");
  const [requiresAdvance, setRequiresAdvance] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadData() {
    setLoading(true);
    setMessage("");

    const [clientsRes, catalogRes, quotesRes, itemsRes, settingsRes, methodsRes] = await Promise.all([
      supabase.from("clients").select("id, full_name, phone, email, document_number, address, city").order("full_name"),
      supabase.from("catalog_items").select("id, internal_code, name, item_type, short_description, price_type, price, delivery_time, requires_advance, active").order("name"),
      supabase.from("quotes").select("*").order("created_at", { ascending: false }),
      supabase.from("quote_items").select("*").order("created_at", { ascending: true }),
      supabase.from("business_settings").select("*").limit(1).maybeSingle(),
      supabase.from("payment_methods").select("*"),
    ]);

    if (!clientsRes.error) setClients((clientsRes.data ?? []) as Client[]);
    if (!catalogRes.error) setCatalogItems((catalogRes.data ?? []) as CatalogItem[]);
    if (!quotesRes.error) {
      const rows = (quotesRes.data ?? []) as Quote[];
      setQuotes(rows);
      if (!editingId) setQuoteNumber(nextQuoteNumber(rows));
    }
    if (!itemsRes.error) setQuoteItems((itemsRes.data ?? []) as QuoteItem[]);
    if (!settingsRes.error && settingsRes.data) {
      const row = settingsRes.data as BusinessSettings;
      setSettings(row);
      if (!editingId) {
        setValidUntil(inputDateFromNow(Number(row.quote_validity_days ?? 5)));
      }
    }
    if (!methodsRes.error) {
      const rows = ((methodsRes.data ?? []) as PaymentMethod[])
        .filter((method) => paymentActive(method))
        .sort((a, b) => paymentOrder(a) - paymentOrder(b));
      setPaymentMethods(rows);
    }

    const errors = [clientsRes.error, catalogRes.error, quotesRes.error, itemsRes.error, settingsRes.error, methodsRes.error].filter(Boolean);

    if (errors.length) {
      setMessage("Algunos datos no se pudieron cargar.");
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const subtotal = useMemo(() => {
    return draftItems.reduce((sum, item) => sum + item.total, 0);
  }, [draftItems]);

  const discountValue = numeric(discount);
  const total = Math.max(subtotal - discountValue, 0);
  const advanceRequired = draftItems.some((item) => item.requires_advance);
  const suggestedAdvance = advanceRequired ? Math.round(total * 0.5) : 0;

  const filteredQuotes = useMemo(() => {
    const term = search.toLowerCase().trim();

    return quotes.filter((quote) => {
      const client = clients.find((item) => item.id === quote.client_id);

      const matchesSearch =
        !term ||
        [
          quote.quote_number,
          quote.status,
          quote.delivery_time,
          quote.notes,
          client?.full_name,
          client?.phone,
          client?.email,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));

      const matchesStatus = statusFilter === "todos" || quote.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [quotes, clients, search, statusFilter]);

  function clientName(id: string | null) {
    return clients.find((client) => client.id === id)?.full_name ?? "Sin cliente";
  }

  function clientData(id: string | null) {
    return clients.find((client) => client.id === id) ?? null;
  }

  function itemsByQuote(id: string) {
    return quoteItems.filter((item) => item.quote_id === id);
  }

  function clearItemForm() {
    setCatalogItemId("");
    setDescription("");
    setQuantity("1");
    setUnitPrice("0");
    setRequiresAdvance(false);
  }

  function clearForm() {
    setEditingId(null);
    setQuoteNumber(nextQuoteNumber(quotes));
    setClientId("");
    setValidUntil(inputDateFromNow(Number(settings?.quote_validity_days ?? 5)));
    setDeliveryTime("");
    setDiscount("0");
    setNotes("Cotización válida según fecha indicada. Los precios pueden variar después del vencimiento.");
    setDraftItems([]);
    clearItemForm();
  }

  function onSelectCatalog(id: string) {
    setCatalogItemId(id);

    const item = catalogItems.find((catalog) => catalog.id === id);

    if (!item) {
      setDescription("");
      setUnitPrice("0");
      setRequiresAdvance(false);
      return;
    }

    setDescription(item.name + (item.short_description ? " - " + item.short_description : ""));
    setUnitPrice(String(item.price ?? 0));
    setRequiresAdvance(Boolean(item.requires_advance));
    if (!deliveryTime && item.delivery_time) setDeliveryTime(item.delivery_time);
  }

  function addDraftItem() {
    if (!description.trim()) {
      setMessage("Escribe la descripción del ítem.");
      return;
    }

    const qty = numeric(quantity);
    const price = numeric(unitPrice);

    if (qty <= 0) {
      setMessage("La cantidad debe ser mayor a cero.");
      return;
    }

    const row: DraftItem = {
      local_id: crypto.randomUUID(),
      catalog_item_id: catalogItemId || null,
      description: description.trim(),
      quantity: qty,
      unit_price: price,
      total: qty * price,
      requires_advance: requiresAdvance,
    };

    setDraftItems((prev) => [...prev, row]);
    setMessage("");
    clearItemForm();
  }

  function removeDraftItem(localId: string) {
    setDraftItems((prev) => prev.filter((item) => item.local_id !== localId));
  }

  function startEdit(quote: Quote) {
    const rows = itemsByQuote(quote.id).map((item) => ({
      local_id: crypto.randomUUID(),
      catalog_item_id: item.catalog_item_id,
      description: item.description,
      quantity: Number(item.quantity ?? 1),
      unit_price: Number(item.unit_price ?? 0),
      total: Number(item.total ?? 0),
      requires_advance: Boolean(item.requires_advance),
    }));

    setEditingId(quote.id);
    setQuoteNumber(quote.quote_number);
    setClientId(quote.client_id ?? "");
    setValidUntil(quote.valid_until ?? inputDateFromNow(Number(settings?.quote_validity_days ?? 5)));
    setDeliveryTime(quote.delivery_time ?? "");
    setDiscount(String(quote.discount ?? 0));
    setNotes(quote.notes ?? "");
    setDraftItems(rows);
    clearItemForm();
    setMessage("Editando cotización " + quote.quote_number);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveQuote(event: FormEvent) {
    event.preventDefault();

    if (!clientId) {
      setMessage("Selecciona un cliente.");
      return;
    }

    if (!draftItems.length) {
      setMessage("Agrega al menos un ítem a la cotización.");
      return;
    }

    setLoading(true);
    setMessage("");

    const number = quoteNumber || nextQuoteNumber(quotes);

    const quotePayload = {
      quote_number: number,
      client_id: clientId,
      prospect_id: null,
      status: "borrador",
      subtotal,
      discount: discountValue,
      total,
      valid_until: validUntil || null,
      delivery_time: deliveryTime.trim() || null,
      notes: notes.trim() || null,
      updated_at: new Date().toISOString(),
    };

    let quoteId = editingId;

    if (editingId) {
      const { error } = await supabase
        .from("quotes")
        .update(quotePayload)
        .eq("id", editingId);

      if (error) {
        setMessage("No se pudo actualizar la cotización: " + error.message);
        setLoading(false);
        return;
      }

      await supabase.from("quote_items").delete().eq("quote_id", editingId);
    } else {
      quoteId = crypto.randomUUID();

      const { error } = await supabase.from("quotes").insert({
        id: quoteId,
        ...quotePayload,
        created_at: new Date().toISOString(),
      });

      if (error) {
        setMessage("No se pudo crear la cotización: " + error.message);
        setLoading(false);
        return;
      }
    }

    const rows = draftItems.map((item) => ({
      id: crypto.randomUUID(),
      quote_id: quoteId,
      catalog_item_id: item.catalog_item_id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: item.total,
      requires_advance: item.requires_advance,
      created_at: new Date().toISOString(),
    }));

    const itemsRes = await supabase.from("quote_items").insert(rows);

    if (itemsRes.error) {
      setMessage("La cotización se guardó, pero falló al guardar ítems: " + itemsRes.error.message);
      setLoading(false);
      return;
    }

    setMessage(editingId ? "Cotización actualizada correctamente." : "Cotización creada correctamente: " + number);
    clearForm();
    await loadData();
    setLoading(false);
  }

  async function deleteQuote(quote: Quote) {
    const ok = confirm("¿Eliminar la cotización " + quote.quote_number + "?");
    if (!ok) return;

    setLoading(true);
    setMessage("");

    await supabase.from("quote_items").delete().eq("quote_id", quote.id);
    const { error } = await supabase.from("quotes").delete().eq("id", quote.id);

    if (error) {
      setMessage("No se pudo eliminar: " + error.message);
    } else {
      setMessage("Cotización eliminada correctamente.");
      await loadData();
    }

    setLoading(false);
  }

  async function markSent(quote: Quote) {
    const { error } = await supabase
      .from("quotes")
      .update({
        status: "enviada",
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", quote.id);

    if (error) {
      setMessage("No se pudo marcar enviada: " + error.message);
    } else {
      setMessage("Cotización marcada como enviada.");
      await loadData();
    }
  }

  async function markAccepted(quote: Quote) {
    const { error } = await supabase
      .from("quotes")
      .update({
        status: "aceptada",
        accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", quote.id);

    if (error) {
      setMessage("No se pudo aceptar: " + error.message);
    } else {
      setMessage("Cotización marcada como aceptada.");
      await loadData();
    }
  }

  function summaryText(quote: Quote) {
    const client = clientData(quote.client_id);
    const rows = itemsByQuote(quote.id)
      .map((item) => "• " + item.description + ": " + money(item.total))
      .join("\n");

    const advanceText = itemsByQuote(quote.id).some((item) => item.requires_advance)
      ? "\nAnticipo sugerido 50%: " + money(Number(quote.total ?? 0) * 0.5)
      : "";

    return [
      "Hola " + (client?.full_name ?? "cliente") + ", te comparto la cotización " + quote.quote_number + ".",
      "",
      rows || "Servicios cotizados.",
      "",
      "Total: " + money(quote.total),
      "Válida hasta: " + dateText(quote.valid_until),
      "Entrega: " + (quote.delivery_time || "Por confirmar") + advanceText,
      "",
      settings?.business_name || "Mendoza Manager",
    ].join("\n");
  }

  function whatsappLink(quote: Quote) {
    const client = clientData(quote.client_id);
    const phone = cleanPhone(client?.phone ?? null);
    const target = phone ? "57" + phone.slice(-10) : "";
    return "https://wa.me/" + target + "?text=" + encodeURIComponent(summaryText(quote));
  }

  function printQuote(quote: Quote) {
    const client = clientData(quote.client_id);
    const rows = itemsByQuote(quote.id);
    const methodsHtml = paymentMethods
      .map((method) => `<p><b>${paymentName(method)}:</b> ${paymentLabel(method)} ${paymentDestination(method)}</p>`)
      .join("");

    const quoteAdvance = rows.some((item) => item.requires_advance)
      ? Math.round(Number(quote.total ?? 0) * 0.5)
      : 0;

    const html = `
      <html>
        <head>
          <title>${quote.quote_number}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; color: #0B1F33; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0B1F33; padding-bottom: 16px; margin-bottom: 24px; }
            h1, h2, h3, p { margin: 0 0 8px; }
            .muted { color: #5D7485; }
            table { width: 100%; border-collapse: collapse; margin-top: 24px; }
            th, td { padding: 12px; border-bottom: 1px solid #D8E8E5; text-align: left; vertical-align: top; }
            th { background: #EAF8F5; }
            .total { margin-top: 24px; text-align: right; font-size: 20px; }
            .box { margin-top: 24px; padding: 16px; background: #F4FBFA; border: 1px solid #D8E8E5; border-radius: 16px; }
            .qr { width: 130px; height: 130px; object-fit: contain; border: 1px solid #D8E8E5; border-radius: 12px; padding: 6px; background: white; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>${settings?.business_name || "Mendoza Manager"}</h1>
              <p class="muted">${settings?.address || ""} ${settings?.city || ""}</p>
              <p class="muted">${settings?.email || ""} ${settings?.whatsapp ? " · WhatsApp: " + settings.whatsapp : ""}</p>
            </div>
            <div>
              <h2>${quote.quote_number}</h2>
              <p class="muted">Cotización</p>
              <p><b>Válida hasta:</b> ${dateText(quote.valid_until)}</p>
            </div>
          </div>

          <p><b>Cliente:</b> ${client?.full_name ?? "Sin cliente"}</p>
          <p><b>Documento:</b> ${client?.document_number ?? "—"}</p>
          <p><b>Teléfono:</b> ${client?.phone ?? "—"}</p>
          <p><b>Entrega:</b> ${quote.delivery_time ?? "Por confirmar"}</p>

          <table>
            <thead>
              <tr>
                <th>Descripción</th>
                <th>Cantidad</th>
                <th>Vr. unitario</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map((item) => `
                <tr>
                  <td>${item.description}${item.requires_advance ? "<br><small>Requiere anticipo</small>" : ""}</td>
                  <td>${item.quantity ?? 1}</td>
                  <td>${money(item.unit_price)}</td>
                  <td>${money(item.total)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>

          <div class="total">
            <p>Subtotal: <b>${money(quote.subtotal)}</b></p>
            <p>Descuento: <b>${money(quote.discount)}</b></p>
            <p>Total: <b>${money(quote.total)}</b></p>
            ${quoteAdvance > 0 ? `<p>Anticipo sugerido 50%: <b>${money(quoteAdvance)}</b></p>` : ""}
          </div>

          <div class="box">
            <h3>Notas</h3>
            <p>${quote.notes ?? "Sin observaciones."}</p>
          </div>

          <div class="box">
            <h3>Medios de pago</h3>
            ${methodsHtml || "<p>No hay medios de pago registrados.</p>"}
            ${settings?.payment_qr_url ? `<br><img class="qr" src="${settings.payment_qr_url}" />` : ""}
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
              Cotizaciones
            </h1>
            <p style={{ margin: 0, color: "#5D7485", fontWeight: 700 }}>
              Crear, editar, imprimir, enviar y aceptar cotizaciones.
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

        <form onSubmit={saveQuote} style={cardStyle}>
          <h2 style={{ marginTop: 0, fontSize: 24, fontWeight: 900 }}>
            {editingId ? "Editar cotización" : "Nueva cotización"}
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: ".7fr 1.3fr .7fr .7fr", gap: 16 }}>
            <Field label="Número">
              <input value={quoteNumber} onChange={(e) => setQuoteNumber(e.target.value)} style={inputStyle} />
            </Field>

            <Field label="Cliente">
              <select value={clientId} onChange={(e) => setClientId(e.target.value)} style={inputStyle}>
                <option value="">Seleccionar cliente</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>{client.full_name}</option>
                ))}
              </select>
            </Field>

            <Field label="Válida hasta">
              <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} style={inputStyle} />
            </Field>

            <Field label="Tiempo entrega">
              <input value={deliveryTime} onChange={(e) => setDeliveryTime(e.target.value)} style={inputStyle} placeholder="3 a 5 días" />
            </Field>
          </div>

          <div style={{ marginTop: 22, padding: 18, background: "#F8FFFD", border: "1px solid #D8E8E5", borderRadius: 22 }}>
            <h3 style={{ marginTop: 0, fontSize: 20, fontWeight: 900 }}>
              Agregar ítems
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.5fr .45fr .55fr .55fr", gap: 12 }}>
              <Field label="Catálogo">
                <select value={catalogItemId} onChange={(e) => onSelectCatalog(e.target.value)} style={inputStyle}>
                  <option value="">Ítem manual</option>
                  {catalogItems.filter((item) => item.active !== false).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.internal_code} - {item.name} - {money(item.price)}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Descripción">
                <input value={description} onChange={(e) => setDescription(e.target.value)} style={inputStyle} />
              </Field>

              <Field label="Cant.">
                <input value={quantity} onChange={(e) => setQuantity(e.target.value)} style={inputStyle} />
              </Field>

              <Field label="Vr. unitario">
                <input value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} style={inputStyle} />
              </Field>

              <label style={checkStyle}>
                <input type="checkbox" checked={requiresAdvance} onChange={(e) => setRequiresAdvance(e.target.checked)} />
                Anticipo
              </label>
            </div>

            <button type="button" onClick={addDraftItem} style={{ ...darkButtonStyle, marginTop: 16 }}>
              Agregar ítem
            </button>
          </div>

          <div style={{ overflowX: "auto", marginTop: 20 }}>
            <table style={{ width: "100%", minWidth: 900, borderCollapse: "collapse" }}>
              <thead style={{ background: "#EAF8F5" }}>
                <tr>
                  <th style={thStyle}>Descripción</th>
                  <th style={thStyle}>Cantidad</th>
                  <th style={thStyle}>Vr. unitario</th>
                  <th style={thStyle}>Total</th>
                  <th style={thStyle}>Anticipo</th>
                  <th style={thStyle}>Acción</th>
                </tr>
              </thead>

              <tbody>
                {draftItems.map((item) => (
                  <tr key={item.local_id} style={{ borderTop: "1px solid #D8E8E5" }}>
                    <td style={tdStyle}>{item.description}</td>
                    <td style={tdStyle}>{item.quantity}</td>
                    <td style={tdStyle}>{money(item.unit_price)}</td>
                    <td style={tdStyle}><strong>{money(item.total)}</strong></td>
                    <td style={tdStyle}>{item.requires_advance ? "Sí" : "No"}</td>
                    <td style={tdStyle}>
                      <button type="button" onClick={() => removeDraftItem(item.local_id)} style={dangerButtonStyle}>
                        Quitar
                      </button>
                    </td>
                  </tr>
                ))}

                {draftItems.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: 28, textAlign: "center", color: "#5D7485", fontWeight: 800 }}>
                      Agrega productos o servicios a la cotización.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr .7fr .7fr .7fr .7fr", gap: 16, marginTop: 20 }}>
            <Field label="Notas">
              <input value={notes} onChange={(e) => setNotes(e.target.value)} style={inputStyle} />
            </Field>

            <Field label="Descuento">
              <input value={discount} onChange={(e) => setDiscount(e.target.value)} style={inputStyle} />
            </Field>

            <TotalCard label="Subtotal" value={money(subtotal)} />
            <TotalCard label="Total" value={money(total)} />
            <TotalCard label="Anticipo 50%" value={advanceRequired ? money(suggestedAdvance) : "No aplica"} />
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
            <button disabled={loading} style={darkButtonStyle}>
              {editingId ? "Actualizar cotización" : "Guardar cotización"}
            </button>

            <button type="button" onClick={clearForm} style={softButtonStyle}>
              Limpiar
            </button>
          </div>
        </form>

        <section style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "center", marginBottom: 18 }}>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>
              Historial de cotizaciones
            </h2>

            <div style={{ display: "flex", gap: 10 }}>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." style={{ ...inputStyle, width: 320, marginTop: 0 }} />

              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ ...inputStyle, width: 170, marginTop: 0 }}>
                <option value="todos">Todos</option>
                <option value="borrador">Borrador</option>
                <option value="enviada">Enviada</option>
                <option value="aceptada">Aceptada</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gap: 16 }}>
            {filteredQuotes.map((quote) => (
              <article key={quote.id} style={{
                background: "#F8FFFD",
                border: "1px solid #D8E8E5",
                borderRadius: 24,
                padding: 18,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>{quote.quote_number}</h3>
                    <p style={{ margin: "6px 0", color: "#34495E", fontWeight: 800 }}>{clientName(quote.client_id)}</p>
                    <p style={{ margin: 0, color: "#5D7485", fontWeight: 700 }}>
                      Válida hasta {dateText(quote.valid_until)} · Entrega {quote.delivery_time || "Por confirmar"} · {itemsByQuote(quote.id).length} ítem(s)
                    </p>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <span style={{
                      display: "inline-block",
                      background: quote.status === "aceptada" ? "#DDF7E8" : "#EAF8F5",
                      color: quote.status === "aceptada" ? "#157347" : "#0F766E",
                      borderRadius: 999,
                      padding: "7px 10px",
                      fontSize: 12,
                      fontWeight: 900,
                      marginBottom: 8,
                    }}>
                      {quote.status}
                    </span>
                    <strong style={{ display: "block", color: "#0F766E", fontSize: 28 }}>{money(quote.total)}</strong>
                  </div>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
                  <button type="button" onClick={() => startEdit(quote)} style={softButtonStyle}>
                    Editar
                  </button>

                  <button type="button" onClick={() => printQuote(quote)} style={softButtonStyle}>
                    Imprimir
                  </button>

                  <a href={whatsappLink(quote)} target="_blank" style={{ ...softButtonStyle, textDecoration: "none" }}>
                    WhatsApp
                  </a>

                  <button type="button" onClick={() => markSent(quote)} style={softButtonStyle}>
                    Marcar enviada
                  </button>

                  <button type="button" onClick={() => markAccepted(quote)} style={softButtonStyle}>
                    Marcar aceptada
                  </button>

                  <button type="button" onClick={() => deleteQuote(quote)} style={dangerButtonStyle}>
                    Eliminar
                  </button>
                </div>
              </article>
            ))}

            {filteredQuotes.length === 0 && (
              <div style={{ padding: 40, textAlign: "center", color: "#5D7485", fontWeight: 800 }}>
                No hay cotizaciones para mostrar.
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

const checkStyle: CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  marginTop: 37,
  fontWeight: 900,
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
