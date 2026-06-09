"use client";

import Link from "next/link";
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

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <aside className="fixed left-0 top-0 z-[99999] flex h-screen w-72 flex-col border-r border-slate-800 bg-slate-950 text-white shadow-2xl">
      <div className="border-b border-slate-800 px-6 py-6">
        <p className="text-xs font-black uppercase tracking-[0.35em] text-teal-300">
          Mendoza
        </p>
        <h1 className="mt-2 text-2xl font-black tracking-tight">
          Manager
        </h1>
        <p className="mt-2 text-sm font-semibold text-slate-400">
          Gestión comercial y operativa
        </p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-5">
        {menuItems.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                active
                  ? "flex items-center rounded-2xl bg-teal-500 px-4 py-3 text-sm font-black text-slate-950"
                  : "flex items-center rounded-2xl px-4 py-3 text-sm font-bold text-slate-300 transition hover:bg-slate-800 hover:text-white"
              }
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 p-4">
        <button
          type="button"
          onClick={logout}
          className="w-full rounded-2xl bg-red-500/10 px-4 py-3 text-left text-sm font-black text-red-300 transition hover:bg-red-500 hover:text-white"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
