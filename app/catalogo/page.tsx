"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Category = {
  id: string;
  name: string;
  description: string | null;
  active: boolean | null;
  created_at?: string | null;
};

type CatalogItem = {
  id: string;
  internal_code: string;
  barcode: string | null;
  name: string;
  item_type: string;
  category_id: string | null;
  short_description: string | null;
  long_description: string | null;
  price_type: string;
  price: number | null;
  cost: number | null;
  stock: number | null;
  stock_minimum: number | null;
  image_url: string | null;
  banner_url: string | null;
  delivery_time: string | null;
  requires_advance: boolean | null;
  active: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type FormState = {
  internal_code: string;
  barcode: string;
  name: string;
  item_type: string;
  category_id: string;
  short_description: string;
  long_description: string;
  price_type: string;
  price: string;
  cost: string;
  stock: string;
  stock_minimum: string;
  image_url: string;
  banner_url: string;
  delivery_time: string;
  requires_advance: boolean;
  active: boolean;
};


type ImportRow = {
  internal_code: string;
  barcode: string;
  name: string;
  item_type: string;
  category_name: string;
  short_description: string;
  long_description: string;
  price_type: string;
  price: string;
  cost: string;
  stock: string;
  stock_minimum: string;
  image_url: string;
  banner_url: string;
  delivery_time: string;
  requires_advance: string;
  active: string;
};

const importColumns = [
  "internal_code",
  "barcode",
  "name",
  "item_type",
  "category_name",
  "short_description",
  "long_description",
  "price_type",
  "price",
  "cost",
  "stock",
  "stock_minimum",
  "image_url",
  "banner_url",
  "delivery_time",
  "requires_advance",
  "active",
];

const templateRows = [
  {
    internal_code: "DIS-001",
    barcode: "",
    name: "Volante sencillo",
    item_type: "servicio",
    category_name: "Diseño para impresión",
    short_description: "Diseño de volante una cara listo para impresión",
    long_description: "Incluye diseño gráfico, preparación para impresión en PDF y hasta 2 rondas de ajustes.",
    price_type: "fijo",
    price: "35000",
    cost: "",
    stock: "",
    stock_minimum: "",
    image_url: "",
    banner_url: "",
    delivery_time: "1 a 2 días hábiles",
    requires_advance: "si",
    active: "si",
  },
  {
    internal_code: "MEN-001",
    barcode: "",
    name: "Menú restaurante 1 página",
    item_type: "servicio",
    category_name: "Menús restaurante",
    short_description: "Diseño de menú sencillo imprimible",
    long_description: "Diseño de carta o menú de restaurante por página, listo para impresión.",
    price_type: "desde",
    price: "60000",
    cost: "",
    stock: "",
    stock_minimum: "",
    image_url: "",
    banner_url: "",
    delivery_time: "2 a 3 días hábiles",
    requires_advance: "si",
    active: "si",
  },
  {
    internal_code: "FOTO-001",
    barcode: "",
    name: "Restauración básica de foto antigua",
    item_type: "servicio",
    category_name: "Restauración fotográfica",
    short_description: "Limpieza leve y mejora general de fotografía",
    long_description: "Mejora de color, brillo, contraste y nitidez para fotos antiguas o deterioradas.",
    price_type: "desde",
    price: "30000",
    cost: "",
    stock: "",
    stock_minimum: "",
    image_url: "",
    banner_url: "",
    delivery_time: "1 a 3 días hábiles",
    requires_advance: "si",
    active: "si",
  },
];

function normalizeBoolean(value: string) {
  const normalized = value.trim().toLowerCase();
  return ["si", "sí", "true", "1", "activo", "activa"].includes(normalized);
}

function csvEscape(value: string | number | null | undefined) {
  const text = String(value ?? "");
  if (text.includes(",") || text.includes("\"") || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === "\"" && insideQuotes && nextChar === "\"") {
      current += "\"";
      index += 1;
    } else if (char === "\"") {
      insideQuotes = !insideQuotes;
    } else if (char === "," && !insideQuotes) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current);
  return values.map((value) => value.trim());
}

