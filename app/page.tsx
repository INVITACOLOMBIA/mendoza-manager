"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";

const modules = [
  { href: "/clientes", label: "Clientes", table: "clients" },
  { href: "/prospectos", label: "Prospectos", table: "prospects" },
  { href: "/catalogo", label: "Catálogo", table: "catalog_items" },
  { href: "/cotizaciones", label: "Cotizaciones", table: "quotes" },
  { href: "/facturacion", label: "Facturación", table: "sales" },
  { href: "/pagos", label: "Pagos", table: "payments" },
  { href: "/cuentas-cobro", label: "Cuentas de cobro", table: "collection_accounts" },
  { href: "/ordenes", label: "Órdenes", table: "work_orders" },
  { href: "/calendario", label: "Calendario", table: "calendar_events" },
  { href: "/tareas", label: "Tareas", table: "tasks" },
  { href: "/documentos", label: "Documentos", table: "documents" },
  { href: "/configuracion", label: "Configuración", table: "business_settings" },
];

export default function Home() {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    async function load() {
      const next: Record<string, number> = {};

      for (const item of modules) {
        const { count } = await supabase
          .from(item.table)
          .select("*", { count: "exact", head: true });

        next[item.table] = count ?? 0;
      }

      setCounts(next);
    }

    load();
  }, []);

  return (
    <main style={{ display: "flex", minHeight: "100vh", background: "#F4FBFA", color: "#0B1F33" }}>
      <Sidebar />

      <section style={{ flex: 1, padding: 32 }}>
        <div style={{
          background: "#0B1F33",
          color: "#FFFFFF",
          borderRadius: 32,
          padding: 32,
          marginBottom: 28
        }}>
          <p style={{ margin: 0, color: "#9FE8DD", fontWeight: 900, letterSpacing: 4 }}>
            RECUPERACIÓN ACTIVA
          </p>
          <h1 style={{ margin: "12px 0", fontSize: 50, fontWeight: 900 }}>
            Mendoza Manager
          </h1>
          <p style={{ margin: 0, color: "rgba(255,255,255,.75)", fontWeight: 600 }}>
            Sistema reconstruido y conectado a Supabase.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {modules.map((item) => (
            <Link
              key={item.table}
              href={item.href}
              style={{
                textDecoration: "none",
                background: "#FFFFFF",
                padding: 24,
                borderRadius: 24,
                border: "1px solid #D8E8E5",
                color: "#0B1F33"
              }}
            >
              <p style={{ color: "#5D7485", fontWeight: 700 }}>{item.table}</p>
              <h2 style={{ color: "#0B1F33", fontSize: 22, fontWeight: 900 }}>{item.label}</h2>
              <strong style={{ fontSize: 34, color: "#0F766E" }}>
                {counts[item.table] ?? "—"}
              </strong>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
