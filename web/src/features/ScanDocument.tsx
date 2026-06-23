import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "../core/supabase";
import { insertDocument, uploadDocumentImage } from "../data/queries";
import { AppBar } from "../components/ui";
import { DOC_TYPES } from "../models/types";

// DW-04 Camera Scan + DW-05 Review. The plan uses Google Vision OCR; until that
// Edge Function is wired up, we capture the photo and let the user confirm the
// details on a review form, then save the row + upload the image to Storage.
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

  const onPick = (f: File | null) => {
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
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
      if (file) await uploadDocumentImage(uid, docId, file);
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

        {preview && (
          <button className="btn-text" style={{ margin: "8px auto 0", display: "block" }} onClick={() => fileRef.current?.click()}>
            Retake / choose another
          </button>
        )}

        <h3 style={{ marginTop: 20 }}>Confirm details</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          Check the details below and correct anything before saving.
        </p>

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
