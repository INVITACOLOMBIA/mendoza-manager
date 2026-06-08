"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/clientes", label: "Clientes" },
  { href: "/prospectos", label: "Prospectos" },
  { href: "/catalogo", label: "Catálogo" },
  { href: "/cotizaciones", label: "Cotizaciones" },
  { href: "/facturacion", label: "Facturación" },
  { href: "/pagos", label: "Pagos" },
  { href: "/cuentas-cobro", label: "Cuentas de cobro" },
  { href: "/ordenes", label: "Órdenes" },
  { href: "/calendario", label: "Calendario" },
  { href: "/tareas", label: "Tareas" },
  { href: "/documentos", label: "Documentos" },
  { href: "/configuracion", label: "Configuración" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside style={{
      width: 280,
      minHeight: "100vh",
      background: "#FFFFFF",
      borderRight: "1px solid #D8E8E5",
      padding: 20,
      position: "sticky",
      top: 0
    }}>
      <div style={{
        background: "#0B1F33",
        color: "#FFFFFF",
        borderRadius: 24,
        padding: 20,
        marginBottom: 24
      }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: "#9FE8DD", letterSpacing: 3 }}>
          SISTEMA
        </p>
        <h2 style={{ margin: "8px 0 0", fontSize: 24, fontWeight: 900 }}>
          Mendoza Manager
        </h2>
      </div>

      <nav style={{ display: "grid", gap: 8 }}>
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              style={{
                textDecoration: "none",
                padding: "12px 14px",
                borderRadius: 16,
                fontWeight: 800,
                color: active ? "#0F766E" : "#34495E",
                background: active ? "#DDF4F2" : "transparent"
              }}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={logout}
        style={{
          marginTop: 20,
          width: "100%",
          border: "1px solid #F4C7C7",
          background: "#FDE2E5",
          color: "#B42318",
          borderRadius: 16,
          padding: "12px 14px",
          fontWeight: 900,
          cursor: "pointer"
        }}
      >
        Cerrar sesión
      </button>
    </aside>
  );
}
