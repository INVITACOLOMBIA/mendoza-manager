"use client";

import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
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
  { href: "/ordenes", label: "Órdenes" },
  { href: "/calendario", label: "Calendario" },
  { href: "/tareas", label: "Tareas" },
  { href: "/documentos", label: "Documentos" },
  { href: "/configuracion", label: "Configuración" },
];

export default function AuthGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/login";

  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      const { data } = await supabase.auth.getSession();
      const hasSession = Boolean(data.session);

      if (!mounted) return;

      setAuthenticated(hasSession);
      setLoading(false);

      if (!hasSession && !isLoginPage) {
        router.replace("/login");
      }

      if (hasSession && isLoginPage) {
        router.replace("/");
      }
    }

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const hasSession = Boolean(session);

      setAuthenticated(hasSession);

      if (!hasSession && !isLoginPage) {
        router.replace("/login");
      }

      if (hasSession && isLoginPage) {
        router.replace("/");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [isLoginPage, router]);

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#020617",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 900,
        }}
      >
        Cargando Mendoza Manager...
      </div>
    );
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (!authenticated) {
    return null;
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc" }}>
      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 999999,
          backgroundColor: "#020617",
          borderBottom: "1px solid #1e293b",
          boxShadow: "0 8px 24px rgba(15, 23, 42, 0.22)",
        }}
      >
        <div
          style={{
            minHeight: "74px",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            padding: "12px 22px",
          }}
        >
          <div style={{ minWidth: "190px" }}>
            <p
              style={{
                margin: 0,
                fontSize: "11px",
                fontWeight: 900,
                letterSpacing: "0.28em",
                color: "#5eead4",
                textTransform: "uppercase",
              }}
            >
              Mendoza
            </p>

            <h1
              style={{
                margin: "4px 0 0 0",
                fontSize: "22px",
                fontWeight: 900,
                color: "#ffffff",
              }}
            >
              Manager
            </h1>
          </div>

          <nav
            style={{
              display: "flex",
              gap: "8px",
              overflowX: "auto",
              flex: 1,
              paddingBottom: "4px",
            }}
          >
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
                    whiteSpace: "nowrap",
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "10px 14px",
                    borderRadius: "999px",
                    textDecoration: "none",
                    fontSize: "14px",
                    fontWeight: 900,
                    backgroundColor: active ? "#2dd4bf" : "#0f172a",
                    color: active ? "#020617" : "#cbd5e1",
                    border: active ? "1px solid #2dd4bf" : "1px solid #1e293b",
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={logout}
            style={{
              minWidth: "120px",
              padding: "11px 14px",
              borderRadius: "999px",
              border: "1px solid #7f1d1d",
              backgroundColor: "#7f1d1d",
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Salir
          </button>
        </div>
      </header>

      <div style={{ paddingTop: "88px" }}>
        {children}
      </div>
    </div>
  );
}
