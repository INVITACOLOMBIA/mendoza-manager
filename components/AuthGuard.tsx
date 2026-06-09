"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";

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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <p className="text-sm font-black uppercase tracking-[0.35em] text-teal-300">
            Mendoza Manager
          </p>
          <p className="mt-4 text-xl font-black">Cargando sistema...</p>
        </div>
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
    <div className="min-h-screen bg-slate-50">
      <Sidebar />

      <div className="min-h-screen pl-72">
        {children}
      </div>
    </div>
  );
}
