import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { useI18n } from "../core/i18n";
import {
  deleteDocument,
  fetchDocument,
  fetchDocuments,
  insertDocument,
} from "../data/queries";
import { supabase } from "../core/supabase";
import { useAsync } from "../data/useAsync";
import { DocumentCard } from "../components/cards";
import { AppBar, EmptyState, ErrorState, Skeleton } from "../components/ui";
import { DOC_TYPES, docTypeMeta } from "../models/types";
import type { DocCategory } from "../models/types";
import { formatDate, maskNumber, statusColor } from "../models/format";

const CATEGORY_TABS: { label: string; value: DocCategory | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Identity", value: "identity" },
  { label: "Travel", value: "travel" },
  { label: "Vehicle", value: "vehicle" },
  { label: "Education", value: "education" },
  { label: "Financial", value: "financial" },
  { label: "Health", value: "health" },
];

// DW-01 All Documents — master list with category tabs (Section 3.3).
export function AllDocuments() {
  const { t } = useI18n();
  const nav = useNavigate();
  const [filter, setFilter] = useState<DocCategory | "all">("all");
  const docs = useAsync(fetchDocuments, []);

  return (
    <>
      <AppBar title={t("all_documents")} />
      <div className="screen">
        <div className="chips">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.value}
              className={`chip ${filter === tab.value ? "active" : ""}`}
              onClick={() => setFilter(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {docs.loading ? (
          <Skeleton />
        ) : docs.error ? (
          <ErrorState error={docs.error} />
        ) : (
          (() => {
            const list = (docs.data ?? []).filter(
              (d) => filter === "all" || docTypeMeta(d.doc_type).category === filter,
            );
            if (list.length === 0)
              return (
                <EmptyState
                  icon="📂"
                  title={t("no_docs_title")}
                  message={t("no_docs_body")}
                  actionLabel={t("add_document")}
                  onAction={() => nav("/documents/add")}
                />
              );
            return list.map((d) => (
              <DocumentCard
                key={d.doc_id}
                doc={d}
                onOpen={() => nav(`/documents/${d.doc_id}`)}
                onRenew={() => nav("/services")}
              />
            ));
          })()
        )}
      </div>

      <button
        className="btn btn-primary"
        style={{ position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)", width: "auto", padding: "0 24px", maxWidth: 440 }}
        onClick={() => nav("/documents/add")}
      >
        + {t("add_document")}
      </button>
    </>
  );
}

// DW-02 Document Detail — full fields, masked ID, actions (Section 3.3).
export function DocumentDetail() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const doc = useAsync(() => fetchDocument(id), [id]);

  const remove = async () => {
    if (!confirm("Delete this document permanently?")) return;
    await deleteDocument(id);
    nav("/documents", { replace: true });
  };

  return (
    <>
      <AppBar title="Document" back action={<span className="lock">🔒</span>} />
      <div className="screen">
        {doc.loading ? (
          <Skeleton />
        ) : doc.error ? (
          <ErrorState error={doc.error} />
        ) : doc.data ? (
          (() => {
            const d = doc.data;
            const meta = docTypeMeta(d.doc_type);
            return (
              <>
                <div
                  className="card center"
                  style={{ height: 180, fontSize: 64, marginBottom: 16 }}
                >
                  {d.doc_image_url ? (
                    <img src={d.doc_image_url} alt={meta.label} style={{ maxHeight: "100%", borderRadius: 12 }} />
                  ) : (
                    meta.icon
                  )}
                </div>
                <h2>{meta.label}</h2>
                <Field label="ID Number" value={maskNumber(d.doc_number)} />
                <Field label="Name on Document" value={d.full_name_on_doc} />
                <Field label="Date of Birth" value={formatDate(d.dob_on_doc)} />
                <Field
                  label="Expiry"
                  value={d.expiry_date ? formatDate(d.expiry_date) : "No Expiry"}
                  color={statusColor[d.status]}
                />
                {d.issuing_authority && <Field label="Issuing Authority" value={d.issuing_authority} />}

                <div style={{ marginTop: 24 }}>
                  <button className="btn btn-primary" onClick={() => nav("/services")}>
                    Renew with Dr.Docs
                  </button>
                </div>
                <div className="btn-row" style={{ marginTop: 12 }}>
                  <button className="btn btn-outline">Share</button>
                  <button className="btn btn-outline" style={{ color: "var(--red)", borderColor: "var(--red)" }} onClick={remove}>
                    Delete
                  </button>
                </div>
              </>
            );
          })()
        ) : null}
      </div>
    </>
  );
}

function Field({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: "flex", padding: "8px 0", gap: 12 }}>
      <span className="muted" style={{ width: 150 }}>
        {label}
      </span>
      <strong style={{ color: color ?? "var(--text)" }}>{value}</strong>
    </div>
  );
}

// DW-03 Add Document — Method Select (Section 3.3).
export function AddDocument() {
  const nav = useNavigate();
  const methods = [
    { icon: "📷", title: "Scan with Camera", sub: "Point your camera — we read the details.", to: "/documents/scan" },
    { icon: "🖼️", title: "Upload from Gallery", sub: "Pick an existing photo.", to: "/documents/scan" },
    { icon: "🏛️", title: "Pull from DigiLocker", sub: "Import verified documents.", to: "/documents/digilocker" },
    { icon: "✍️", title: "Enter Manually", sub: "Type in the details yourself.", to: "/documents/manual" },
  ];
  return (
    <>
      <AppBar title="Add Document" back />
      <div className="screen">
        {methods.map((m) => (
          <div key={m.title} className="card" style={{ display: "flex", gap: 12, alignItems: "center", cursor: "pointer" }} onClick={() => nav(m.to)}>
            <span style={{ fontSize: 28 }}>{m.icon}</span>
            <div style={{ flex: 1 }}>
              <strong>{m.title}</strong>
              <p className="muted" style={{ margin: 0 }}>
                {m.sub}
              </p>
            </div>
            <span style={{ color: "var(--text-secondary)" }}>›</span>
          </div>
        ))}
      </div>
    </>
  );
}

// DW-07 Manual Entry — type selector + dynamic fields, saved to Supabase.
const EXPIRING_TYPES = new Set(["passport", "driving_license", "health_card"]);

export function ManualEntry() {
  const nav = useNavigate();
  const [docType, setDocType] = useState("aadhaar");
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      await insertDocument({
        user_id: uid,
        doc_type: docType,
        doc_number: number.trim() || null,
        full_name_on_doc: name.trim(),
        expiry_date: EXPIRING_TYPES.has(docType) && expiry ? expiry : null,
        source: "manual",
      });
      nav("/documents", { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  };

  return (
    <>
      <AppBar title="Enter Manually" back />
      <div className="screen">
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
          {saving ? "…" : "Save"}
        </button>
      </div>
    </>
  );
}
