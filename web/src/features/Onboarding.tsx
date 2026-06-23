import { useEffect, useRef, useState } from "react";
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
      else nav(hasChosenLanguage() ? "/phone" : "/language", { replace: true });
    }, 900);
    return () => clearTimeout(t);
  }, [loading, session, nav]);

  return (
    <div className="center" style={{ flex: 1, flexDirection: "column", background: "var(--navy)", color: "#fff", gap: 12 }}>
      <div style={{ fontSize: 72 }}>🛡️</div>
      <h1 style={{ color: "#fff", fontSize: 34 }}>DocVault</h1>
      <span style={{ opacity: 0.8 }}>by Dr.Docs</span>
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
  const next = () => (page < 2 ? setPage(page + 1) : nav("/phone"));

  return (
    <div className="screen" style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ textAlign: "right" }}>
        <button className="btn-text" onClick={() => nav("/phone")}>
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

// OB-04 Phone Number Entry — 10-digit India number, sends OTP via Supabase Auth.
export function Phone() {
  const { t } = useI18n();
  const nav = useNavigate();
  const [phone, setPhone] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = /^[0-9]{10}$/.test(phone) && agreed;

  const send = async () => {
    setSending(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({ phone: `+91${phone}` });
    setSending(false);
    if (error) setError(error.message);
    else nav(`/otp?phone=${phone}`);
  };

  return (
    <>
      <AppBar title="" back />
      <div className="screen" style={{ display: "flex", flexDirection: "column" }}>
        <h2>{t("phone_title")}</h2>
        <div className="field" style={{ marginTop: 24 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <span className="input" style={{ width: 64, display: "flex", alignItems: "center" }}>
              +91
            </span>
            <input
              className="input"
              inputMode="numeric"
              maxLength={10}
              placeholder={t("phone_hint")}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
            />
          </div>
        </div>
        <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }} className="muted">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
          {t("tnc")}
        </label>
        {error && <p style={{ color: "var(--red)" }}>{error}</p>}
        <span style={{ flex: 1 }} />
        <button className="btn btn-primary" disabled={!valid || sending} onClick={send}>
          {sending ? "…" : t("send_otp")}
        </button>
      </div>
    </>
  );
}

// OB-05 OTP Verification — 6-digit entry, 60s resend timer, verify -> route.
export function Otp() {
  const { t } = useI18n();
  const nav = useNavigate();
  const phone = new URLSearchParams(window.location.search).get("phone") ?? "";
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const timer = useRef<number>();

  useEffect(() => {
    timer.current = window.setInterval(() => setSecondsLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => window.clearInterval(timer.current);
  }, []);

  const verify = async () => {
    setVerifying(true);
    setError(null);
    const { data, error } = await supabase.auth.verifyOtp({
      type: "sms",
      phone: `+91${phone}`,
      token: code,
    });
    if (error) {
      setError(error.message);
      setVerifying(false);
      return;
    }
    // New user (no profile row yet) -> profile setup, else -> home.
    const uid = data.user?.id;
    const { data: profile } = uid
      ? await supabase.from("users").select("user_id").eq("user_id", uid).maybeSingle()
      : { data: null };
    nav(profile ? "/home" : "/profile-setup", { replace: true });
  };

  const resend = async () => {
    await supabase.auth.signInWithOtp({ phone: `+91${phone}` });
    setSecondsLeft(60);
  };

  return (
    <>
      <AppBar title="" back />
      <div className="screen" style={{ display: "flex", flexDirection: "column" }}>
        <h2>{t("otp_title")}</h2>
        <p className="muted">
          {t("otp_sent")} +91 {phone}
        </p>
        <input
          className="input"
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          style={{ textAlign: "center", fontSize: 28, letterSpacing: 12, marginTop: 16 }}
          placeholder="••••••"
        />
        <div style={{ textAlign: "right", marginTop: 8 }}>
          {secondsLeft > 0 ? (
            <span className="muted">
              {t("resend_otp")} in {secondsLeft}s
            </span>
          ) : (
            <button className="btn-text" onClick={resend}>
              {t("resend_otp")}
            </button>
          )}
        </div>
        {error && <p style={{ color: "var(--red)" }}>{error}</p>}
        <span style={{ flex: 1 }} />
        <button className="btn btn-primary" disabled={code.length !== 6 || verifying} onClick={verify}>
          {verifying ? "…" : t("verify")}
        </button>
      </div>
    </>
  );
}

// OB-06 Profile Setup — create the users row with a generated referral code.
export function ProfileSetup() {
  const { t } = useI18n();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [city, setCity] = useState("Gurgaon");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const referralCode = (n: string) => {
    const prefix = (n.replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 4) || "DV");
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
      phone: (user.phone ?? "").replace(/^91/, ""),
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
