// Shown when VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set, so the
// app is reviewable without secrets and never crashes on a missing client.
export function ConfigNeeded() {
  return (
    <div className="app-frame">
      <div className="screen center" style={{ flexDirection: "column", textAlign: "center", gap: 12 }}>
        <div style={{ fontSize: 56 }}>🛡️</div>
        <h2>DocVault</h2>
        <p className="muted">Supabase is not configured.</p>
        <pre
          style={{
            textAlign: "left",
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: 16,
            fontSize: 13,
            overflowX: "auto",
            maxWidth: "100%",
          }}
        >{`# web/.env.local
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>`}</pre>
      </div>
    </div>
  );
}