function parseCsv(text: string): ImportRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((header) => header.trim());
  const rows: ImportRow[] = [];

  lines.slice(1).forEach((line) => {
    const values = parseCsvLine(line);
    const row = Object.fromEntries(
      headers.map((header, index) => [header, values[index] || ""])
    ) as ImportRow;

    rows.push({
      internal_code: row.internal_code || "",
      barcode: row.barcode || "",
      name: row.name || "",
      item_type: row.item_type || "servicio",
      category_name: row.category_name || "",
      short_description: row.short_description || "",
      long_description: row.long_description || "",
      price_type: row.price_type || "fijo",
      price: row.price || "",
      cost: row.cost || "",
      stock: row.stock || "",
      stock_minimum: row.stock_minimum || "",
      image_url: row.image_url || "",
      banner_url: row.banner_url || "",
      delivery_time: row.delivery_time || "",
      requires_advance: row.requires_advance || "no",
      active: row.active || "si",
    });
  });

  return rows;
}

const emptyForm: FormState = {
  internal_code: "",
  barcode: "",
  name: "",
  item_type: "servicio",
  category_id: "",
  short_description: "",
  long_description: "",
  price_type: "fijo",
  price: "",
  cost: "",
  stock: "",
  stock_minimum: "",
  image_url: "",
  banner_url: "",
  delivery_time: "",
  requires_advance: false,
  active: true,
};

