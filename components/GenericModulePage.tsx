"use client";

import { useEffect, useMemo, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";

type Row = Record<string, any>;

function formatValue(value: any) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export default function GenericModulePage({
  title,
  subtitle,
  table,
}: {
  title: string;
  subtitle: string;
  table: string;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadData() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from(table)
      .select("*")
      .limit(100);

    if (error) {
      setMessage(error.message);
      setRows([]);
    } else {
      setRows((data ?? []) as Row[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [table]);

  const columns = useMemo(() => {
    const first = rows[0] ?? {};
    return Object.keys(first).slice(0, 8);
  }, [rows]);

  return (
    <main style={{ display: "flex", minHeight: "100vh", background: "#F4FBFA", color: "#0B1F33" }}>
      <Sidebar />

      <section style={{ flex: 1, padding: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", marginBottom: 28 }}>
          <div>
            <p style={{ margin: 0, color: "#0F766E", fontWeight: 900, letterSpacing: 3, fontSize: 13 }}>
              MENDOZA MANAGER
            </p>
            <h1 style={{ margin: "8px 0", fontSize: 42, fontWeight: 900, color: "#0B1F33" }}>
              {title}
            </h1>
            <p style={{ margin: 0, color: "#5D7485", fontWeight: 600 }}>
              {subtitle}
            </p>
          </div>

          <button
            onClick={loadData}
            style={{
              border: "1px solid #BFE8E2",
              background: "#EAF8F5",
              borderRadius: 16,
              padding: "12px 18px",
              fontWeight: 900,
              color: "#0B1F33"
            }}
          >
            {loading ? "Cargando..." : "Actualizar"}
          </button>
        </div>

        {message && (
          <div style={{
            background: "#FDE2E5",
            border: "1px solid #F4C7C7",
            color: "#B42318",
            borderRadius: 20,
            padding: 16,
            marginBottom: 20,
            fontWeight: 800
          }}>
            {message}
          </div>
        )}

        <div style={{
          background: "#FFFFFF",
          border: "1px solid #D8E8E5",
          borderRadius: 28,
          overflow: "hidden"
        }}>
          <div style={{ padding: 20, borderBottom: "1px solid #D8E8E5", fontWeight: 900 }}>
            {rows.length} registro(s)
          </div>

          {rows.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", minWidth: 900, borderCollapse: "collapse" }}>
                <thead style={{ background: "#EAF8F5" }}>
                  <tr>
                    {columns.map((column) => (
                      <th key={column} style={{ padding: 14, textAlign: "left", color: "#0B1F33", fontSize: 13 }}>
                        {column.replaceAll("_", " ").toUpperCase()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={row.id ?? index} style={{ borderTop: "1px solid #D8E8E5" }}>
                      {columns.map((column) => (
                        <td key={column} style={{ padding: 14, color: "#34495E", fontSize: 14 }}>
                          {formatValue(row[column])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: 40, textAlign: "center", color: "#5D7485", fontWeight: 700 }}>
              No hay registros para mostrar.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
