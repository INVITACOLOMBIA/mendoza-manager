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


function getInternalCodePrefix(itemType: string | null | undefined) {
  if (itemType === "fisico") return "PF";
  if (itemType === "digital") return "PD";
  return "SV";
}

function getNextInternalCode(itemType: string | null | undefined, items: Array<{ id?: string | null; internal_code?: string | null }> = [], editingId?: string | null) {
  const prefix = getInternalCodePrefix(itemType);
  const usedNumbers = items
    .filter((item) => item.id !== editingId)
    .map((item) => String(item.internal_code ?? "").trim().toUpperCase())
    .map((code) => {
      const match = code.match(new RegExp(`^${prefix}-(\\d{4})$`));
      return match ? Number(match[1]) : 0;
    });

  const nextNumber = Math.max(0, ...usedNumbers) + 1;
  return `${prefix}-${String(nextNumber).padStart(4, "0")}`;
}


function mmCatalogPrefix(itemType: string | null | undefined) {
  const value = String(itemType ?? "").toLowerCase();

  if (value.includes("digital")) return "PD";
  if (value.includes("fisico") || value.includes("físico") || value.includes("producto")) return "PF";
  if (value.includes("programa")) return "PG";
  if (value.includes("paquete")) return "PQ";

  return "SV";
}

function mmCatalogSlug(name: string | null | undefined) {
  const cleaned = String(name ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/Ñ/g, "N")
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 28);

  return cleaned || "ITEM";
}

function mmCatalogCode(
  itemType: string | null | undefined,
  name: string | null | undefined,
  items: Array<{ id?: string | null; internal_code?: string | null }> = [],
  editingId?: string | null
) {
  const prefix = mmCatalogPrefix(itemType);
  const namePart = mmCatalogSlug(name);
  const used = new Set(
    items
      .filter((item) => item.id !== editingId)
      .map((item) => String(item.internal_code ?? "").trim().toUpperCase())
  );

  for (let i = 0; i < 50; i += 1) {
    const candidate = `${prefix}-${namePart}-${Math.floor(10000 + Math.random() * 90000)}`;

    if (!used.has(candidate)) {
      return candidate;
    }
  }

  return `${prefix}-${namePart}-${Date.now().toString().slice(-5)}`;
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

    const internalCode = form.internal_code.trim() || mmCatalogCode(form.item_type, form.name, items, editingId);

    const payload = {
      internal_code: internalCode,
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
            onClick={() => {
                      setForm((current) => ({
                        ...current,
                        internal_code: mmCatalogCode(current.item_type, current.name, items, editingId),
                      }));
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#1AB7A6] bg-[#EAF8F5] px-4 py-3 text-sm font-black text-[#0B1F33] transition hover:bg-[#DDF4F2]"
                    title="Generar código interno"
                  >
                    
                    <span className="hidden sm:inline">Generar</span>
                  </button>
                </div>
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
