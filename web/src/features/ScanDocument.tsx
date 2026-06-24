import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "../core/supabase";
import { runOcr } from "../core/ocr";
import { insertDocument, uploadDocumentImage } from "../data/queries";
import { AppBar } from "../components/ui";
import { DOC_TYPES } from "../models/types";

// DW-04 Camera Scan + DW-05 Review. Free, on-device OCR (Tesseract.js) reads
// the photo and pre-fills the form (Section 6.3 post-processing, no API key);
// the user confirms before saving. No data leaves the browser during OCR.
const EXPIRING_TYPES = new Set(["passport", "driving_license", "health_card"]);

export function ScanDocument() {
  const nav = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const [docType, setDocType] = useState("aadhaar");
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // OCR state
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanNote, setScanNote] = useState<string | null>(null);

  const onPick = async (f: File | null) => {
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
    setScanNote(null);
    if (!f) return;

    // Read the document on-device and pre-fill what we can. OCR is optional:
    // it must never block adding the document, so cap it with a timeout (the
    // Tesseract engine loads from a CDN and could be slow/blocked).
    setScanning(true);
    setScanProgress(0);
    try {
      const timeout = new Promise<never>((_, rej) =>
        setTimeout(() => rej(new Error("ocr-timeout")), 25000),
      );
      const r = await Promise.race([runOcr(f, setScanProgress), timeout]);
      if (r.docType) setDocType(r.docType);
      if (r.number) setNumber(r.number);
      if (r.name) setName(r.name);
      if (r.expiry) setExpiry(r.expiry);
      const got = [r.docType && "type", r.number && "ID number", r.name && "name", r.expiry && "expiry"]
        .filter(Boolean)
        .join(", ");
      setScanNote(
        got
          ? `Auto-filled: ${got}. Please check and correct before saving.`
          : "Couldn't read the details clearly — please enter them below.",
      );
    } catch {
      setScanNote("Couldn't read the image — please enter the details below.");
    } finally {
      setScanning(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) {
      setError("Not signed in");
      setSaving(false);
      return;
    }
    try {
      const docId = await insertDocument({
        user_id: uid,
        doc_type: docType,
        doc_number: number.trim() || null,
        full_name_on_doc: name.trim(),
        expiry_date: EXPIRING_TYPES.has(docType) && expiry ? expiry : null,
        source: "camera_scan",
      });
      if (file) {
        const up = await uploadDocumentImage(uid, docId, file);
        if (!up.ok) {
          // Document row is saved; only the image failed (usually because the
          // Storage bucket isn't set up). Tell the user instead of failing.
          const hint = /bucket|not found|exist/i.test(up.error ?? "")
            ? " The 'documents' storage bucket isn't set up yet — run supabase/storage.sql."
            : "";
          setError(`Document saved, but the image couldn't be uploaded: ${up.error}.${hint}`);
          setSaving(false);
          return;
        }
      }
      nav("/documents", { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  };

  return (
    <>
      <AppBar title="Scan Document" back />
      <div className="screen">
        {/* Capture / upload (camera on mobile, file picker on desktop) */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: "none" }}
          onChange={(e) => onPick(e.target.files?.[0] ?? null)}
        />

        <div
          className="card center"
          style={{ height: 200, cursor: "pointer", overflow: "hidden", padding: 0 }}
          onClick={() => fileRef.current?.click()}
        >
          {preview ? (
            <img src={preview} alt="Document" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 48 }}>📷</div>
              <div className="muted">Tap to take a photo or upload</div>
            </div>
          )}
        </div>

        {preview && !scanning && (
          <button className="btn-text" style={{ margin: "8px auto 0", display: "block" }} onClick={() => fileRef.current?.click()}>
            Retake / choose another
          </button>
        )}

        {scanning && (
          <div className="card" style={{ marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong>Reading document…</strong>
              <span className="muted">{Math.round(scanProgress * 100)}%</span>
            </div>
            <div style={{ height: 8, background: "var(--border)", borderRadius: 4, marginTop: 8, overflow: "hidden" }}>
              <div style={{ width: `${scanProgress * 100}%`, height: "100%", background: "var(--navy)", transition: "width 0.2s" }} />
            </div>
          </div>
        )}

        <h3 style={{ marginTop: 20 }}>Confirm details</h3>
        {scanNote ? (
          <p className="muted" style={{ marginTop: 0 }}>{scanNote}</p>
        ) : (
          <p className="muted" style={{ marginTop: 0 }}>
            Check the details below and correct anything before saving.
          </p>
        )}

        <div className="field">
          <label>Document type</label>
          <select className="input" value={docType} onChange={(e) => setDocType(e.target.value)}>
            {DOC_TYPES.map((d) => (
              <option key={d.wire} value={d.wire}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Name on document</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label>ID number (optional)</label>
          <input className="input" value={number} onChange={(e) => setNumber(e.target.value)} />
        </div>
        {EXPIRING_TYPES.has(docType) && (
          <div className="field">
            <label>Expiry date</label>
            <input className="input" type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
          </div>
        )}

        {error && <p style={{ color: "var(--red)" }}>{error}</p>}
        <button className="btn btn-primary" disabled={!name.trim() || saving} onClick={save}>
          {saving ? "Saving…" : "Confirm & Save"}
        </button>
      </div>
    </>
  );
}
