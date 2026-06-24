import { useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { supabase } from "../core/supabase";
import { runOcr, type OcrResult } from "../core/ocr";
import { insertDocument, uploadDocumentImage } from "../data/queries";
import { AppBar } from "../components/ui";
import { DOC_TYPES, docTypeMeta } from "../models/types";

// DW-04 Camera Scan + DW-05 Review. Free, on-device OCR (Tesseract.js) reads
// the photo and pre-fills the form (Section 6.3 post-processing, no API key);
// the user confirms before saving. No data leaves the browser during OCR.
const EXPIRING_TYPES = new Set(["passport", "driving_license", "health_card", "other"]);

export function ScanDocument() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  // "camera" forces the rear camera; "gallery" opens the photo picker (no capture).
  const useCamera = params.get("mode") !== "gallery";
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const [docType, setDocType] = useState("aadhaar");
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [dob, setDob] = useState("");
  const [expiry, setExpiry] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // OCR state
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanNote, setScanNote] = useState<string | null>(null);
  const [ocr, setOcr] = useState<OcrResult | null>(null);

  const onPick = async (f: File | null) => {
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
    setScanNote(null);
    setOcr(null);
    if (!f) return;

    // Read the document on-device and pre-fill what we can. OCR is optional:
    // it must never block adding the document, so cap it with a timeout (the
    // Tesseract engine loads from a CDN and could be slow/blocked).
    setScanning(true);
    setScanProgress(0);
    try {
      const timeout = new Promise<never>((_, rej) =>
        setTimeout(() => rej(new Error("ocr-timeout")), 60000),
      );
      const r = await Promise.race([runOcr(f, setScanProgress), timeout]);
      setOcr(r);
      if (r.docType) setDocType(r.docType);
      if (r.number) setNumber(r.number);
      if (r.name) setName(r.name);
      if (r.dob) setDob(r.dob);
      if (r.expiry) setExpiry(r.expiry);
      const got = [r.docType && "type", r.number && "ID number", r.name && "name", r.dob && "DOB", r.expiry && "expiry"]
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
        dob_on_doc: dob || null,
        expiry_date: EXPIRING_TYPES.has(docType) && expiry ? expiry : null,
        source: "camera_scan",
      });
      // The document is saved at this point (and the health score recomputes
      // via DB trigger). Image upload is a bonus — never block the save on it.
      if (file) await uploadDocumentImage(uid, docId, file).catch(() => undefined);
      nav("/documents", { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  };

  return (
    <>
      <AppBar title={useCamera ? "Scan Document" : "Upload Document"} back />
      <div className="screen">
        {/* `capture` only for camera mode; gallery mode opens the photo picker. */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture={useCamera ? "environment" : undefined}
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
              <div className="muted">{useCamera ? "Tap to take a photo" : "Tap to choose a photo"}</div>
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

        {ocr && <ExtractedPanel ocr={ocr} />}

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
        <div className="field">
          <label>Date of birth (optional)</label>
          <input className="input" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
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

// Shows exactly what the on-device OCR read: the detected fields and the raw
// recognised text, so the user can verify before confirming (DW-05).
function ExtractedPanel({ ocr }: { ocr: OcrResult }) {
  const rows: [string, string][] = [];
  if (ocr.docType) rows.push(["Detected type", docTypeMeta(ocr.docType).label]);
  if (ocr.number) rows.push(["ID number", ocr.number]);
  if (ocr.name) rows.push(["Name", ocr.name]);
  if (ocr.dob) rows.push(["Date of birth", ocr.dob]);
  if (ocr.expiry) rows.push(["Expiry", ocr.expiry]);

  return (
    <div className="card" style={{ marginBottom: 16, background: "color-mix(in srgb, var(--navy) 5%, white)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong>What we read from the image</strong>
        <span className="pill" style={{ color: "var(--navy)", background: "color-mix(in srgb, var(--navy) 12%, white)" }}>
          {Math.round(ocr.confidence * 100)}% confidence
        </span>
      </div>

      {rows.length > 0 ? (
        <div style={{ marginTop: 10 }}>
          {rows.map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
              <span className="muted">{k}</span>
              <strong>{v}</strong>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted" style={{ margin: "8px 0 0" }}>
          No structured fields detected — type them in below.
        </p>
      )}

      {ocr.rawText.trim() && (
        <details style={{ marginTop: 10 }}>
          <summary style={{ cursor: "pointer", color: "var(--navy)", fontWeight: 600 }}>
            Show raw extracted text
          </summary>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              fontSize: 12,
              color: "var(--text-secondary)",
              background: "var(--bg)",
              borderRadius: 8,
              padding: 10,
              marginTop: 8,
              maxHeight: 180,
              overflow: "auto",
            }}
          >
            {ocr.rawText.trim()}
          </pre>
        </details>
      )}
    </div>
  );
}
