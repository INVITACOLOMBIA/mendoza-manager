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

type CatalogItem = {
  id: string;
  internal_code: string;
  name: string;
  item_type: string;
  price: number | null;
  active: boolean | null;
};

type Sale = {
  id: string;
  sale_number: string;
  client_id: string | null;
  sale_type: string;
  status: string;
  subtotal: number | null;
  discount: number | null;
  total: number | null;
  paid_amount: number | null;
  balance: number | null;
  payment_status: string;
  payment_method: string | null;
  notes: string | null;
  due_date: string | null;
  issued_at: string | null;
  document_type: string | null;
  created_at: string | null;
};

type SaleItemDraft = {
  catalog_item_id: string | null;
  description: string;
  item_type: string;
  quantity: number;
  unit_price: number;
  total: number;
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

function saleNumber() {
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
  ].join("");
  return "V-" + stamp;
}

export default function FacturacionPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);

  const [clientId, setClientId] = useState("");
  const [documentType, setDocumentType] = useState("Factura interna / comprobante");
  const [saleType, setSaleType] = useState("venta");
  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [initialPayment, setInitialPayment] = useState("0");
  const [discount, setDiscount] = useState("0");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  const [catalogId, setCatalogId] = useState("");
  const [description, setDescription] = useState("");
  const [itemType, setItemType] = useState("servicio");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("0");
  const [items, setItems] = useState<SaleItemDraft[]>([]);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadData() {
    setLoading(true);
    setMessage("");

    const [clientsRes, catalogRes, salesRes] = await Promise.all([
      supabase.from("clients").select("id, full_name, phone, email").order("full_name"),
      supabase.from("catalog_items").select("id, internal_code, name, item_type, price, active").order("name"),
      supabase.from("sales").select("*").order("created_at", { ascending: false }),
    ]);

    if (!clientsRes.error) setClients((clientsRes.data ?? []) as Client[]);
    if (!catalogRes.error) setCatalogItems((catalogRes.data ?? []) as CatalogItem[]);
    if (!salesRes.error) setSales((salesRes.data ?? []) as Sale[]);

    const errors = [clientsRes.error, catalogRes.error, salesRes.error].filter(Boolean);

    if (errors.length) {
      setMessage("Algunos datos no se pudieron cargar. Revisa permisos o columnas.");
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + Number(item.total || 0), 0);
  }, [items]);

  const discountValue = Number(discount || 0);
  const total = Math.max(subtotal - discountValue, 0);
  const paidAmount = Math.min(Number(initialPayment || 0), total);
  const balance = Math.max(total - paidAmount, 0);

  const filteredSales = useMemo(() => {
    const term = search.toLowerCase().trim();

    if (!term) return sales;

    return sales.filter((sale) => {
      const client = clients.find((item) => item.id === sale.client_id);

      return [
        sale.sale_number,
        sale.status,
        sale.payment_status,
        sale.payment_method,
        sale.document_type,
        client?.full_name,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [sales, clients, search]);

  function clientName(id: string | null) {
    return clients.find((client) => client.id === id)?.full_name ?? "Sin cliente";
  }

  function selectCatalogItem(id: string) {
    setCatalogId(id);

    const item = catalogItems.find((product) => product.id === id);

    if (item) {
      setDescription(item.name);
      setItemType(item.item_type || "servicio");
      setUnitPrice(String(Number(item.price ?? 0)));
      setQuantity("1");
    }
  }

  function addItem() {
    if (!description.trim()) {
      setMessage("Escribe una descripción para el ítem.");
      return;
    }

    const qty = Number(quantity || 1);
    const price = Number(unitPrice || 0);

    if (qty <= 0) {
      setMessage("La cantidad debe ser mayor a cero.");
      return;
    }

    const row: SaleItemDraft = {
      catalog_item_id: catalogId || null,
      description: description.trim(),
      item_type: itemType || "servicio",
      quantity: qty,
      unit_price: price,
      total: qty * price,
    };

    setItems((prev) => [...prev, row]);
    setCatalogId("");
    setDescription("");
    setItemType("servicio");
    setQuantity("1");
    setUnitPrice("0");
    setMessage("");
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  }

  function resetForm() {
    setClientId("");
    setDocumentType("Factura interna / comprobante");
    setSaleType("venta");
    setPaymentMethod("efectivo");
    setInitialPayment("0");
    setDiscount("0");
    setDueDate("");
    setNotes("");
    setCatalogId("");
    setDescription("");
    setItemType("servicio");
    setQuantity("1");
    setUnitPrice("0");
    setItems([]);
  }

  async function createSale(event: FormEvent) {
    event.preventDefault();

    if (!clientId) {
      setMessage("Selecciona un cliente.");
      return;
    }

    if (!items.length) {
      setMessage("Agrega al menos un producto o servicio.");
      return;
    }

    setLoading(true);
    setMessage("");

    const number = saleNumber();

    const salePayload = {
      sale_number: number,
      client_id: clientId,
      sale_type: saleType,
      document_type: documentType,
      status: balance <= 0 ? "pagada" : "emitida",
      subtotal,
      discount: discountValue,
      total,
      paid_amount: paidAmount,
      balance,
      payment_status: balance <= 0 ? "pagada" : paidAmount > 0 ? "abono" : "sin_pago",
      payment_method: paymentMethod || null,
      notes: notes.trim() || null,
      due_date: dueDate || null,
      issued_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const saleRes = await supabase
      .from("sales")
      .insert(salePayload)
      .select("id")
      .single();

    if (saleRes.error) {
      setMessage("No se pudo registrar la venta: " + saleRes.error.message);
      setLoading(false);
      return;
    }

    const saleId = saleRes.data.id as string;

    const itemRows = items.map((item) => ({
      sale_id: saleId,
      catalog_item_id: item.catalog_item_id,
      description: item.description,
      item_type: item.item_type,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: item.total,
      created_at: new Date().toISOString(),
    }));

    const itemsRes = await supabase.from("sale_items").insert(itemRows);

    if (itemsRes.error) {
      setMessage("La venta se creó, pero no se pudieron guardar los ítems: " + itemsRes.error.message);
      setLoading(false);
      return;
    }

    if (paidAmount > 0) {
      const paymentRes = await supabase.from("payments").insert({
        client_id: clientId,
        sale_id: saleId,
        amount: paidAmount,
        payment_method: paymentMethod || null,
        payment_status: "recibido",
        paid_at: new Date().toISOString(),
        notes: "Abono inicial de la venta " + number,
        created_at: new Date().toISOString(),
      });

      if (paymentRes.error) {
        setMessage("La venta se creó, pero no se pudo registrar el pago: " + paymentRes.error.message);
        setLoading(false);
        return;
      }
    }

    setMessage("Venta registrada correctamente: " + number);
    resetForm();
    await loadData();
    setLoading(false);
  }

  async function deleteSale(sale: Sale) {
    const ok = confirm("¿Eliminar la venta " + sale.sale_number + "? También se eliminarán sus ítems y pagos asociados.");

    if (!ok) return;

    setLoading(true);
    setMessage("");

    await supabase.from("payments").delete().eq("sale_id", sale.id);
    await supabase.from("sale_items").delete().eq("sale_id", sale.id);

    const { error } = await supabase.from("sales").delete().eq("id", sale.id);

    if (error) {
      setMessage("No se pudo eliminar la venta: " + error.message);
    } else {
      setMessage("Venta eliminada correctamente.");
      await loadData();
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
              Facturación
            </h1>
            <p style={{ margin: 0, color: "#5D7485", fontWeight: 700 }}>
              Crear ventas, agregar productos, registrar abonos y consultar saldos.
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

        <form onSubmit={createSale} style={cardStyle}>
          <h2 style={{ marginTop: 0, fontSize: 24, fontWeight: 900 }}>
            Nueva venta
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
            <label style={labelStyle}>
              Cliente
              <select value={clientId} onChange={(e) => setClientId(e.target.value)} style={inputStyle}>
                <option value="">Seleccionar cliente</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>{client.full_name}</option>
                ))}
              </select>
            </label>

            <label style={labelStyle}>
              Tipo de documento
              <select value={documentType} onChange={(e) => setDocumentType(e.target.value)} style={inputStyle}>
                <option value="Factura interna / comprobante">Factura interna / comprobante</option>
                <option value="Factura electrónica externa">Factura electrónica externa</option>
                <option value="Orden de servicio">Orden de servicio</option>
                <option value="Recibo">Recibo</option>
              </select>
            </label>

            <label style={labelStyle}>
              Tipo de venta
              <select value={saleType} onChange={(e) => setSaleType(e.target.value)} style={inputStyle}>
                <option value="venta">Venta</option>
                <option value="servicio">Servicio</option>
                <option value="programa">Programa</option>
                <option value="producto">Producto</option>
              </select>
            </label>

            <label style={labelStyle}>
              Vence
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={inputStyle} />
            </label>
          </div>

          <div style={{ marginTop: 24, padding: 18, border: "1px solid #D8E8E5", borderRadius: 22, background: "#F8FFFD" }}>
            <h3 style={{ marginTop: 0, fontSize: 20, fontWeight: 900 }}>
              Agregar producto o servicio
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.2fr .7fr .7fr .7fr auto", gap: 12, alignItems: "end" }}>
              <label style={labelStyle}>
                Catálogo
                <select value={catalogId} onChange={(e) => selectCatalogItem(e.target.value)} style={inputStyle}>
                  <option value="">Manual / sin catálogo</option>
                  {catalogItems.filter((item) => item.active !== false).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} - {money(item.price)}
                    </option>
                  ))}
                </select>
              </label>

              <label style={labelStyle}>
                Descripción
                <input value={description} onChange={(e) => setDescription(e.target.value)} style={inputStyle} placeholder="Producto o servicio" />
              </label>

              <label style={labelStyle}>
                Tipo
                <input value={itemType} onChange={(e) => setItemType(e.target.value)} style={inputStyle} />
              </label>

              <label style={labelStyle}>
                Cantidad
                <input value={quantity} onChange={(e) => setQuantity(e.target.value)} style={inputStyle} />
              </label>

              <label style={labelStyle}>
                Precio
                <input value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} style={inputStyle} />
              </label>

              <button type="button" onClick={addItem} style={darkButtonStyle}>
                Agregar
              </button>
            </div>

            <div style={{ marginTop: 18 }}>
              {items.length > 0 ? (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead style={{ background: "#EAF8F5" }}>
                    <tr>
                      <th style={thStyle}>Descripción</th>
                      <th style={thStyle}>Tipo</th>
                      <th style={thStyle}>Cantidad</th>
                      <th style={thStyle}>Precio</th>
                      <th style={thStyle}>Total</th>
                      <th style={thStyle}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={index} style={{ borderTop: "1px solid #D8E8E5" }}>
                        <td style={tdStyle}>{item.description}</td>
                        <td style={tdStyle}>{item.item_type}</td>
                        <td style={tdStyle}>{item.quantity}</td>
                        <td style={tdStyle}>{money(item.unit_price)}</td>
                        <td style={tdStyle}>{money(item.total)}</td>
                        <td style={tdStyle}>
                          <button type="button" onClick={() => removeItem(index)} style={dangerSmallButtonStyle}>
                            Quitar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={{ color: "#5D7485", fontWeight: 700 }}>Aún no has agregado ítems.</p>
              )}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginTop: 24 }}>
            <label style={labelStyle}>
              Descuento
              <input value={discount} onChange={(e) => setDiscount(e.target.value)} style={inputStyle} />
            </label>

            <label style={labelStyle}>
              Abono inicial
              <input value={initialPayment} onChange={(e) => setInitialPayment(e.target.value)} style={inputStyle} />
            </label>

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
              <input value={notes} onChange={(e) => setNotes(e.target.value)} style={inputStyle} />
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginTop: 24 }}>
            <TotalCard label="Subtotal" value={money(subtotal)} />
            <TotalCard label="Descuento" value={money(discountValue)} />
            <TotalCard label="Abonado" value={money(paidAmount)} />
            <TotalCard label="Saldo" value={money(balance)} />
          </div>

          <div style={{ marginTop: 24 }}>
            <button disabled={loading} style={darkButtonStyle}>
              Registrar venta
            </button>
          </div>
        </form>

        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", marginBottom: 18 }}>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>
              Ventas registradas
            </h2>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar venta, cliente o estado..."
              style={{ ...inputStyle, maxWidth: 420 }}
            />
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: 1000, borderCollapse: "collapse" }}>
              <thead style={{ background: "#EAF8F5" }}>
                <tr>
                  <th style={thStyle}>Número</th>
                  <th style={thStyle}>Cliente</th>
                  <th style={thStyle}>Documento</th>
                  <th style={thStyle}>Total</th>
                  <th style={thStyle}>Abonado</th>
                  <th style={thStyle}>Saldo</th>
                  <th style={thStyle}>Estado pago</th>
                  <th style={thStyle}>Fecha</th>
                  <th style={thStyle}>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {filteredSales.map((sale) => (
                  <tr key={sale.id} style={{ borderTop: "1px solid #D8E8E5" }}>
                    <td style={tdStyle}><strong>{sale.sale_number}</strong></td>
                    <td style={tdStyle}>{clientName(sale.client_id)}</td>
                    <td style={tdStyle}>{sale.document_type || sale.sale_type}</td>
                    <td style={tdStyle}>{money(sale.total)}</td>
                    <td style={tdStyle}>{money(sale.paid_amount)}</td>
                    <td style={tdStyle}>{money(sale.balance)}</td>
                    <td style={tdStyle}>
                      <span style={{
                        background: sale.payment_status === "pagada" ? "#DDF7E8" : "#FFF3D6",
                        color: sale.payment_status === "pagada" ? "#157347" : "#9A6700",
                        borderRadius: 999,
                        padding: "6px 10px",
                        fontWeight: 900,
                        fontSize: 12,
                      }}>
                        {sale.payment_status}
                      </span>
                    </td>
                    <td style={tdStyle}>{dateText(sale.issued_at || sale.created_at)}</td>
                    <td style={tdStyle}>
                      <button onClick={() => deleteSale(sale)} style={dangerSmallButtonStyle}>
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}

                {filteredSales.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ padding: 40, textAlign: "center", color: "#5D7485", fontWeight: 800 }}>
                      No hay ventas para mostrar.
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
      <strong style={{ display: "block", marginTop: 6, fontSize: 24, color: "#0F766E" }}>{value}</strong>
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

const dangerSmallButtonStyle: CSSProperties = {
  border: "1px solid #F4C7C7",
  background: "#FDE2E5",
  color: "#B42318",
  borderRadius: 12,
  padding: "8px 10px",
  fontWeight: 900,
  cursor: "pointer",
};
