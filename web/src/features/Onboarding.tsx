import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useI18n, hasChosenLanguage } from "../core/i18n";
import { supabase } from "../core/supabase";
import { useAuth } from "../data/useAuth";
import { AppBar } from "../components/ui";

// OB-01 Splash — brand moment + auth-state check (Section 3.1).
export function Splash() {
  const nav = useNavigate();
  const { session, loading } = useAuth();
  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => {
      if (session) nav("/home", { replace: true });
      else nav(hasChosenLanguage() ? "/login" : "/language", { replace: true });
    }, 900);
    return () => clearTimeout(t);
  }, [loading, session, nav]);

  return (
    <div className="center" style={{ flex: 1, flexDirection: "column", background: "var(--navy)", color: "#fff", gap: 12 }}>
      <div style={{ fontSize: 72 }}>🛡️</div>
      <h1 style={{ color: "#fff", fontSize: 34 }}>DrDocs</h1>
      <span style={{ opacity: 0.8 }}>Documents, sorted.</span>
    </div>
  );
}

// OB-02 Language Select — choice persisted to local storage.
export function Language() {
  const { setLang } = useI18n();
  const nav = useNavigate();
  const choose = (l: "en" | "hi") => {
    setLang(l);
    nav("/welcome");
  };
  return (
    <div className="screen center" style={{ flexDirection: "column", gap: 16 }}>
      <h2 style={{ marginBottom: 12 }}>Choose your language / अपनी भाषा चुनें</h2>
      <button className="btn btn-outline" style={{ maxWidth: 320 }} onClick={() => choose("en")}>
        🇬🇧 &nbsp; English
      </button>
      <button className="btn btn-outline" style={{ maxWidth: 320 }} onClick={() => choose("hi")}>
        🇮🇳 &nbsp; हिन्दी
      </button>
    </div>
  );
}

// OB-03 Welcome Carousel — 3 slides + Skip.
export function Welcome() {
  const { t } = useI18n();
  const nav = useNavigate();
  const [page, setPage] = useState(0);
  const slides = [
    { icon: "📄", title: t("welcome_1_title"), body: t("welcome_1_body") },
    { icon: "🔔", title: t("welcome_2_title"), body: t("welcome_2_body") },
    { icon: "🏠", title: t("welcome_3_title"), body: t("welcome_3_body") },
  ];
  const next = () => (page < 2 ? setPage(page + 1) : nav("/login"));

  return (
    <div className="screen" style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ textAlign: "right" }}>
        <button className="btn-text" onClick={() => nav("/login")}>
          {t("skip")}
        </button>
      </div>
      <div className="center" style={{ flex: 1, flexDirection: "column", textAlign: "center", padding: 24 }}>
        <div style={{ fontSize: 96 }}>{slides[page].icon}</div>
        <h2 style={{ marginTop: 24 }}>{slides[page].title}</h2>
        <p className="muted" style={{ fontSize: 16 }}>
          {slides[page].body}
        </p>
      </div>
      <div className="center" style={{ gap: 6, marginBottom: 16 }}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: i === page ? 24 : 8,
              height: 8,
              borderRadius: 4,
              background: i === page ? "var(--navy)" : "var(--border)",
              transition: "width 0.2s",
            }}
          />
        ))}
      </div>
      <button className="btn btn-primary" onClick={next}>
        {page === 2 ? t("get_started") : t("continue")}
      </button>
    </div>
  );
}

// OB-06 Profile Setup — create the users row with a generated referral code.
// Email-based: stores the account email (phone is optional since 0011).
export function ProfileSetup() {
  const { t } = useI18n();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [city, setCity] = useState("Gurgaon");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const referralCode = (n: string) => {
    const prefix = n.replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 4) || "DV";
    return prefix + (Math.floor(Math.random() * 9000) + 1000);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;
    if (!user) {
      setError("Session expired. Please sign in again.");
      setSaving(false);
      return;
    }
    const { error } = await supabase.from("users").insert({
      user_id: user.id,
      email: user.email ?? null,
      phone: user.phone ? user.phone.replace(/^91/, "") : null,
      full_name: name.trim(),
      dob,
      city,
      referral_code: referralCode(name),
    });
    setSaving(false);
    if (error) setError(error.message);
    else nav("/home", { replace: true });
  };

  const valid = name.trim().length > 0 && dob.length > 0;

  return (
    <>
      <AppBar title={t("profile_title")} />
      <div className="screen" style={{ display: "flex", flexDirection: "column" }}>
        <div className="field">
          <label>{t("full_name")}</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label>{t("dob")}</label>
          <input className="input" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
        </div>
        <div className="field">
          <label>{t("city")}</label>
          <select className="input" value={city} onChange={(e) => setCity(e.target.value)}>
            {["Gurgaon", "Delhi", "Noida", "Faridabad", "Other"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        {error && <p style={{ color: "var(--red)" }}>{error}</p>}
        <span style={{ flex: 1 }} />
        <button className="btn btn-primary" disabled={!valid || saving} onClick={save}>
          {saving ? "…" : t("continue")}
        </button>
      </div>
    </>
  );
}
