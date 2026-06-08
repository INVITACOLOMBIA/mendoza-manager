"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function login(event: FormEvent) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setMessage("No se pudo iniciar sesión: " + error.message);
      setLoading(false);
      return;
    }

    router.push("/");
  }

  return (
    <main style={{
      minHeight: "100vh",
      background: "#F4FBFA",
      display: "grid",
      placeItems: "center",
      color: "#0B1F33",
      padding: 24,
    }}>
      <form
        onSubmit={login}
        style={{
          width: "100%",
          maxWidth: 440,
          background: "#FFFFFF",
          border: "1px solid #D8E8E5",
          borderRadius: 32,
          padding: 32,
          boxShadow: "0 20px 50px rgba(11,31,51,.08)",
        }}
      >
        <p style={{ margin: 0, color: "#0F766E", fontWeight: 900, letterSpacing: 4 }}>
          ACCESO SEGURO
        </p>

        <h1 style={{ margin: "12px 0", fontSize: 38, fontWeight: 900 }}>
          Mendoza Manager
        </h1>

        <p style={{ margin: "0 0 24px", color: "#5D7485", fontWeight: 700 }}>
          Ingresa con tu usuario administrador.
        </p>

        {message && (
          <div style={{
            background: "#FDE2E5",
            border: "1px solid #F4C7C7",
            color: "#B42318",
            borderRadius: 16,
            padding: 14,
            marginBottom: 18,
            fontWeight: 800,
          }}>
            {message}
          </div>
        )}

        <label style={{ fontWeight: 900 }}>
          Correo
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
            placeholder="correo@ejemplo.com"
          />
        </label>

        <label style={{ display: "block", marginTop: 16, fontWeight: 900 }}>
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
            placeholder="Tu contraseña"
          />
        </label>

        <button
          disabled={loading}
          style={{
            width: "100%",
            marginTop: 24,
            border: "1px solid #0B1F33",
            background: "#0B1F33",
            color: "#FFFFFF",
            borderRadius: 16,
            padding: "14px 18px",
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
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
