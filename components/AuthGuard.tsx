"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const menuItems = [
  { href: "/", label: "Dashboard" },
  { href: "/clientes", label: "Clientes" },
  { href: "/prospectos", label: "Prospectos" },
  { href: "/catalogo", label: "Catálogo" },
  { href: "/cotizaciones", label: "Cotizaciones" },
  { href: "/facturacion", label: "Facturación" },
  { href: "/pagos", label: "Pagos" },
  { href: "/cuentas-cobro", label: "Cuentas de cobro" },
  { href: "/ordenes", label: "Órdenes de trabajo" },
  { href: "/calendario", label: "Calendario" },
  { href: "/tareas", label: "Tareas" },
  { href: "/documentos", label: "Documentos" },
  { href: "/configuracion", label: "Configuración" },
];

export default function AuthGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc" }}>
      <aside
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
          width: "288px",
          backgroundColor: "#020617",
          color: "#ffffff",
          zIndex: 999999,
          display: "flex",
          flexDirection: "column",
          borderRight: "1px solid #1e293b",
          boxShadow: "0 20px 40px rgba(15, 23, 42, 0.35)",
        }}
      >
        <div style={{ padding: "24px", borderBottom: "1px solid #1e293b" }}>
          <p
            style={{
              margin: 0,
              fontSize: "12px",
              fontWeight: 900,
              letterSpacing: "0.35em",
              textTransform: "uppercase",
              color: "#5eead4",
            }}
          >
            Mendoza
          </p>

          <h1
            style={{
              margin: "8px 0 0 0",
              fontSize: "28px",
              fontWeight: 900,
              color: "#ffffff",
            }}
          >
            Manager
          </h1>

          <p
            style={{
              margin: "8px 0 0 0",
              fontSize: "14px",
              fontWeight: 700,
              color: "#94a3b8",
            }}
          >
            Gestión comercial y operativa
          </p>
        </div>

        <nav style={{ flex: 1, overflowY: "auto", padding: "18px 14px" }}>
          {menuItems.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "block",
                  marginBottom: "6px",
                  padding: "13px 16px",
                  borderRadius: "16px",
                  textDecoration: "none",
                  fontSize: "15px",
                  fontWeight: 900,
                  backgroundColor: active ? "#2dd4bf" : "transparent",
                  color: active ? "#020617" : "#cbd5e1",
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: "16px", borderTop: "1px solid #1e293b" }}>
          <button
            type="button"
            onClick={logout}
            style={{
              width: "100%",
              padding: "13px 16px",
              borderRadius: "16px",
              border: "none",
              backgroundColor: "#7f1d1d",
              color: "#ffffff",
              fontSize: "15px",
              fontWeight: 900,
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main style={{ minHeight: "100vh", marginLeft: "288px" }}>
        {children}
      </main>
    </div>
  );
}