function money(value: number | null | undefined) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function cleanText(value: string) {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function toNumber(value: string) {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function toInteger(value: string) {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : Math.trunc(parsed);
}

export default function CatalogoPage() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [newCategoryName, setNewCategoryName] = useState("");

  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importPreview, setImportPreview] = useState<ImportRow[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);


  async function loadData() {
    setLoading(true);

    const [catalogResult, categoriesResult] = await Promise.all([
      supabase
        .from("catalog_items")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("categories")
        .select("*")
        .order("name", { ascending: true }),
    ]);

    if (catalogResult.error) {
      alert("No se pudo cargar el catálogo: " + catalogResult.error.message);
    } else {
      setItems((catalogResult.data || []) as CatalogItem[]);
    }

    if (categoriesResult.error) {
      alert("No se pudieron cargar las categorías: " + categoriesResult.error.message);
    } else {
      setCategories((categoriesResult.data || []) as Category[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((category) => map.set(category.id, category.name));
    return map;
  }, [categories]);

  const filteredItems = useMemo(() => {
    const term = search.toLowerCase().trim();

    return items.filter((item) => {
      const categoryName = item.category_id ? categoryMap.get(item.category_id) || "" : "";

      const matchesSearch =
        term === "" ||
        item.name.toLowerCase().includes(term) ||
        item.internal_code.toLowerCase().includes(term) ||
        (item.short_description || "").toLowerCase().includes(term) ||
        categoryName.toLowerCase().includes(term);

      const matchesType =
        typeFilter === "todos" || item.item_type === typeFilter;

      const matchesStatus =
        statusFilter === "todos" ||
        (statusFilter === "activos" && item.active !== false) ||
        (statusFilter === "inactivos" && item.active === false);

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [items, search, typeFilter, statusFilter, categoryMap]);

  const totalActivos = items.filter((item) => item.active !== false).length;
  const totalInactivos = items.filter((item) => item.active === false).length;

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  function editItem(item: CatalogItem) {
    setEditingId(item.id);
    setForm({
      internal_code: item.internal_code || "",
      barcode: item.barcode || "",
      name: item.name || "",
      item_type: item.item_type || "servicio",
      category_id: item.category_id || "",
      short_description: item.short_description || "",
      long_description: item.long_description || "",
      price_type: item.price_type || "fijo",
      price: item.price === null || item.price === undefined ? "" : String(item.price),
      cost: item.cost === null || item.cost === undefined ? "" : String(item.cost),
      stock: item.stock === null || item.stock === undefined ? "" : String(item.stock),
      stock_minimum:
        item.stock_minimum === null || item.stock_minimum === undefined
          ? ""
          : String(item.stock_minimum),
      image_url: item.image_url || "",
      banner_url: item.banner_url || "",
      delivery_time: item.delivery_time || "",
      requires_advance: Boolean(item.requires_advance),
      active: item.active !== false,
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.internal_code.trim()) {
      alert("El código interno es obligatorio.");
      return;
    }

    if (!form.name.trim()) {
      alert("El nombre es obligatorio.");
      return;
    }

    setSaving(true);

    const payload = {
      internal_code: form.internal_code.trim(),
      barcode: cleanText(form.barcode),
      name: form.name.trim(),
      item_type: form.item_type,
      category_id: form.category_id || null,
      short_description: cleanText(form.short_description),
      long_description: cleanText(form.long_description),
      price_type: form.price_type,
      price: toNumber(form.price),
      cost: toNumber(form.cost),
      stock: toInteger(form.stock),
      stock_minimum: toInteger(form.stock_minimum),
      image_url: cleanText(form.image_url),
      banner_url: cleanText(form.banner_url),
      delivery_time: cleanText(form.delivery_time),
      requires_advance: form.requires_advance,
      active: form.active,
      updated_at: new Date().toISOString(),
    };

    const result = editingId
      ? await supabase.from("catalog_items").update(payload).eq("id", editingId)
      : await supabase.from("catalog_items").insert(payload);

    setSaving(false);

    if (result.error) {
      alert("No se pudo guardar el producto/servicio: " + result.error.message);
      return;
    }

    resetForm();
    await loadData();
  }

  async function deleteItem(id: string) {
    const ok = confirm("¿Seguro que deseas eliminar este registro del catálogo?");
    if (!ok) return;

    const result = await supabase.from("catalog_items").delete().eq("id", id);

    if (result.error) {
      alert("No se pudo eliminar: " + result.error.message);
      return;
    }

    await loadData();
  }

  async function toggleActive(item: CatalogItem) {
    const result = await supabase
      .from("catalog_items")
      .update({
        active: item.active === false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id);

    if (result.error) {
      alert("No se pudo cambiar el estado: " + result.error.message);
      return;
    }

    await loadData();
  }


  function downloadTemplate() {
    const csv = [
      importColumns.join(","),
      ...templateRows.map((row) =>
        importColumns.map((column) => csvEscape(row[column as keyof ImportRow])).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "plantilla_catalogo_mendoza.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function validateImportRows(rows: ImportRow[]) {
    const errors: string[] = [];
    const allowedTypes = ["servicio", "digital", "producto", "programa"];
    const allowedPriceTypes = ["fijo", "desde", "personalizado"];
    const seenCodes = new Set<string>();

    rows.forEach((row, index) => {
      const line = index + 2;
      const code = row.internal_code.trim();

      if (!code) errors.push(`Fila ${line}: el código interno es obligatorio.`);
      if (!row.name.trim()) errors.push(`Fila ${line}: el nombre es obligatorio.`);

      if (code && seenCodes.has(code)) {
        errors.push(`Fila ${line}: el código interno ${code} está repetido en el archivo.`);
      }
      seenCodes.add(code);

      if (!allowedTypes.includes(row.item_type.trim().toLowerCase())) {
        errors.push(`Fila ${line}: el tipo debe ser servicio, digital, producto o programa.`);
      }

      if (!allowedPriceTypes.includes(row.price_type.trim().toLowerCase())) {
        errors.push(`Fila ${line}: el tipo de precio debe ser fijo, desde o personalizado.`);
      }

      if (row.price.trim() && Number.isNaN(Number(row.price))) {
        errors.push(`Fila ${line}: el precio debe ser numérico.`);
      }

      if (row.cost.trim() && Number.isNaN(Number(row.cost))) {
        errors.push(`Fila ${line}: el costo debe ser numérico.`);
      }

      if (row.stock.trim() && Number.isNaN(Number(row.stock))) {
        errors.push(`Fila ${line}: el stock debe ser numérico.`);
      }

      if (row.stock_minimum.trim() && Number.isNaN(Number(row.stock_minimum))) {
        errors.push(`Fila ${line}: el stock mínimo debe ser numérico.`);
      }
    });

    return errors;
  }

  function handleImportFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      const content = String(reader.result || "");
      const rows = parseCsv(content);
      const errors = validateImportRows(rows);

      setImportText(content);
      setImportPreview(rows);
      setImportErrors(errors);

      if (rows.length === 0) {
        setImportErrors(["El archivo no contiene registros para importar."]);
      }
    };

    reader.readAsText(file, "utf-8");
  }

  async function importCatalog() {
    if (importPreview.length === 0) {
      alert("Primero carga un archivo CSV con registros.");
      return;
    }

    const errors = validateImportRows(importPreview);
    setImportErrors(errors);

    if (errors.length > 0) {
      alert("Corrige los errores antes de importar.");
      return;
    }

    setImporting(true);

    const categoryNames = Array.from(
      new Set(
        importPreview
          .map((row) => row.category_name.trim())
          .filter(Boolean)
      )
    );

    const categoryNameToId = new Map(
      categories.map((category) => [category.name.trim().toLowerCase(), category.id])
    );

    for (const categoryName of categoryNames) {
      const key = categoryName.toLowerCase();

      if (!categoryNameToId.has(key)) {
        const result = await supabase
          .from("categories")
          .insert({
            name: categoryName,
            description: null,
            active: true,
          })
          .select("id")
          .single();

        if (result.error) {
          setImporting(false);
          alert(`No se pudo crear la categoría ${categoryName}: ${result.error.message}`);
          return;
        }

        categoryNameToId.set(key, result.data.id);
      }
    }

    const payload = importPreview.map((row) => ({
      internal_code: row.internal_code.trim(),
      barcode: cleanText(row.barcode),
      name: row.name.trim(),
      item_type: row.item_type.trim().toLowerCase(),
      category_id: row.category_name.trim()
        ? categoryNameToId.get(row.category_name.trim().toLowerCase()) || null
        : null,
      short_description: cleanText(row.short_description),
      long_description: cleanText(row.long_description),
      price_type: row.price_type.trim().toLowerCase(),
      price: toNumber(row.price),
      cost: toNumber(row.cost),
      stock: toInteger(row.stock),
      stock_minimum: toInteger(row.stock_minimum),
      image_url: cleanText(row.image_url),
      banner_url: cleanText(row.banner_url),
      delivery_time: cleanText(row.delivery_time),
      requires_advance: normalizeBoolean(row.requires_advance),
      active: row.active.trim() === "" ? true : normalizeBoolean(row.active),
      updated_at: new Date().toISOString(),
    }));

    const result = await supabase.from("catalog_items").insert(payload);

    setImporting(false);

    if (result.error) {
      alert("No se pudo importar el catálogo: " + result.error.message);
      return;
    }

    setImportText("");
    setImportPreview([]);
    setImportErrors([]);
    setImportOpen(false);
    await loadData();
    alert(`${payload.length} registro(s) importados correctamente.`);
  }

  async function createCategory() {
    const name = newCategoryName.trim();

    if (!name) {
      alert("Escribe el nombre de la categoría.");
      return;
    }

    const result = await supabase.from("categories").insert({
      name,
      description: null,
      active: true,
    });

    if (result.error) {
      alert("No se pudo crear la categoría: " + result.error.message);
      return;
    }

    setNewCategoryName("");
    await loadData();
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-6">
      <section className="mx-auto w-full max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.35em] text-teal-700">
              Mendoza Manager
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
              Catálogo
            </h1>
            <p className="mt-3 text-lg font-semibold text-slate-600">
              Productos, servicios y programas comerciales.
            </p>
          </div>

          <button
            type="button"
            onClick={loadData}
            className="rounded-2xl border border-teal-200 bg-teal-50 px-6 py-4 font-black text-slate-900 transition hover:bg-teal-100"
          >
            Actualizar
          </button>
        </header>

        <section className="rounded-3xl border border-teal-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-teal-700">
                Carga rápida
              </p>
              <h2 className="mt-2 text-2xl font-black">Importar catálogo masivamente</h2>
              <p className="mt-2 font-semibold text-slate-500">
                Sube un archivo CSV para crear varios productos o servicios sin eliminar el registro manual.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={downloadTemplate}
                className="rounded-2xl border border-teal-200 bg-teal-50 px-5 py-3 font-black text-slate-900 transition hover:bg-teal-100"
              >
                Descargar plantilla CSV
              </button>

              <button
                type="button"
                onClick={() => setImportOpen(!importOpen)}
                className="rounded-2xl bg-slate-950 px-5 py-3 font-black text-white transition hover:bg-teal-800"
              >
                {importOpen ? "Ocultar importación" : "Importar catálogo"}
              </button>
            </div>
          </div>

          {importOpen && (
            <div className="mt-6 space-y-5 rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="grid gap-4 lg:grid-cols-3">
                <label className="space-y-2 lg:col-span-2">
                  <span className="text-sm font-black text-slate-700">
                    Archivo CSV
                  </span>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleImportFile}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold outline-none focus:border-teal-500"
                  />
                </label>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-bold text-slate-500">Registros detectados</p>
                  <p className="mt-2 text-3xl font-black">{importPreview.length}</p>
                </div>
              </div>

              {importErrors.length > 0 && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                  <p className="font-black text-red-700">Errores encontrados</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm font-semibold text-red-700">
                    {importErrors.map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {importPreview.length > 0 && (
                <div className="space-y-4">
                  <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                    <table className="w-full min-w-[900px] border-collapse text-left">
                      <thead>
                        <tr className="bg-teal-50 text-xs uppercase text-slate-700">
                          <th className="px-4 py-3 font-black">Código</th>
                          <th className="px-4 py-3 font-black">Nombre</th>
                          <th className="px-4 py-3 font-black">Tipo</th>
                          <th className="px-4 py-3 font-black">Categoría</th>
                          <th className="px-4 py-3 font-black">Precio</th>
                          <th className="px-4 py-3 font-black">Entrega</th>
                        </tr>
                      </thead>

                      <tbody>
                        {importPreview.slice(0, 10).map((row, index) => (
                          <tr key={`${row.internal_code}-${index}`} className="border-t border-slate-100">
                            <td className="px-4 py-3 font-black">{row.internal_code}</td>
                            <td className="px-4 py-3 font-semibold">{row.name}</td>
                            <td className="px-4 py-3 font-semibold">{row.item_type}</td>
                            <td className="px-4 py-3 font-semibold">{row.category_name || "Sin categoría"}</td>
                            <td className="px-4 py-3 font-black">{money(toNumber(row.price))}</td>
                            <td className="px-4 py-3 font-semibold">{row.delivery_time || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {importPreview.length > 10 && (
                    <p className="text-sm font-bold text-slate-500">
                      Vista previa de los primeros 10 registros.
                    </p>
                  )}

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={importCatalog}
                      disabled={importing || importErrors.length > 0}
                      className="rounded-2xl bg-teal-700 px-6 py-4 font-black text-white transition hover:bg-teal-800 disabled:opacity-50"
                    >
                      {importing ? "Importando..." : "Confirmar importación"}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setImportText("");
                        setImportPreview([]);
                        setImportErrors([]);
                      }}
                      className="rounded-2xl border border-slate-300 px-6 py-4 font-black text-slate-700 transition hover:bg-slate-100"
                    >
                      Limpiar archivo
                    </button>
                  </div>
                </div>
              )}

              {importText && importPreview.length === 0 && importErrors.length === 0 && (
                <p className="font-bold text-slate-500">
                  El archivo fue leído, pero no se encontraron filas válidas.
                </p>
              )}
            </div>
          )}
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-bold text-slate-500">Total registros</p>
            <p className="mt-2 text-3xl font-black">{items.length}</p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-bold text-slate-500">Activos</p>
            <p className="mt-2 text-3xl font-black text-emerald-700">{totalActivos}</p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-bold text-slate-500">Inactivos</p>
            <p className="mt-2 text-3xl font-black text-slate-500">{totalInactivos}</p>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-col gap-2">
            <h2 className="text-2xl font-black">
              {editingId ? "Editar registro" : "Nuevo registro"}
            </h2>
            <p className="font-semibold text-slate-500">
              Registra productos, servicios digitales, programas o paquetes.
            </p>
          </div>

          <form onSubmit={saveItem} className="grid gap-4 md:grid-cols-4">
            <label className="space-y-2">
              <span className="text-sm font-black text-slate-700">Código interno *</span>
              <input
                value={form.internal_code}
                onChange={(event) =>
                  setForm({ ...form, internal_code: event.target.value })
                }
                placeholder="SV-WEB-001"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-teal-500"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-black text-slate-700">Nombre *</span>
              <input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="Diseño de brochure"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-teal-500"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-black text-slate-700">Tipo</span>
              <select
                value={form.item_type}
                onChange={(event) =>
                  setForm({ ...form, item_type: event.target.value })
                }
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-teal-500"
              >
                <option value="servicio">Servicio</option>
                <option value="digital">Digital</option>
                <option value="producto">Producto</option>
                <option value="programa">Programa</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-black text-slate-700">Categoría</span>
              <select
                value={form.category_id}
                onChange={(event) =>
                  setForm({ ...form, category_id: event.target.value })
                }
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-teal-500"
              >
                <option value="">Sin categoría</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-black text-slate-700">Tipo de precio</span>
              <select
                value={form.price_type}
                onChange={(event) =>
                  setForm({ ...form, price_type: event.target.value })
                }
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-teal-500"
              >
                <option value="fijo">Fijo</option>
                <option value="desde">Desde</option>
                <option value="personalizado">Personalizado</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-black text-slate-700">Precio</span>
              <input
                type="number"
                value={form.price}
                onChange={(event) => setForm({ ...form, price: event.target.value })}
                placeholder="150000"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-teal-500"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-black text-slate-700">Costo</span>
              <input
                type="number"
                value={form.cost}
                onChange={(event) => setForm({ ...form, cost: event.target.value })}
                placeholder="50000"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-teal-500"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-black text-slate-700">Stock</span>
              <input
                type="number"
                value={form.stock}
                onChange={(event) => setForm({ ...form, stock: event.target.value })}
                placeholder="0"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-teal-500"
              />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-black text-slate-700">
                Descripción corta
              </span>
              <input
                value={form.short_description}
                onChange={(event) =>
                  setForm({ ...form, short_description: event.target.value })
                }
                placeholder="Descripción para cotizaciones y ventas"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-teal-500"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-black text-slate-700">Tiempo de entrega</span>
              <input
                value={form.delivery_time}
                onChange={(event) =>
                  setForm({ ...form, delivery_time: event.target.value })
                }
                placeholder="3 días hábiles"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-teal-500"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-black text-slate-700">Stock mínimo</span>
              <input
                type="number"
                value={form.stock_minimum}
                onChange={(event) =>
                  setForm({ ...form, stock_minimum: event.target.value })
                }
                placeholder="0"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-teal-500"
              />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-black text-slate-700">URL imagen</span>
              <input
                value={form.image_url}
                onChange={(event) =>
                  setForm({ ...form, image_url: event.target.value })
                }
                placeholder="https://..."
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-teal-500"
              />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-black text-slate-700">URL banner</span>
              <input
                value={form.banner_url}
                onChange={(event) =>
                  setForm({ ...form, banner_url: event.target.value })
                }
                placeholder="https://..."
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-teal-500"
              />
            </label>

            <label className="space-y-2 md:col-span-4">
              <span className="text-sm font-black text-slate-700">
                Descripción larga
              </span>
              <textarea
                value={form.long_description}
                onChange={(event) =>
                  setForm({ ...form, long_description: event.target.value })
                }
                placeholder="Información detallada del producto, servicio o programa."
                rows={3}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-teal-500"
              />
            </label>

            <div className="flex flex-wrap gap-4 md:col-span-4">
              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 font-bold">
                <input
                  type="checkbox"
                  checked={form.requires_advance}
                  onChange={(event) =>
                    setForm({ ...form, requires_advance: event.target.checked })
                  }
                />
                Requiere anticipo
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 font-bold">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(event) =>
                    setForm({ ...form, active: event.target.checked })
                  }
                />
                Activo
              </label>
            </div>

            <div className="flex flex-wrap gap-3 md:col-span-4">
              <button
                type="submit"
                disabled={saving}
                className="rounded-2xl bg-slate-950 px-6 py-4 font-black text-white transition hover:bg-teal-800 disabled:opacity-50"
              >
                {saving ? "Guardando..." : editingId ? "Actualizar registro" : "Guardar registro"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-2xl border border-slate-300 px-6 py-4 font-black text-slate-700 transition hover:bg-slate-100"
                >
                  Cancelar edición
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black">Categorías</h2>

          <div className="mt-4 flex flex-col gap-3 md:flex-row">
            <input
              value={newCategoryName}
              onChange={(event) => setNewCategoryName(event.target.value)}
              placeholder="Nueva categoría"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-teal-500 md:max-w-md"
            />

            <button
              type="button"
              onClick={createCategory}
              className="rounded-2xl bg-teal-700 px-6 py-3 font-black text-white transition hover:bg-teal-800"
            >
              Crear categoría
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {categories.map((category) => (
              <span
                key={category.id}
                className="rounded-full border border-teal-100 bg-teal-50 px-4 py-2 text-sm font-black text-teal-800"
              >
                {category.name}
              </span>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-2xl font-black">Listado del catálogo</h2>
                <p className="mt-1 font-semibold text-slate-500">
                  {filteredItems.length} registro(s) encontrados.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar..."
                  className="rounded-2xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-teal-500"
                />

                <select
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value)}
                  className="rounded-2xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-teal-500"
                >
                  <option value="todos">Todos los tipos</option>
                  <option value="servicio">Servicio</option>
                  <option value="digital">Digital</option>
                  <option value="producto">Producto</option>
                  <option value="programa">Programa</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="rounded-2xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-teal-500"
                >
                  <option value="todos">Todos</option>
                  <option value="activos">Activos</option>
                  <option value="inactivos">Inactivos</option>
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center font-black text-slate-500">
              Cargando catálogo...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-8 text-center font-black text-slate-500">
              No hay registros para mostrar.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] border-collapse text-left">
                <thead>
                  <tr className="bg-teal-50 text-sm uppercase text-slate-700">
                    <th className="px-5 py-4 font-black">Código</th>
                    <th className="px-5 py-4 font-black">Nombre</th>
                    <th className="px-5 py-4 font-black">Tipo</th>
                    <th className="px-5 py-4 font-black">Categoría</th>
                    <th className="px-5 py-4 font-black">Precio</th>
                    <th className="px-5 py-4 font-black">Stock</th>
                    <th className="px-5 py-4 font-black">Estado</th>
                    <th className="px-5 py-4 font-black">Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="border-t border-slate-100 align-top">
                      <td className="px-5 py-4 font-black text-slate-700">
                        {item.internal_code}
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-black text-slate-900">{item.name}</p>
                        <p className="mt-1 max-w-md text-sm font-semibold text-slate-500">
                          {item.short_description || "Sin descripción corta"}
                        </p>
                        {item.requires_advance && (
                          <span className="mt-2 inline-block rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
                            Requiere anticipo
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase text-slate-700">
                          {item.item_type}
                        </span>
                      </td>

                      <td className="px-5 py-4 font-bold text-slate-600">
                        {item.category_id
                          ? categoryMap.get(item.category_id) || "Sin nombre"
                          : "Sin categoría"}
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-black">{money(item.price)}</p>
                        <p className="text-xs font-bold uppercase text-slate-400">
                          {item.price_type}
                        </p>
                      </td>

                      <td className="px-5 py-4 font-bold">
                        {item.stock ?? "—"}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={
                            item.active === false
                              ? "rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600"
                              : "rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700"
                          }
                        >
                          {item.active === false ? "Inactivo" : "Activo"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => editItem(item)}
                            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-black hover:bg-slate-100"
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleActive(item)}
                            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-black hover:bg-slate-100"
                          >
                            {item.active === false ? "Activar" : "Inactivar"}
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteItem(item.id)}
                            className="rounded-xl border border-red-200 px-3 py-2 text-sm font-black text-red-700 hover:bg-red-50"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
