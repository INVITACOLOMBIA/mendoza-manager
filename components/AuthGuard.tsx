"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkSession() {
      if (pathname === "/login") {
        setChecking(false);
        return;
      }

      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        router.push("/login");
        return;
      }

      setChecking(false);
    }

    checkSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session && pathname !== "/login") {
        router.push("/login");
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [pathname, router]);

  if (checking) {
    return (
      <main style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#F4FBFA",
        color: "#0B1F33",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}>
        <div style={{
          background: "#FFFFFF",
          border: "1px solid #D8E8E5",
          borderRadius: 28,
          padding: 32,
          fontWeight: 900,
        }}>
          Cargando Mendoza Manager...
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
