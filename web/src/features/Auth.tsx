import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useI18n } from "../core/i18n";
import { supabase } from "../core/supabase";
import { AppBar } from "../components/ui";

// Email + password sign-in / sign-up (replaces phone-OTP). Supabase email auth
// needs no external SMS provider. After auth, a new user (no profile row yet)
// goes to Profile Setup; a returning user goes Home.
export function Auth() {
  const { t } = useI18n();
  const nav = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const valid = /\S+@\S+\.\S+/.test(email) && password.length >= 6;

  const routeAfterAuth = async (userId: string) => {
    const { data: profile } = await supabase
      .from("users")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    nav(profile ? "/home" : "/profile-setup", { replace: true });
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        // If email confirmation is enabled, no session is returned yet.
        if (!data.session) {
          setNotice(
            "Account created. If email confirmation is on, confirm via the link — or disable it in Supabase Auth to log in instantly.",
          );
          setMode("signin");
          return;
        }
        await routeAfterAuth(data.user!.id);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await routeAfterAuth(data.user!.id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <AppBar title="" back />
      <div className="screen" style={{ display: "flex", flexDirection: "column" }}>
        <h2>{t("auth_title")}</h2>

        <div className="field" style={{ marginTop: 24 }}>
          <label>{t("email")}</label>
          <input
            className="input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
        <div className="field">
          <label>{t("password")}</label>
          <input
            className="input"
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
          />
        </div>

        {error && <p style={{ color: "var(--red)" }}>{error}</p>}
        {notice && <p style={{ color: "var(--green)" }}>{notice}</p>}

        <button className="btn btn-primary" disabled={!valid || busy} onClick={submit}>
          {busy ? "…" : mode === "signup" ? t("create_account") : t("sign_in")}
        </button>

        <button
          className="btn-text"
          style={{ marginTop: 12, alignSelf: "center" }}
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
            setNotice(null);
          }}
        >
          {mode === "signin" ? t("toggle_to_signup") : t("toggle_to_signin")}
        </button>
      </div>
    </>
  );
}
