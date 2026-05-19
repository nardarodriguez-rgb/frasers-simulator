import React, { useState, useEffect, useRef } from "react";
import { LANGUAGES, T, GLOSSARY } from "./translations";

// ── Constants ────────────────────────────────────────────────────────────────
const ROLES = [
  { id: "contract_admin", icon: "📋", titleKey: "roleCATitle", descKey: "roleCADesc", steps: ["po","approval","inbox","assess","certificate","rcti","posting"], color: "#0070f2" },
  { id: "project_manager", icon: "🏗️", titleKey: "rolePMTitle", descKey: "rolePMDesc", steps: ["po","approval","assess","certificate"], color: "#107e3e" },
  { id: "finance",         icon: "💰", titleKey: "roleFinTitle", descKey: "roleFinDesc", steps: ["certificate","rcti","posting"], color: "#6a1b9a" },
  { id: "subcontractor",   icon: "🔨", titleKey: "roleSubTitle", descKey: "roleSubDesc", steps: ["inbox","assess","certificate","rcti"], color: "#e65100" },
];
const getRole = (r, t) => ({ ...r, title: t[r.titleKey]||r.titleKey, desc: t[r.descKey]||r.descKey });

const STAGE_IDS = ["po","approval","inbox","assess","certificate","rcti","posting"];
const STAGE_LABELS = ["Create PO","Attach & Approve","SAP Inbox","Assess Claim","Certificate","RCTI","SAP Posting"];
const STAGE_ICONS = ["📋","📎","📥","🔍","📄","🧾","📒"];

const EXPLAINERS = {
  po:          { icon: "📋", why: "This PO is now the single source of truth for this subcontract in SAP. All claims, retentions and payments will be tracked against it automatically.", what: "A Purchase Order (PO) is the formal agreement in SAP that authorises the subcontractor to carry out work. It defines the contract value, line items, WBS elements and retention terms." },
  approval:    { icon: "✅", why: "The approval workflow ensures the right people sign off before any money can be committed. Every approval is logged with a timestamp in SAP.", what: "Before work can begin, the PO must be approved by Contract Admin, Project Manager and Finance. Each approver receives a workflow notification in their SAP inbox." },
  inbox:       { icon: "📥", why: "SAP routes the claim directly to the Contract Admin inbox — no emails, no paper. The claim cannot be missed or lost.", what: "When a subcontractor submits a progress claim, it automatically creates a workflow notification in SAP and appears in the responsible Contract Admin's inbox as 'Service Entry Required'." },
  assess:      { icon: "🔍", why: "Retention and GST are calculated automatically — no spreadsheets, no manual formulas, eliminating calculation errors and disputes.", what: "The Contract Admin reviews the claim against the PO, enters the assessed (certified) value for each line item, and SAP calculates retention, after-retention, GST and total payment due automatically." },
  certificate: { icon: "📄", why: "The Payment Schedule is a legally binding document under the Security of Payment Act. SAP generates it instantly from your assessed values — no manual document creation.", what: "Once the claim is assessed and approved, SAP generates a formal Payment Schedule certificate showing the certified amount, retention withheld, GST and total payment due." },
  rcti:        { icon: "🧾", why: "Because this PO uses ERS, the subcontractor does NOT need to send an invoice. SAP creates it automatically — eliminating invoice disputes entirely.", what: "Under Evaluated Receipt Settlement (ERS), SAP auto-generates a Recipient Created Tax Invoice (RCTI) on behalf of the subcontractor. This replaces the need for a supplier invoice." },
  posting:     { icon: "📒", why: "Two accounting documents are created and linked automatically. Retention is held in Special G/L X until practical completion — no manual journal entries needed.", what: "SAP posts all accounting entries automatically: vendor payable, retention withheld (Special G/L X), GR/IR debit and GST input tax — all linked to the original PO." },
};

const LINE_ITEMS = [
  { line: 20, text: "Sewer - Stages 1-4", qty: 920917, wbs: "R-0024-80-04-006" },
  { line: 30, text: "Water - Stages 1-4", qty: 322143, wbs: "R-0024-80-04-006" },
  { line: 40, text: "Recycle Water - Stages 1-4", qty: 290079, wbs: "R-0024-80-04-009" },
  { line: 50, text: "Roads & Drainage - Stages 1-4", qty: 5940856, wbs: "R-0024-80-04-006" },
];
const VENDORS = [
  { code: "100051", name: "Mirobrick Pty Ltd", abn: "36 131 570 XXXX" },
  { code: "100042", name: "Buildcorp Pty Ltd", abn: "51 234 567 XXXX" },
  { code: "100063", name: "Civil Works Co", abn: "72 345 678 XXXX" },
  { code: "100078", name: "Infra Solutions Pty Ltd", abn: "83 456 789 XXXX" },
];
const RET_CODES = [
  { code: "R1", retPct: "10.00", maxPct: "5.00" },
  { code: "R2", retPct: "10.00", maxPct: "2.50" },
  { code: "R3", retPct: "10.00", maxPct: "10.00" },
  { code: "R4", retPct: "5.00",  maxPct: "5.00"  },
  { code: "R5", retPct: "2.50",  maxPct: "2.50"  },
  { code: "R6", retPct: "10.00", maxPct: "2.00"  },
];
const DEMO_CLAIM = { periodEnding: "15.05.2026", receivedDate: "15.05.2026", subRef: "TEST DEMO", frasersRef: "TEST DEMO 1" };
const DEMO_ASSESSED = { 20: "250000", 30: "0", 40: "0", 50: "0" };

const fmt = n => isNaN(n) ? "0.00" : Number(n).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pm  = v => parseFloat(String(v).replace(/[^0-9.]/g,"")) || 0;

// ── Fiori Design Tokens ───────────────────────────────────────────────────────
const F = {
  blue:      "#0070f2",
  blueHover: "#0057c2",
  green:     "#107e3e",
  shell:     "#354a5e",
  bg:        "#f7f7f7",
  white:     "#ffffff",
  border:    "#e5e5e5",
  text:      "#32363a",
  textMid:   "#6a6d70",
  textLight: "#89919a",
  shadow:    "0 2px 8px rgba(0,0,0,0.08)",
  shadowMd:  "0 4px 16px rgba(0,0,0,0.12)",
  radius:    8,
};

// ── Uncontrolled inputs ───────────────────────────────────────────────────────
function TextInput({ label, value, onChange, placeholder, error, required }) {
  const ref = useRef(null);
  const last = useRef(value);
  useEffect(() => {
    if (ref.current && document.activeElement !== ref.current && value !== last.current) {
      ref.current.value = value; last.current = value;
    }
  }, [value]);
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, color: error ? "#bb0000" : F.textMid, marginBottom: 4, fontWeight: 500 }}>{label}{required && <span style={{ color: "#bb0000" }}> *</span>}</div>
      <input ref={ref} type="text" defaultValue={value} placeholder={placeholder}
        onBlur={e => { last.current = e.target.value; onChange(e.target.value); }}
        style={{ width: "100%", fontSize: 13, padding: "7px 10px", border: `1px solid ${error ? "#bb0000" : "#ccc"}`, borderRadius: 4, boxSizing: "border-box", background: "white", color: F.text, outline: "none" }} />
      {error && <div style={{ fontSize: 11, color: "#bb0000", marginTop: 3 }}>{error}</div>}
    </div>
  );
}

function AssessInput({ value, onChange }) {
  const ref = useRef(null);
  const last = useRef(value);
  useEffect(() => {
    if (ref.current && document.activeElement !== ref.current && value !== last.current) {
      ref.current.value = value; last.current = value;
    }
  }, [value]);
  return (
    <input ref={ref} type="text" inputMode="numeric" defaultValue={value} placeholder="0"
      onBlur={e => { const c = e.target.value.replace(/[^0-9.]/g,""); ref.current.value = c; last.current = c; onChange(c); }}
      style={{ width: "100%", padding: "7px 10px", textAlign: "right", border: `2px solid ${F.blue}`, borderRadius: 4, fontSize: 13, fontWeight: 600, background: "#f0f6ff", color: F.text, outline: "none" }} />
  );
}

// ── Fiori Shell ───────────────────────────────────────────────────────────────
function FioriShell({ title, subtitle, lang, setLang, onBack, backLabel, rightSlot }) {
  return (
    <div style={{ background: F.shell, color: "white", height: 44, display: "flex", alignItems: "center", padding: "0 20px", gap: 12, flexShrink: 0, boxShadow: "0 2px 6px rgba(0,0,0,0.2)" }}>
      <div style={{ background: "white", borderRadius: 3, padding: "3px 7px", display: "flex", alignItems: "center", gap: 5, cursor: onBack ? "pointer" : "default" }} onClick={onBack}>
        <span style={{ fontWeight: 900, fontSize: 11, color: F.shell, letterSpacing: -0.5 }}>SAP</span>
      </div>
      <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.25)" }} />
      {onBack && <button onClick={onBack} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.7)", cursor: "pointer", fontSize: 12, padding: 0 }}>‹ {backLabel}</button>}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 400, letterSpacing: 0.1 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)" }}>{subtitle}</div>}
      </div>
      {rightSlot}
      <select value={lang} onChange={e => setLang(e.target.value)}
        style={{ padding: "3px 6px", fontSize: 11, border: "1px solid rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.1)", color: "white", borderRadius: 3, cursor: "pointer" }}>
        {LANGUAGES.map(l => <option key={l.code} value={l.code} style={{ background: F.shell }}>{l.flag} {l.label}</option>)}
      </select>
      <div style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>NR</div>
    </div>
  );
}

// ── Fiori Page Header ─────────────────────────────────────────────────────────
function PageHeader({ title, subtitle, actions }) {
  return (
    <div style={{ background: F.white, borderBottom: `1px solid ${F.border}`, padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 300, color: F.text, letterSpacing: 0.1 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: F.textMid, marginTop: 2 }}>{subtitle}</div>}
      </div>
      {actions && <div style={{ display: "flex", gap: 8 }}>{actions}</div>}
    </div>
  );
}

// ── Fiori Card ────────────────────────────────────────────────────────────────
function Card({ children, style, onClick, hoverable }) {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={onClick}
      onMouseEnter={() => hoverable && setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ background: F.white, border: `1px solid ${F.border}`, borderRadius: F.radius, boxShadow: hov ? F.shadowMd : F.shadow, transition: "all 0.15s", cursor: onClick ? "pointer" : "default", ...style }}>
      {children}
    </div>
  );
}

// ── Fiori Button ──────────────────────────────────────────────────────────────
function Btn({ label, onClick, primary, ghost, disabled, icon }) {
  const [hov, setHov] = useState(false);
  const bg = primary ? (hov ? F.blueHover : F.blue) : ghost ? "transparent" : (hov ? "#f0f0f0" : F.white);
  const color = primary ? "white" : F.blue;
  const border = primary ? "none" : `1px solid ${F.blue}`;
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ padding: "8px 18px", fontSize: 13, fontWeight: 500, cursor: disabled ? "not-allowed" : "pointer", borderRadius: 4, background: disabled ? "#e5e5e5" : bg, color: disabled ? "#aaa" : color, border, transition: "all 0.15s", display: "flex", alignItems: "center", gap: 6, opacity: disabled ? 0.7 : 1 }}>
      {icon && <span>{icon}</span>}{label}
    </button>
  );
}

// ── Context Panel ─────────────────────────────────────────────────────────────
function ContextPanel({ stageId, auditLog, t }) {
  const ex = {
    what: (t[`ex_what_${stageId}`] || EXPLAINERS[stageId]?.what || ""),
    why:  (t[`ex_why_${stageId}`]  || EXPLAINERS[stageId]?.why  || ""),
    icon: EXPLAINERS[stageId]?.icon || "📋",
  };
  return (
    <div style={{ width: 300, flexShrink: 0, display: "flex", flexDirection: "column", gap: 12 }}>
      {/* What & Why */}
      {ex && (
        <>
          <Card style={{ padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: F.textLight, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>{t.contextWhat||"WHAT IS HAPPENING"}</div>
            <div style={{ fontSize: 13, color: F.text, lineHeight: 1.65 }}>{ex.what}</div>
          </Card>
          <Card style={{ padding: 16, borderLeft: `3px solid ${F.blue}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: F.blue, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>{t.contextWhy||"WHY IT MATTERS"}</div>
            <div style={{ fontSize: 13, color: F.text, lineHeight: 1.65 }}>{ex.why}</div>
          </Card>
        </>
      )}
      {/* Audit trail */}
      {auditLog.length > 0 && (
        <Card style={{ padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: F.textLight, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>{t.contextAudit||"AUDIT TRAIL"}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {auditLog.map((entry, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: i === auditLog.length - 1 ? F.blue : "#c5e0a5", flexShrink: 0, marginTop: 5 }} />
                <div>
                  <div style={{ fontSize: 12, color: F.text, fontWeight: i === auditLog.length - 1 ? 600 : 400 }}>{entry.action}</div>
                  <div style={{ fontSize: 10, color: F.textLight }}>{entry.time} · {entry.user}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ── Progress Claims Explainer ─────────────────────────────────────────────────
function ProgressClaimsExplainer({ t }) {
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return (
    <div style={{ marginBottom: 16 }}>
      <button onClick={() => setDismissed(false)} style={{ fontSize: 12, color: F.blue, background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}>ℹ️ {t.exDismissed || "What are progress claims?"}</button>
    </div>
  );
  const tiles = [
    { icon: "🏗️", title: t.exWhatTitle, color: F.blue, text: expanded ? t.exWhatDetail : t.exWhatSummary },
    { icon: "⚖️", title: t.exWhyTitle, color: F.green, text: expanded ? t.exWhyDetail : t.exWhySummary },
    { icon: "⚙️", title: t.exSapTitle, color: "#e65100", text: expanded ? t.exSapDetail : t.exSapSummary },
  ];
  return (
    <Card style={{ marginBottom: 20, overflow: "hidden" }}>
      <div style={{ background: "#f0f6ff", borderBottom: `1px solid #d0e4ff`, padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, background: F.blue, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>📋</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: F.text }}>{t.exTitle || "What are Progress Claims?"}</div>
            <div style={{ fontSize: 11, color: F.textMid }}>{t.exSubtitle || "Understanding the process before you start"}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn label={expanded ? (t.exShowLess||"Show less ↑") : (t.exLearnMore||"Learn more ↓")} onClick={() => setExpanded(!expanded)} />
          <Btn label={t.exGotIt||"Got it ✓"} onClick={() => setDismissed(true)} />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}>
        {tiles.map((tile, i) => (
          <div key={i} style={{ padding: "16px 18px", borderRight: i < 2 ? `1px solid ${F.border}` : "none", borderTop: `1px solid ${F.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{ width: 26, height: 26, borderRadius: 5, background: `${tile.color}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>{tile.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: tile.color }}>{tile.title}</div>
            </div>
            <div style={{ fontSize: 12, color: F.text, lineHeight: 1.6 }}>{tile.text}</div>
          </div>
        ))}
      </div>
      {expanded && (
        <div style={{ borderTop: `1px solid ${F.border}`, background: "#fafafa", padding: "14px 20px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: F.textLight, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>{t.exKeyFacts||"Key Facts"}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10 }}>
            {[["10 days", t.exFactDays],["ERS", t.exFactERS],["Ret. %", t.exFactRet],["Spl. G/L X", t.exFactGL],["2 docs", t.exFactDocs],["SOP Act", t.exFactSOP]].map(([stat, label], i) => (
              <div key={i} style={{ background: F.white, border: `1px solid ${F.border}`, borderRadius: 6, padding: "10px 12px" }}>
                <div style={{ fontSize: 15, fontWeight: 900, color: F.blue, marginBottom: 3 }}>{stat}</div>
                <div style={{ fontSize: 10, color: F.textMid, lineHeight: 1.4 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [lang, setLang] = useState("en");
  const [simMode, setSimMode] = useState("demo");
  const [screen, setScreen] = useState("welcome");
  const [role, setRole] = useState(null);
  const [stage, setStage] = useState("po");
  const [completed, setCompleted] = useState([]);
  const [errors, setErrors] = useState({});
  const [feedback, setFeedback] = useState("");
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [showRetModal, setShowRetModal] = useState(false);
  const [showGlossary, setShowGlossary] = useState(false);
  const [vendorSearch, setVendorSearch] = useState("");
  const [toast, setToast] = useState(null);
  const [auditLog, setAuditLog] = useState([]);
  const [poData, setPoData] = useState({ vendor: null, retCode: null, docDate: "15.05.2026" });
  const [lineItems, setLineItems] = useState(LINE_ITEMS.map(l => ({ ...l, price: l.qty.toString() })));
  const [claim, setClaim] = useState({ periodEnding: "", receivedDate: "", subRef: "", frasersRef: "" });
  const [assessed, setAssessed] = useState({ 20: "", 30: "", 40: "", 50: "" });

  const t = T[lang] || T.en;
  const activeStages = role ? ROLES.find(r => r.id === role)?.steps || STAGE_IDS : STAGE_IDS;

  const now = () => new Date().toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" });
  const addLog = (action) => setAuditLog(prev => [...prev, { action, time: now(), user: "NRODRIGU" }]);

  const go = (s) => {
    const ex = EXPLAINERS[stage];
    if (ex && s !== stage) {
      setToast(stage);
      addLog(`${STAGE_LABELS[STAGE_IDS.indexOf(stage)]} completed`);
      setTimeout(() => setToast(null), 3000);
    }
    setStage(s); setFeedback(""); setErrors({});
    if (!completed.includes(s)) setCompleted(p => [...p, s]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const reset = () => {
    setScreen("welcome"); setRole(null); setSimMode("demo");
    setStage("po"); setCompleted([]); setErrors({}); setFeedback("");
    setPoData({ vendor: null, retCode: null, docDate: "15.05.2026" });
    setLineItems(LINE_ITEMS.map(l => ({ ...l, price: l.qty.toString() })));
    setClaim({ periodEnding: "", receivedDate: "", subRef: "", frasersRef: "" });
    setAssessed({ 20: "", 30: "", 40: "", 50: "" });
    setAuditLog([]); setToast(null);
  };

  const startSim = () => {
    const r = role || "contract_admin"; setRole(r);
    const firstStep = ROLES.find(x => x.id === r)?.steps[0] || "po";
    setStage(firstStep);
    if (simMode === "demo") {
      setClaim(DEMO_CLAIM); setAssessed(DEMO_ASSESSED);
      setPoData({ vendor: VENDORS[0], retCode: RET_CODES[0], docDate: "15.05.2026" });
      setCompleted([]);
      addLog("Demo session started");
    } else {
      addLog("Practice session started");
    }
    setScreen("sim");
  };

  const tc = () => lineItems.reduce((a, l) => a + pm(l.price), 0);
  const ta = () => Object.values(assessed).reduce((a, v) => a + pm(v||"0"), 0);
  const ret = () => ta() * 0.1;
  const ar = () => ta() - ret();
  const gst = () => ar() * 0.1;
  const pd = () => ar() + gst();

  const validatePO = () => {
    const e = {};
    if (!poData.vendor) e.vendor = "Please select a vendor";
    if (!poData.retCode) e.retCode = "Please select a retention code";
    lineItems.forEach(l => { if (pm(l.price) === 0) e[`p${l.line}`] = "Required"; });
    setErrors(e); return Object.keys(e).length === 0;
  };
  const validateAssess = () => {
    const e = {};
    if (!claim.periodEnding) e.periodEnding = "Required";
    if (!claim.receivedDate) e.receivedDate = "Required";
    if (!claim.subRef) e.subRef = "Required";
    if (!claim.frasersRef) e.frasersRef = "Required";
    if (!Object.values(assessed).some(v => pm(v||"0") > 0)) e.assessed = "Enter at least one assessed value";
    setErrors(e); return Object.keys(e).length === 0;
  };

  // ── WELCOME SCREEN ──────────────────────────────────────────────────────────
  if (screen === "welcome") return (
    <div style={{ minHeight: "100vh", background: F.bg, fontFamily: "'72','72full',Arial,Helvetica,sans-serif" }}>
      <FioriShell title="Frasers Property" subtitle="Subcontractor Progress Claims" lang={lang} setLang={setLang}
        rightSlot={<div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setScreen("flowmap")} style={{ padding: "4px 12px", fontSize: 11, border: "1px solid rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.1)", color: "white", borderRadius: 3, cursor: "pointer" }}>📊 Process Flow</button>
          <button onClick={() => setScreen("beforeafter")} style={{ padding: "4px 12px", fontSize: 11, border: "1px solid rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.1)", color: "white", borderRadius: 3, cursor: "pointer" }}>⚖️ Before vs After</button>
        </div>}
      />
      <PageHeader title={t.welcomePageTitle||"Subcontractor Progress Claims"} subtitle={t.welcomePageSub||"Training Simulator · Select your role and experience to begin"} />
      <div style={{ padding: "24px 32px", maxWidth: 1100, margin: "0 auto" }}>
        <ProgressClaimsExplainer t={t} />

        {/* Step 1 — Role */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%", background: F.blue, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>1</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: F.text }}>{t.welcomeStep1||"Select your role"}</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {ROLES.map(r => {
              const tr = getRole(r, t); const sel = role === r.id;
              return (
                <Card key={r.id} hoverable onClick={() => setRole(r.id)}
                  style={{ padding: "18px 16px", border: sel ? `2px solid ${F.blue}` : `1px solid ${F.border}`, cursor: "pointer", position: "relative", overflow: "hidden" }}>
                  {sel && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: F.blue }} />}
                  {sel && <div style={{ position: "absolute", top: 10, right: 10, width: 18, height: 18, borderRadius: "50%", background: F.blue, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ color: "white", fontSize: 10, fontWeight: 900 }}>✓</span></div>}
                  <div style={{ fontSize: 26, marginBottom: 8 }}>{r.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: sel ? F.blue : F.text, marginBottom: 4 }}>{tr.title}</div>
                  <div style={{ fontSize: 11, color: F.textMid, lineHeight: 1.5, marginBottom: 10 }}>{tr.desc}</div>
                  <span style={{ fontSize: 10, background: sel ? "#e8f2ff" : "#f5f6f7", color: sel ? F.blue : F.textMid, padding: "2px 8px", borderRadius: 10, fontWeight: 600 }}>{r.steps.length} {t.welcomeSteps||"steps"}</span>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Step 2 — Mode */}
        <div style={{ marginBottom: 28, opacity: role ? 1 : 0.45, transition: "opacity 0.3s", pointerEvents: role ? "auto" : "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%", background: role ? F.blue : F.textLight, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>2</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: F.text }}>{t.welcomeStep2||"Choose your experience"}</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, maxWidth: 700 }}>
            {[
              { id: "demo", icon: "▶", title: t.welcomeDemoTitle||"Watch it work", subtitle: t.welcomeDemoSubtitle||"Demo Mode", desc: t.welcomeDemoDesc||"All fields pre-filled. Click through to see the full process in 2 minutes.", time: t.welcomeDemoTime||"~2 min", best: t.welcomeModeBest||"First-time viewers & executives", color: F.blue },
              { id: "practice", icon: "✎", title: t.welcomePracticeTitle||"Do it yourself", subtitle: t.welcomePracticeSubtitle||"Practice Mode", desc: t.welcomePracticeDesc||"Blank fields. Enter everything yourself to learn step by step.", time: t.welcomePracticeTime||"~10 min", best: t.welcomePracticeBest||"Staff training & onboarding", color: F.green },
            ].map(m => {
              const sel = simMode === m.id;
              return (
                <Card key={m.id} hoverable onClick={() => setSimMode(m.id)}
                  style={{ padding: "18px 16px", border: sel ? `2px solid ${m.color}` : `1px solid ${F.border}`, cursor: "pointer", position: "relative", overflow: "hidden" }}>
                  {sel && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: m.color }} />}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 7, background: sel ? m.color : "#f5f6f7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: sel ? "white" : F.textMid, fontWeight: 700, transition: "all 0.15s" }}>{m.icon}</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: sel ? m.color : F.text }}>{m.title}</div>
                      <div style={{ fontSize: 10, color: F.textLight, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 }}>{m.subtitle}</div>
                    </div>
                    {sel && <div style={{ marginLeft: "auto", width: 18, height: 18, borderRadius: "50%", background: m.color, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ color: "white", fontSize: 10, fontWeight: 900 }}>✓</span></div>}
                  </div>
                  <div style={{ fontSize: 12, color: F.textMid, lineHeight: 1.6, marginBottom: 12 }}>{m.desc}</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <span style={{ fontSize: 10, background: "#f5f6f7", color: F.textMid, padding: "3px 8px", borderRadius: 10, fontWeight: 600 }}>⏱ {m.time}</span>
                    <span style={{ fontSize: 10, background: "#f5f6f7", color: F.textMid, padding: "3px 8px", borderRadius: 10, fontWeight: 600 }}>👤 {m.best}</span>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Step 3 — Start */}
        <div style={{ opacity: role ? 1 : 0.45, transition: "opacity 0.3s" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%", background: role ? F.blue : F.textLight, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>3</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: F.text }}>{t.welcomeStep3||"Start the simulation"}</div>
          </div>
          <Card style={{ padding: 20, maxWidth: 700 }}>
            {role ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
                <div>
                  <div style={{ fontSize: 12, color: F.textMid, marginBottom: 4 }}>{t.welcomeAboutToStart||"You are about to start:"}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: F.text, marginBottom: 3 }}>
                    {getRole(ROLES.find(r => r.id === role), t).icon} {getRole(ROLES.find(r => r.id === role), t).title}
                    <span style={{ margin: "0 8px", color: F.border }}>·</span>
                    {simMode === "demo" ? `▶ ${t.welcomeDemoSubtitle||"Demo Mode"}` : `✎ ${t.welcomePracticeSubtitle||"Practice Mode"}`}
                  </div>
                  <div style={{ fontSize: 11, color: F.textMid }}>{ROLES.find(r => r.id === role)?.steps.length} {t.welcomeSteps||"steps"} · {simMode === "demo" ? t.welcomeMinutes2||"~2 minutes" : t.welcomeMinutes10||"~10 minutes"}</div>
                </div>
                <Btn label={t.welcomeStartBtn||"Start Simulation"} primary onClick={startSim} icon="▶" />
              </div>
            ) : (
              <div style={{ fontSize: 13, color: F.textMid, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 18 }}>☝️</span>{t.welcomeComplete12||"Complete steps 1 and 2 above to begin"}
              </div>
            )}
          </Card>
        </div>
      </div>
      <div style={{ borderTop: `1px solid ${F.border}`, padding: "10px 32px", background: F.white, marginTop: 32, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 11, color: F.textLight }}>{t.welcomeFooter||"Frasers Property · Progress Claims Training Simulator · No login required · No data saved"}</div>
        <button onClick={() => setShowGlossary(true)} style={{ fontSize: 11, color: F.blue, background: "none", border: "none", cursor: "pointer" }}>📖 Glossary</button>
      </div>
      {showGlossary && <GlossaryModal lang={lang} t={t} onClose={() => setShowGlossary(false)} />}
    </div>
  );

  // ── FLOW MAP ────────────────────────────────────────────────────────────────
  if (screen === "flowmap") return (
    <div style={{ minHeight: "100vh", background: F.bg, fontFamily: "'72','72full',Arial,Helvetica,sans-serif" }}>
      <FioriShell title="Process Flow Map" subtitle="Subcontractor Progress Claims" lang={lang} setLang={setLang} onBack={() => setScreen("welcome")} backLabel="Back" />
      <PageHeader title="End-to-End Process Flow" subtitle="Click any step to jump straight into the simulation" />
      <div style={{ padding: "32px", maxWidth: 860, margin: "0 auto" }}>
        {STAGE_IDS.map((id, i) => {
          const ex = EXPLAINERS[id];
          const auto = id === "rcti" || id === "posting";
          return (
            <div key={id} style={{ display: "flex", gap: 20, marginBottom: 12, position: "relative" }}>
              {i < STAGE_IDS.length - 1 && <div style={{ position: "absolute", left: 24, top: 52, width: 2, height: "calc(100% + 12px)", background: F.border, zIndex: 0 }} />}
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: auto ? "#f5f6f7" : F.blue, border: `2px solid ${auto ? F.border : F.blue}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0, zIndex: 1, cursor: "pointer" }}
                onClick={() => { setRole(role||"contract_admin"); setStage(id); if (!completed.includes(id)) setCompleted(p => [...p, id]); setScreen("sim"); }}>
                <div style={{ fontSize: 18 }}>{STAGE_ICONS[i]}</div>
                <div style={{ fontSize: 8, color: auto ? F.textLight : "white", fontWeight: 700 }}>{i + 1}</div>
              </div>
              <Card hoverable onClick={() => { setRole(role||"contract_admin"); setStage(id); if (!completed.includes(id)) setCompleted(p => [...p, id]); setScreen("sim"); }}
                style={{ flex: 1, padding: "14px 18px", cursor: "pointer" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: F.text }}>{STAGE_LABELS[i]}</div>
                  <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 10, background: auto ? "#f0f0f0" : "#e8f2ff", color: auto ? F.textMid : F.blue, fontWeight: 600, whiteSpace: "nowrap" }}>
                    {auto ? "SAP automatic" : "Contract Admin"}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: F.textMid, lineHeight: 1.5 }}>{ex?.what}</div>
                <div style={{ marginTop: 8, fontSize: 11, color: F.blue }}>Click to jump to this step →</div>
              </Card>
            </div>
          );
        })}
        <div style={{ textAlign: "center", marginTop: 24 }}>
          <Btn label="Start Full Demo →" primary onClick={startSim} />
        </div>
      </div>
    </div>
  );

  // ── BEFORE vs AFTER ─────────────────────────────────────────────────────────
  if (screen === "beforeafter") return (
    <div style={{ minHeight: "100vh", background: F.bg, fontFamily: "'72','72full',Arial,Helvetica,sans-serif" }}>
      <FioriShell title="Before vs After" subtitle="Subcontractor Progress Claims" lang={lang} setLang={setLang} onBack={() => setScreen("welcome")} backLabel="Back" />
      <PageHeader title="Manual Process vs SAP" subtitle="What the progress claims process looks like without SAP — and with it" />
      <div style={{ padding: "24px 32px", maxWidth: 1060, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "200px 1fr 1fr", gap: 2, borderRadius: 8, overflow: "hidden", border: `1px solid ${F.border}` }}>
          {/* Headers */}
          <div style={{ background: F.bg, padding: "12px 16px", borderRight: `1px solid ${F.border}`, borderBottom: `1px solid ${F.border}` }}></div>
          <div style={{ background: "#fff3f3", padding: "12px 16px", borderRight: `1px solid ${F.border}`, borderBottom: `1px solid ${F.border}`, textAlign: "center", fontSize: 13, fontWeight: 700, color: "#c62828" }}>❌ Without SAP</div>
          <div style={{ background: "#f0f8f0", padding: "12px 16px", borderBottom: `1px solid ${F.border}`, textAlign: "center", fontSize: 13, fontWeight: 700, color: F.green }}>✅ With SAP (ERS)</div>
          {[
            ["Claim submission", "📧 Email with PDF — can be missed, delayed or sent to wrong person", "🔔 Automatically appears in Contract Admin SAP inbox"],
            ["Reviewing figures", "📊 Open spreadsheet, manually check against contract and previous claims", "💻 SAP shows all figures side by side — orig contract, prev certified, claimed"],
            ["Calculating retention", "🧮 Manual formula — risk of wrong rate, cap error or formula mistake", "⚙️ SAP applies the correct retention rate and max cap from the PO automatically"],
            ["Calculating GST", "🧮 Another manual calculation — another opportunity for error", "⚙️ GST calculated automatically from the certified amount"],
            ["Payment Schedule", "📝 Type up a Word document — time consuming, inconsistency risk", "📄 SAP generates a legally compliant Payment Schedule instantly"],
            ["Subcontractor invoice", "📬 Wait for subcontractor invoice — delays, wrong amounts, ABN errors", "🧾 SAP creates the RCTI automatically — no supplier invoice needed"],
            ["Accounting entry", "📒 Finance manually journals vendor payable, retention and GST", "📒 SAP posts all 4 accounting lines automatically, linked to the PO"],
            ["Audit trail", "🗂️ Scattered across emails, spreadsheets and filing cabinets", "🔍 Every action timestamped and linked in SAP — full history at a glance"],
          ].map(([step, before, after], i) => (
            <React.Fragment key={i}>
              <div style={{ background: F.white, padding: "12px 16px", borderRight: `1px solid ${F.border}`, borderBottom: `1px solid ${F.border}`, fontSize: 12, fontWeight: 600, color: F.text, display: "flex", alignItems: "center" }}>{step}</div>
              <div style={{ background: "#fffafa", padding: "12px 16px", borderRight: `1px solid ${F.border}`, borderBottom: `1px solid ${F.border}`, fontSize: 12, color: "#c62828", lineHeight: 1.5 }}>{before}</div>
              <div style={{ background: "#f5fbf5", padding: "12px 16px", borderBottom: `1px solid ${F.border}`, fontSize: 12, color: "#2e7d32", lineHeight: 1.5 }}>{after}</div>
            </React.Fragment>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: 24, display: "flex", gap: 10, justifyContent: "center" }}>
          <Btn label="← Back to Welcome" onClick={() => setScreen("welcome")} />
          <Btn label="Experience it yourself →" primary onClick={startSim} />
        </div>
      </div>
    </div>
  );

  // ── SIMULATION ──────────────────────────────────────────────────────────────
  const currentRoleData = ROLES.find(r => r.id === role) || ROLES[0];
  const currentStageIdx = STAGE_IDS.indexOf(stage);
  const doneCount = completed.filter(s => activeStages.includes(s)).length;

  return (
    <div style={{ minHeight: "100vh", background: F.bg, fontFamily: "'72','72full',Arial,Helvetica,sans-serif" }}>
      <FioriShell
        title="Subcontractor Progress Payment"
        subtitle={`PO 4300001075 · Mirobrick Pty Ltd · ${simMode === "demo" ? "Demo Mode" : "Practice Mode"}`}
        lang={lang} setLang={setLang} onBack={reset} backLabel="Exit"
        rightSlot={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>{getRole(currentRoleData, t).icon} {getRole(currentRoleData, t).title}</span>
            <div style={{ width: 60, height: 4, background: "rgba(255,255,255,0.2)", borderRadius: 10, overflow: "hidden" }}>
              <div style={{ height: "100%", background: "white", borderRadius: 10, width: `${Math.round(doneCount/activeStages.length*100)}%`, transition: "width 0.4s" }} />
            </div>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.6)" }}>{doneCount}/{activeStages.length}</span>
            <button onClick={() => setShowGlossary(true)} style={{ padding: "3px 8px", fontSize: 10, border: "1px solid rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.1)", color: "white", borderRadius: 3, cursor: "pointer" }}>📖</button>
          </div>
        }
      />

      {/* Step tabs */}
      <div style={{ background: F.white, borderBottom: `1px solid ${F.border}`, display: "flex", padding: "0 20px", overflowX: "auto" }}>
        {activeStages.map((id, i) => {
          const active = stage === id; const done = completed.includes(id) && !active;
          return (
            <div key={id} onClick={() => completed.includes(id) && go(id)}
              style={{ padding: "10px 16px", fontSize: 12, fontWeight: active ? 700 : 400, color: active ? F.blue : done ? F.green : F.textLight, borderBottom: active ? `3px solid ${F.blue}` : done ? `3px solid ${F.green}` : "3px solid transparent", cursor: completed.includes(id) ? "pointer" : "default", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5 }}>
              {STAGE_ICONS[STAGE_IDS.indexOf(id)]} {i+1}. {(t.stages[STAGE_IDS.indexOf(id)]||STAGE_LABELS[STAGE_IDS.indexOf(id)]).replace(/^\d+\.\s*/,"")} {done && "✓"}
            </div>
          );
        })}
      </div>

      {/* Two-column layout */}
      <div style={{ display: "flex", gap: 0, maxWidth: 1280, margin: "0 auto", padding: "20px 24px", gap: 20 }}>
        {/* Main SAP content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {stage === "po"          && renderPO()}
          {stage === "approval"    && renderApproval()}
          {stage === "inbox"       && renderInbox()}
          {stage === "assess"      && renderAssess()}
          {stage === "certificate" && renderCertificate()}
          {stage === "rcti"        && renderRCTI()}
          {stage === "posting"     && renderPosting()}
        </div>
        {/* Context panel */}
        <ContextPanel stageId={stage} auditLog={auditLog} t={t} />
      </div>

      {/* Toast */}
      {toast && EXPLAINERS[toast] && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: F.shell, color: "white", borderRadius: 10, padding: "14px 20px", maxWidth: 460, width: "90%", boxShadow: F.shadowMd, display: "flex", gap: 12, alignItems: "flex-start", zIndex: 500, animation: "slideUp 0.3s ease" }}>
          <span style={{ fontSize: 22, flexShrink: 0 }}>{EXPLAINERS[toast].icon}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 3 }}>Step complete</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", lineHeight: 1.5 }}>{EXPLAINERS[toast].why}</div>
          </div>
        </div>
      )}

      {showVendorModal && <VendorModal />}
      {showRetModal && <RetentionModal />}
      {showGlossary && <GlossaryModal lang={lang} t={t} onClose={() => setShowGlossary(false)} />}
      <style>{`@keyframes slideUp{from{transform:translateX(-50%) translateY(16px);opacity:0}to{transform:translateX(-50%) translateY(0);opacity:1}}`}</style>
    </div>
  );

  // ── STAGE RENDERERS ──────────────────────────────────────────────────────────

  function SapPanel({ title, children, sap }) {
    return (
      <Card style={{ marginBottom: 16, overflow: "hidden" }}>
        <div style={{ background: sap ? F.shell : "#2c5282", color: "white", padding: "10px 18px", fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
          {sap && <span style={{ background: "#4da3e8", padding: "2px 8px", borderRadius: 3, fontSize: 10, fontWeight: 700 }}>SAP</span>}
          {title}
        </div>
        {children}
      </Card>
    );
  }

  function FieldRow({ children }) {
    return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "4px 20px", marginBottom: 8 }}>{children}</div>;
  }

  function ReadField({ label, value }) {
    return (
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: F.textMid, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 13, padding: "6px 10px", background: "#f5f6f7", border: `1px solid ${F.border}`, borderRadius: 4, color: F.text, minHeight: 30 }}>{value}</div>
      </div>
    );
  }

  function SummaryBox() {
    const total = ta(), r = ret(), a = ar(), g = gst(), p = pd();
    return (
      <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
        <div style={{ width: 340, border: `1px solid ${F.border}`, borderRadius: 6, overflow: "hidden" }}>
          {[[t.totalAssessed||"Total (Assessed)", total, false, false], [t.retHold||"Retention (10%)", r, false, false], [t.afterRet||"After Retention", a, false, true], [t.gst||"GST (This Claim)", g, false, false], [t.paymentDue||"Payment Amount Due (GST incl.)", p, true, false]].map(([label, val, primary, hi], i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "9px 14px", background: primary ? F.shell : hi ? "#e8f5e9" : i % 2 === 0 ? F.white : "#f8f9fb", color: primary ? "white" : hi ? F.green : F.text, fontWeight: primary ? 700 : 400, fontSize: primary ? 14 : 13, borderTop: i > 0 ? `1px solid ${F.border}` : "none" }}>
              <span>{label}</span><span>AUD {fmt(val)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderPO() {
    return (
      <div>
        <div style={{ marginBottom: 14, padding: "10px 16px", background: simMode === "demo" ? "#e8f2ff" : "#e8f5e9", borderRadius: 6, border: `1px solid ${simMode === "demo" ? "#b0d0ff" : "#a5d6a7"}`, fontSize: 12, color: simMode === "demo" ? F.blue : F.green }}>
          {simMode === "demo" ? `▶ ${t.demoBanner||"Demo Mode — fields are pre-filled. Review and click Save PO to proceed."}` : `✎ ${t.practiceBanner||"Practice Mode — search for vendor 100051 and select retention code R1."}`}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
          {/* Vendor card */}
          <Card style={{ padding: 16, border: poData.vendor ? `2px solid ${F.green}` : errors.vendor ? "2px solid #bb0000" : `1px solid ${F.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: poData.vendor ? F.green : F.blue, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12 }}>{poData.vendor ? "✓" : "1"}</div>
              <span style={{ fontWeight: 600, fontSize: 13 }}>Select Vendor</span>
            </div>
            {poData.vendor
              ? <div style={{ background: "#e8f5e9", borderRadius: 4, padding: "8px 12px", marginBottom: 8 }}><div style={{ fontSize: 13, fontWeight: 700, color: F.green }}>{poData.vendor.name}</div><div style={{ fontSize: 11, color: F.textMid }}>Code: {poData.vendor.code} · ABN: {poData.vendor.abn}</div></div>
              : <div style={{ background: "#f5f6f7", borderRadius: 4, padding: "8px 12px", marginBottom: 8, fontSize: 13, color: F.textMid }}>No vendor selected</div>}
            {errors.vendor && <div style={{ fontSize: 11, color: "#bb0000", marginBottom: 6 }}>⚠ {errors.vendor}</div>}
            <Btn label="Search Vendor" onClick={() => setShowVendorModal(true)} />
          </Card>

          {/* Retention card */}
          <Card style={{ padding: 16, border: poData.retCode ? `2px solid ${F.green}` : errors.retCode ? "2px solid #bb0000" : `1px solid ${F.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: poData.retCode ? F.green : F.blue, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12 }}>{poData.retCode ? "✓" : "2"}</div>
              <span style={{ fontWeight: 600, fontSize: 13 }}>Select Retention Code</span>
            </div>
            {poData.retCode
              ? <div style={{ background: "#e8f5e9", borderRadius: 4, padding: "8px 12px", marginBottom: 8 }}><div style={{ fontSize: 13, fontWeight: 700, color: F.green }}>H Cash Retention · {poData.retCode.code}</div><div style={{ fontSize: 11, color: F.textMid }}>Retention: {poData.retCode.retPct}% · Max: {poData.retCode.maxPct}%</div></div>
              : <div style={{ background: "#f5f6f7", borderRadius: 4, padding: "8px 12px", marginBottom: 8, fontSize: 13, color: F.textMid }}>No retention code selected</div>}
            {errors.retCode && <div style={{ fontSize: 11, color: "#bb0000", marginBottom: 6 }}>⚠ {errors.retCode}</div>}
            <Btn label="Select Code" onClick={() => setShowRetModal(true)} />
          </Card>
        </div>

        <SapPanel title={`Create Purchase Order${poData.vendor ? ` — ${poData.vendor.code} ${poData.vendor.name}` : " — Sub contract (ERS)"}`}>
          <div style={{ padding: 18 }}>
            <FieldRow>
              <ReadField label="PO Type" value="Sub contract (ERS)" />
              <ReadField label="Supplier" value={poData.vendor ? `${poData.vendor.code} · ${poData.vendor.name}` : "—"} />
              <ReadField label="Doc. Date" value="15.05.2026" />
              <ReadField label="Ret. Code" value={poData.retCode ? `${poData.retCode.code} · ${poData.retCode.retPct}% / Max ${poData.retCode.maxPct}%` : "—"} />
            </FieldRow>

            <div style={{ fontSize: 12, fontWeight: 600, color: F.text, margin: "14px 0 4px" }}>Item 10 — Schedule of Works (service line items breakdown)</div>
            <div style={{ fontSize: 11, color: F.textMid, marginBottom: 10 }}>Each line maps to a specific scope of work and WBS element for cost tracking in the project budget.</div>

            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: F.shell, color: "white" }}>
                  {["Line","Short Text","Qty","Un","Gross Price (AUD)","WBS Element"].map(h => <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 500 }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, i) => (
                  <tr key={item.line} style={{ background: i % 2 === 0 ? F.white : "#f8f9fb", borderBottom: `1px solid ${F.border}` }}>
                    <td style={{ padding: "8px 12px", color: F.blue, fontWeight: 600 }}>{item.line}</td>
                    <td style={{ padding: "8px 12px" }}>{item.text}</td>
                    <td style={{ padding: "8px 12px", textAlign: "right" }}>{item.qty.toLocaleString()}</td>
                    <td style={{ padding: "8px 12px" }}>EA</td>
                    <td style={{ padding: "6px 8px" }}>
                      <input value={item.price} onChange={e => setLineItems(lineItems.map(l => l.line === item.line ? {...l, price: e.target.value} : l))}
                        style={{ width: "100%", padding: "5px 8px", textAlign: "right", border: `1px solid ${errors[`p${item.line}`] ? "#bb0000" : "#ccc"}`, borderRadius: 3, fontSize: 12 }} />
                    </td>
                    <td style={{ padding: "6px 8px" }}>
                      <input value={item.wbs} onChange={e => setLineItems(lineItems.map(l => l.line === item.line ? {...l, wbs: e.target.value} : l))}
                        style={{ width: "100%", padding: "5px 8px", border: "1px solid #ccc", borderRadius: 3, fontSize: 12 }} />
                    </td>
                  </tr>
                ))}
                <tr style={{ background: "#e8f2ff", fontWeight: 700 }}>
                  <td colSpan={4} style={{ padding: "9px 12px", textAlign: "right", fontSize: 12 }}>Total Contract Value:</td>
                  <td style={{ padding: "9px 12px", textAlign: "right", fontSize: 13, color: F.blue }}>AUD {fmt(tc())}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
          {Object.keys(errors).length > 0 && <div style={{ margin: "0 18px 12px", padding: "8px 12px", background: "#fff3f3", border: "1px solid #ffcdd2", borderRadius: 4, fontSize: 12, color: "#c62828" }}>⚠ Please fix highlighted fields before proceeding.</div>}
          <div style={{ padding: "12px 18px", borderTop: `1px solid ${F.border}`, display: "flex", gap: 8 }}>
            <Btn label="Save PO" primary onClick={() => { if (validatePO()) { addLog("PO 4300001075 created — Mirobrick Pty Ltd"); setFeedback("✅ PO 4300001075 saved successfully!"); } }} />
            <Btn label="Next →" onClick={() => { if (validatePO()) go("approval"); }} />
          </div>
          {feedback && <div style={{ margin: "0 18px 12px", padding: "8px 12px", background: "#e8f5e9", borderRadius: 4, fontSize: 12, color: F.green, fontWeight: 600 }}>{feedback}</div>}
        </SapPanel>
      </div>
    );
  }

  function renderApproval() {
    return (
      <div>
        {[
          { icon: "📎", title: "Attach All Supporting Documents", body: "Before the PO is released, all required documents must be attached in SAP — signed subcontract, insurance certificates, WHS plan and schedule of rates. Documents are attached directly to the PO." },
          { icon: "✅", title: "PO Goes for Multi-Level Approval", body: "Once saved, the PO is automatically routed through the approval workflow. Each approver receives a notification in their SAP inbox.", workflow: true },
          { icon: "🏗️", title: "Subcontractor Commences Work", body: "Once fully approved and released, the subcontractor is notified and can commence work on site. Progress claims can be submitted at the end of each agreed claim period." },
        ].map((card, i) => (
          <Card key={i} style={{ padding: 20, marginBottom: 12, display: "flex", gap: 14, alignItems: "flex-start" }}>
            <div style={{ fontSize: 24, flexShrink: 0 }}>{card.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: F.text, marginBottom: 6 }}>{card.title}</div>
              <div style={{ fontSize: 13, color: F.textMid, lineHeight: 1.6 }}>{card.body}</div>
              {card.workflow && (
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
                  {["Contract Admin", "→", "Project Manager", "→", "Finance", "→", "✅ Released"].map((s, j) => (
                    <div key={j} style={{ fontSize: 11, padding: s === "→" ? "0 4px" : "4px 12px", background: s === "→" ? "transparent" : s.includes("✅") ? "#e8f5e9" : "#f5f6f7", borderRadius: 20, border: s === "→" ? "none" : s.includes("✅") ? `1px solid #a5d6a7` : `1px solid ${F.border}`, color: s.includes("✅") ? F.green : F.text }}>{s}</div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        ))}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Btn label="Next: View Claim in Inbox →" primary onClick={() => { addLog("PO approved — subcontractor notified"); go("inbox"); }} />
        </div>
      </div>
    );
  }

  function renderInbox() {
    return (
      <SapPanel title="My Inbox (500 Hits) — (499 Filtered)" sap>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#e8ecf0" }}>
                {["Exception Reason","Doc.","Execute","Current Role","Curr Agent","Due Date","Crea. Date","Gross Amt","Purchasing Doc.","Vendor","Name"].map(h => <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: F.text, whiteSpace: "nowrap" }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr style={{ background: "#fffde7", borderBottom: `1px solid ${F.border}` }}>
                <td style={{ padding: "10px 12px", color: "#c62828", fontWeight: 600 }}>Service Entry Required</td>
                <td style={{ padding: "10px 12px", color: F.blue }}>3262</td>
                <td style={{ padding: "8px 12px" }}>
                  <button onClick={() => { addLog("Claim 3262 opened for assessment — Mirobrick Pty Ltd"); go("assess"); }}
                    style={{ background: F.blue, color: "white", border: "none", borderRadius: 3, padding: "5px 14px", fontSize: 11, cursor: "pointer", fontWeight: 700 }}>▶ Execute</button>
                </td>
                <td style={{ padding: "10px 12px", fontWeight: 600, color: F.blue }}>CONTRACT_ADM.</td>
                <td style={{ padding: "10px 12px" }}>NRODRIGU...</td>
                <td style={{ padding: "10px 12px" }}>15.05.2026</td>
                <td style={{ padding: "10px 12px" }}>15.05.2026</td>
                <td style={{ padding: "10px 12px", fontWeight: 600 }}>247,500.00</td>
                <td style={{ padding: "10px 12px", color: F.blue, textDecoration: "underline", cursor: "pointer" }}>4300001075</td>
                <td style={{ padding: "10px 12px", color: F.blue }}>100051</td>
                <td style={{ padding: "10px 12px" }}>Mirobrick Pty Ltd</td>
              </tr>
              <tr style={{ opacity: 0.35, borderBottom: `1px solid ${F.border}` }}>
                <td style={{ padding: "10px 12px" }}>Service Entry Required</td>
                <td style={{ padding: "10px 12px" }}>3198</td>
                <td></td>
                <td style={{ padding: "10px 12px" }}>CONTRACT_ADM.</td>
                <td style={{ padding: "10px 12px" }}>NRODRIGU...</td>
                <td style={{ padding: "10px 12px" }}>08.05.2026</td>
                <td style={{ padding: "10px 12px" }}>02.05.2026</td>
                <td style={{ padding: "10px 12px" }}>132,000.00</td>
                <td style={{ padding: "10px 12px" }}>4300000988</td>
                <td style={{ padding: "10px 12px" }}>100042</td>
                <td style={{ padding: "10px 12px" }}>Buildcorp Pty Ltd</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div style={{ padding: 16 }}>
          <div style={{ padding: "10px 14px", background: "#e8f2ff", borderRadius: 6, fontSize: 12, color: F.blue }}>👆 Click <strong>Execute</strong> on the highlighted row to open the progress claim assessment screen.</div>
        </div>
      </SapPanel>
    );
  }

  function renderAssess() {
    return (
      <SapPanel title="Subcontractor Progress Payment Entry Screen for PO 4300001075" sap>
        <div style={{ padding: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: F.text, marginBottom: 14 }}>Subcontractor Progress Payment Header Data</div>
          <FieldRow>
            <ReadField label="Project Name" value="Lidcombe Village Civil" />
            <ReadField label="Project Number" value="R-0024" />
            <div>
              <div style={{ fontSize: 11, color: errors.periodEnding ? "#bb0000" : F.textMid, marginBottom: 2, fontWeight: 500 }}>Claim Period Ending <span style={{ color: "#bb0000" }}>*</span></div>
              <input type="date" defaultValue={claim.periodEnding ? `${claim.periodEnding.split('.')[2]}-${claim.periodEnding.split('.')[1]}-${claim.periodEnding.split('.')[0]}` : ""}
                onChange={e => { const p = e.target.value.split("-"); setClaim({...claim, periodEnding: p.length===3?`${p[2]}.${p[1]}.${p[0]}`:""}); }}
                style={{ width: "100%", padding: "6px 10px", border: `1px solid ${errors.periodEnding ? "#bb0000" : "#ccc"}`, borderRadius: 4, fontSize: 13, background: "white", color: F.text }} />
              {errors.periodEnding && <div style={{ fontSize: 11, color: "#bb0000", marginTop: 2 }}>{errors.periodEnding}</div>}
            </div>
          </FieldRow>
          <FieldRow>
            <ReadField label="Stage Name" value="Lidcombe Heritage" />
            <ReadField label="Stage Number" value="R-0024-80" />
            <div>
              <div style={{ fontSize: 11, color: errors.receivedDate ? "#bb0000" : F.textMid, marginBottom: 2, fontWeight: 500 }}>Progress Claim Received Date <span style={{ color: "#bb0000" }}>*</span></div>
              <input type="date" defaultValue={claim.receivedDate ? `${claim.receivedDate.split('.')[2]}-${claim.receivedDate.split('.')[1]}-${claim.receivedDate.split('.')[0]}` : ""}
                onChange={e => { const p = e.target.value.split("-"); setClaim({...claim, receivedDate: p.length===3?`${p[2]}.${p[1]}.${p[0]}`:""}); }}
                style={{ width: "100%", padding: "6px 10px", border: `1px solid ${errors.receivedDate ? "#bb0000" : "#ccc"}`, borderRadius: 4, fontSize: 13, background: "white", color: F.text }} />
              {errors.receivedDate && <div style={{ fontSize: 11, color: "#bb0000", marginTop: 2 }}>{errors.receivedDate}</div>}
            </div>
          </FieldRow>
          <FieldRow>
            <ReadField label="Subcontractor Name" value="Mirobrick Pty Ltd" />
            <ReadField label="Vendor Code" value="100051" />
            <TextInput label="Subcontractor Reference" value={claim.subRef} onChange={v => setClaim({...claim, subRef: v})} placeholder="e.g. TEST DEMO" error={errors.subRef} required />
          </FieldRow>
          <FieldRow>
            <ReadField label="Frasers Contact" value="NARDA RODRIGUEZ" />
            <ReadField label="Approver" value="R2CONMGR · Retention 10% / Max 5%" />
            <TextInput label="Frasersproperty Ref No" value={claim.frasersRef} onChange={v => setClaim({...claim, frasersRef: v})} placeholder="e.g. TEST DEMO 1" error={errors.frasersRef} required />
          </FieldRow>

          <div style={{ borderTop: `1px solid ${F.border}`, paddingTop: 16, marginTop: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: F.text, marginBottom: 4 }}>
              Purchase Order Line <span style={{ background: F.blue, color: "white", padding: "2px 10px", borderRadius: 10, marginLeft: 6, fontSize: 11 }}>10</span>
              <span style={{ marginLeft: 10, fontWeight: 400, color: F.textMid, fontSize: 12 }}>Progress Claim example</span>
            </div>
            <div style={{ fontSize: 11, color: F.textMid, marginBottom: 12 }}>Enter the certified value for each line item. Leave blank if no work was completed this period.</div>

            {errors.assessed && <div style={{ padding: "8px 12px", background: "#fff3f3", border: "1px solid #ffcdd2", borderRadius: 4, fontSize: 12, color: "#c62828", marginBottom: 10 }}>⚠ {errors.assessed}</div>}

            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: F.shell, color: "white" }}>
                  {["Line","Item Name","Orig Contract","Appd Vari's","Curr Contract","Prev Certified","Sub Claimed","% Comp","Assessed Value (AUD)"].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: h.includes("AUD") || h === "Prev Certified" || h === "Sub Claimed" || h === "% Comp" || h === "Orig Contract" || h === "Appd Vari's" || h === "Curr Contract" ? "right" : "left", fontWeight: 500, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, i) => {
                  const orig = pm(item.price);
                  const av = pm(assessed[item.line] || "0");
                  const pct = orig > 0 && av > 0 ? ((av/orig)*100).toFixed(2) : "—";
                  return (
                    <tr key={item.line} style={{ background: i % 2 === 0 ? F.white : "#f8f9fb", borderBottom: `1px solid ${F.border}` }}>
                      <td style={{ padding: "8px 12px", color: F.blue, fontWeight: 600 }}>{item.line}</td>
                      <td style={{ padding: "8px 12px" }}>{item.text}</td>
                      <td style={{ padding: "8px 12px", textAlign: "right" }}>{fmt(orig)}</td>
                      <td style={{ padding: "8px 12px", textAlign: "right" }}>0.00</td>
                      <td style={{ padding: "8px 12px", textAlign: "right" }}>{fmt(orig)}</td>
                      <td style={{ padding: "8px 12px", textAlign: "right" }}>0.00</td>
                      <td style={{ padding: "8px 12px", textAlign: "right", color: item.line === 20 ? F.text : F.textLight }}>{item.line === 20 ? "250,000.00" : "0.00"}</td>
                      <td style={{ padding: "8px 12px", textAlign: "right", color: av > 0 ? F.blue : F.textLight, fontWeight: av > 0 ? 600 : 400 }}>{pct}</td>
                      <td style={{ padding: "6px 8px", minWidth: 140 }}><AssessInput value={assessed[item.line]||""} onChange={v => setAssessed({...assessed, [item.line]: v})} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <SummaryBox />
          </div>
        </div>
        <div style={{ padding: "12px 18px", borderTop: `1px solid ${F.border}`, display: "flex", gap: 8 }}>
          <Btn label="Save" onClick={() => { if (validateAssess()) { addLog(`Claim assessed — AUD ${fmt(ta())} certified`); setFeedback("✅ Progress claim saved."); }}} />
          <Btn label="Save & Approve" primary onClick={() => { if (validateAssess()) { addLog(`Claim approved — AUD ${fmt(ta())} certified`); setFeedback("✅ Approved!"); setTimeout(() => go("certificate"), 1000); }}} />
          <Btn label="Preview Certificate" onClick={() => { if (validateAssess()) go("certificate"); }} />
        </div>
        {feedback && <div style={{ margin: "0 18px 12px", padding: "8px 12px", background: "#e8f5e9", borderRadius: 4, fontSize: 12, color: F.green, fontWeight: 600 }}>{feedback}</div>}
      </SapPanel>
    );
  }

  function renderCertificate() {
    const total = ta(), r = ret(), a = ar(), g = gst(), p = pd(), tct = tc();
    return (
      // Document-style certificate
      <div style={{ background: F.white, border: `1px solid ${F.border}`, borderRadius: 8, boxShadow: F.shadowMd, maxWidth: 860, padding: "40px 48px" }}>
        {/* Doc header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, paddingBottom: 20, borderBottom: "2.5px solid #32363a" }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, color: F.text, letterSpacing: 1, marginBottom: 2 }}>PAYMENT SCHEDULE</div>
            <div style={{ fontSize: 12, color: F.textMid }}>Issue Date: {claim.periodEnding || "15.05.2026"}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end", marginBottom: 4 }}>
              <div style={{ background: "#e63329", width: 32, height: 32, borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 900, fontSize: 18 }}>F</div>
              <div><div style={{ fontWeight: 900, fontSize: 12, color: F.text }}>FRASERS</div><div style={{ fontWeight: 900, fontSize: 12, color: F.text }}>PROPERTY</div></div>
            </div>
          </div>
        </div>
        {/* Project info */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 48px", marginBottom: 24, fontSize: 12 }}>
          {[["Project Name:", "Lidcombe Village Civil"],["Project Number:", "R-0024"],["Stage Name:", "Lidcombe Heritage"],["Stage Number:", "R-0024-80"],["Subcontractor Name:", "Mirobrick Pty Ltd"],["Vendor Number:", "100051"],["Subcontractor ABN:", "36 131 570 XXXX"],["SAP SES No:", "1000001947"],["Purchase Order No:", "4300001075"],["Claim Period Ending:", claim.periodEnding||"—"],["Frasersproperty Ref No:", claim.frasersRef||"—"],["Sub Claim Ref No:", claim.subRef||"—"],["Progress Claim Rec'd Date:", claim.receivedDate||"—"],["Frasersproperty Contact:", "NARDA RODRIGUEZ"]].map(([k,v]) => (
            <div key={k} style={{ display: "flex", gap: 8 }}><span style={{ fontWeight: 600, color: F.textMid, minWidth: 180 }}>{k}</span><span>{v}</span></div>
          ))}
        </div>
        {/* Table */}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, marginBottom: 20 }}>
          <thead>
            <tr style={{ background: "#32363a", color: "white" }}>
              {["Item","Item Line Name","Orig Contract","Appd Vari's","Rev Contract","Prev Certified","Work Complete","% Comp","Current Claim"].map(h => (
                <th key={h} style={{ padding: "7px 10px", textAlign: h === "Item Line Name" ? "left" : "right", fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr><td colSpan={9} style={{ padding: "5px 10px", background: "#e8ecf0", fontWeight: 700, fontSize: 10 }}>PO Line Item 10</td></tr>
            {lineItems.map((item, i) => {
              const orig = pm(item.price); const av = pm(assessed[item.line]||"0");
              const pct = orig > 0 && av > 0 ? ((av/orig)*100).toFixed(2) : "0.00";
              return (
                <tr key={item.line} style={{ background: i%2===0 ? F.white : "#f8f9fb", borderBottom: `1px solid ${F.border}` }}>
                  <td style={{ padding: "6px 10px", textAlign: "right", color: F.blue, fontWeight: 600 }}>{item.line}</td>
                  <td style={{ padding: "6px 10px" }}>{item.text}</td>
                  <td style={{ padding: "6px 10px", textAlign: "right" }}>{fmt(orig)}</td>
                  <td style={{ padding: "6px 10px", textAlign: "right" }}>0.00</td>
                  <td style={{ padding: "6px 10px", textAlign: "right" }}>{fmt(orig)}</td>
                  <td style={{ padding: "6px 10px", textAlign: "right" }}>0.00</td>
                  <td style={{ padding: "6px 10px", textAlign: "right", fontWeight: av>0?700:400 }}>{av>0?fmt(av):"0.00"}</td>
                  <td style={{ padding: "6px 10px", textAlign: "right" }}>{pct}</td>
                  <td style={{ padding: "6px 10px", textAlign: "right", fontWeight: av>0?700:400, color: av>0?F.blue:F.textLight }}>{av>0?fmt(av):"0.00"}</td>
                </tr>
              );
            })}
            <tr style={{ background: "#e8ecf0", fontWeight: 700 }}>
              <td colSpan={2} style={{ padding: "7px 10px" }}>TOTAL</td>
              <td style={{ padding: "7px 10px", textAlign: "right" }}>{fmt(tct)}</td>
              <td style={{ padding: "7px 10px", textAlign: "right" }}>0.00</td>
              <td style={{ padding: "7px 10px", textAlign: "right" }}>{fmt(tct)}</td>
              <td style={{ padding: "7px 10px", textAlign: "right" }}>0.00</td>
              <td style={{ padding: "7px 10px", textAlign: "right" }}>{fmt(total)}</td>
              <td style={{ padding: "7px 10px", textAlign: "right" }}>{tct>0?((total/tct)*100).toFixed(2):"0.00"}</td>
              <td style={{ padding: "7px 10px", textAlign: "right" }}>{fmt(total)}</td>
            </tr>
          </tbody>
        </table>
        {/* Payment summary */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 24 }}>
          <table style={{ fontSize: 12, borderCollapse: "collapse" }}>
            {[["","Prev Certified","Current Claim"],["Retention","0.00",fmt(r)],["After Retention","0.00",fmt(a)],["GST (This Claim)","",fmt(g)],["Payment Amount Due (GST incl.)","",fmt(p)]].map((row, i) => (
              <tr key={i} style={{ background: i===4?"#32363a":i===0?"#e8ecf0":i%2===0?F.white:"#f8f9fb" }}>
                {row.map((cell,j) => <td key={j} style={{ padding: "7px 16px", textAlign: "right", fontWeight: i===0||i===4?700:400, color: i===4?"white":F.text, border: `1px solid ${F.border}`, minWidth: j===0?240:110 }}>{cell}</td>)}
              </tr>
            ))}
          </table>
        </div>
        <div style={{ padding: "14px 18px", background: "#e8f5e9", border: "1px solid #a5d6a7", borderRadius: 8, textAlign: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: F.green, marginBottom: 3 }}>✅ Payment Schedule Certified!</div>
          <div style={{ fontSize: 12, color: "#388e3c" }}>Certificate issued to Mirobrick Pty Ltd. SAP will now auto-generate the RCTI and post the accounting documents.</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <Btn label="Next: View RCTI →" primary onClick={() => { addLog("Payment Schedule certificate generated"); go("rcti"); }} />
        </div>
      </div>
    );
  }

  function renderRCTI() {
    const total = ta(), r = ret(), a = ar(), g = gst(), p = pd(), tct = tc();
    return (
      <div style={{ background: F.white, border: `1px solid ${F.border}`, borderRadius: 8, boxShadow: F.shadowMd, maxWidth: 860, padding: "40px 48px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, paddingBottom: 16, borderBottom: "2px solid #32363a" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: F.textMid, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>RCTI</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: F.text }}>Recipient Created Tax Invoice</div>
            <div style={{ fontSize: 13, color: F.textMid }}>Contract Invoice Certification</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
              <div style={{ background: "#e63329", width: 28, height: 28, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 900, fontSize: 15 }}>F</div>
              <div><div style={{ fontWeight: 900, fontSize: 11, color: F.text }}>FRASERS PROPERTY</div></div>
            </div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 48px", marginBottom: 20, fontSize: 12, borderBottom: `1px solid ${F.border}`, paddingBottom: 16 }}>
          {[["Recipient No:", "1000016039"],["Tax Invoice Number:", "5200173715"],["Sequence No:", "1"],["Description:", "CLAIM 1"],["Project:", "Lidcombe Village Civil"],["Project #:", "R-0024"],["Invoice Date:", claim.periodEnding||"15.05.2026"],["Contract No:", "4300001075"],["Vendor Reference:", claim.subRef||"—"]].map(([k,v]) => (
            <div key={k} style={{ display: "flex", gap: 8 }}><span style={{ color: F.textMid, minWidth: 130 }}>{k}</span><span style={{ fontWeight: 600 }}>{v}</span></div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          {[["Recipient","Frasers Property Australia","ABN: 20 XXX XXX XXXX","Contact: NARDA RODRIGUEZ"],["Vendor","Mirobrick Pty Ltd","Vendor Code: 100051","ABN: 36 131 570 XXXX"]].map(([title,...lines],i) => (
            <div key={i} style={{ padding: "12px 16px", background: "#f8f9fb", border: `1px solid ${F.border}`, borderRadius: 6, fontSize: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{title}</div>
              {lines.map((l,j) => <div key={j} style={{ color: j===0?F.text:F.textMid }}>{l}</div>)}
            </div>
          ))}
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: F.text, marginBottom: 10 }}>Contract Invoice Summary</div>
        <div style={{ border: `1px solid ${F.border}`, borderRadius: 6, overflow: "hidden", marginBottom: 20 }}>
          {[["1.","Original Contract Value",fmt(tct),false,false],["2.","Net Change by Change Variations","0.00",false,false],["3.","Contract Value to Date",fmt(tct),false,false],["4.","Work / Material this Claim",fmt(total),true,true],["5.","Total Claim to Date",fmt(total),false,false],["6.","Retention withheld this Claim",fmt(r),false,false,true],["7.","Total Cash Retention",fmt(r),false,false,true],["8.","Total Claimed Less Retention",fmt(a),false,false],["9.","Less Previous Certificate for Payment","0.00",false,false],["10.","Current Payment Due",fmt(a),true,false],["11.","Balance to Finish, Including Retention",fmt(tct-total+r),false,false]].map(([n,l,v,bold,hi,sub],i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 16px", background: hi?"#fffde7":i%2===0?F.white:"#f8f9fb", borderBottom: i<10?`1px solid ${F.border}`:"none" }}>
              <span style={{ fontSize: 12, paddingLeft: sub?20:0, color: sub?F.textMid:F.text }}>{n} {l}</span>
              <span style={{ fontSize: 12, fontWeight: bold?700:400, color: bold?F.blue:F.text }}>{v}</span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 24 }}>
          <div style={{ width: 340, border: `2px solid #32363a`, borderRadius: 6, overflow: "hidden" }}>
            {[["Net Amount Due Excluding GST",fmt(a)],["GST Payable",fmt(g)],["Total Amount Due Including GST",fmt(p)]].map(([label,val],i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 16px", background: i===2?"#32363a":i%2===0?F.white:"#f8f9fb", color: i===2?"white":F.text, fontWeight: i===2?700:400, fontSize: i===2?14:13, borderTop: i>0?`1px solid ${F.border}`:"none" }}>
                <span>{label}</span><span>AUD {val}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <Btn label="Next: View SAP Posting →" primary onClick={() => { addLog("RCTI 5200173715 auto-generated"); go("posting"); }} />
        </div>
      </div>
    );
  }

  function renderPosting() {
    const total = ta(), r = ret(), a = ar(), g = gst();
    return (
      <div>
        <SapPanel title="Display Invoice Document — Follow-On Documents" sap>
          <div style={{ padding: 18 }}>
            <div style={{ background: "#f8f9fb", border: `1px solid ${F.border}`, borderRadius: 6, padding: 16, maxWidth: 420, marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: F.text, marginBottom: 12, display: "flex", justifyContent: "space-between" }}>
                <span>List of Documents in Accounting</span><span style={{ color: F.textLight, cursor: "pointer" }}>✕</span>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead><tr style={{ background: "#e8ecf0" }}><th style={{ padding: "6px 12px", textAlign: "left" }}>Document</th><th style={{ padding: "6px 12px", textAlign: "left" }}>Object type text</th></tr></thead>
                <tbody>
                  {[["5200173715","ERS / RCTI document"],["6100000030","FI posting document"]].map(([doc,desc],i) => (
                    <tr key={i} style={{ background: i===1?"#e8f2ff":F.white, borderBottom: `1px solid ${F.border}` }}>
                      <td style={{ padding: "8px 12px", color: F.blue, fontWeight: 600, textDecoration: "underline", cursor: "pointer" }}>{doc}</td>
                      <td style={{ padding: "8px 12px" }}>Accounting document <span style={{ fontSize: 10, color: F.textMid }}>— {desc}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ fontSize: 13, fontWeight: 600, color: F.text, marginBottom: 12 }}>Display Document: Data Entry View — Doc 6100000030</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px 20px", marginBottom: 16 }}>
              <ReadField label="Document Number" value="6100000030" />
              <ReadField label="Company Code" value="7015" />
              <ReadField label="Fiscal Year" value="2026" />
              <ReadField label="Document Date" value={claim.periodEnding||"15.05.2026"} />
              <ReadField label="Posting Date" value={claim.receivedDate||"15.05.2026"} />
              <ReadField label="Currency" value="AUD" />
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: F.shell, color: "white" }}>
                  {["Item","Key","S","Account","Description","WBS Element","Amount","Curr.","Tx","Profit Center"].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: h==="Amount"?"right":"left", fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  {n:1,key:"31",s:"",acc:"100051",desc:"Mirobrick Pty Ltd",wbs:"—",amt:`${fmt(a)}-`,cr:true,bg:F.white},
                  {n:2,key:"39",s:"X",acc:"100051",desc:"Retentions withheld",wbs:"—",amt:`${fmt(r)}-`,cr:true,bg:"#fffde7"},
                  {n:3,key:"86",s:"",acc:"2000200",desc:"TC - GR/IR",wbs:"R-0024-80-04-006",amt:fmt(total),cr:false,bg:"#f8f9fb"},
                  {n:4,key:"40",s:"",acc:"2120020",desc:"GST - Input tax",wbs:"—",amt:fmt(g),cr:false,bg:F.white},
                ].map((row, i) => (
                  <tr key={i} style={{ background: row.bg, borderBottom: `1px solid ${F.border}` }}>
                    <td style={{ padding: "9px 12px", color: F.blue, fontWeight: 600 }}>{row.n}</td>
                    <td style={{ padding: "9px 12px" }}>{row.key}</td>
                    <td style={{ padding: "9px 12px", fontWeight: 700, color: row.s==="X"?"#e65100":"inherit" }}>{row.s}</td>
                    <td style={{ padding: "9px 12px", color: F.blue, fontWeight: 600 }}>{row.acc}</td>
                    <td style={{ padding: "9px 12px" }}>{row.desc}</td>
                    <td style={{ padding: "9px 12px", color: row.wbs!=="—"?F.blue:F.textMid }}>{row.wbs}</td>
                    <td style={{ padding: "9px 12px", textAlign: "right", fontWeight: 700, color: row.cr?"#c62828":"#2e7d32" }}>{row.amt}</td>
                    <td style={{ padding: "9px 12px" }}>AUD</td>
                    <td style={{ padding: "9px 12px" }}>P1</td>
                    <td style={{ padding: "9px 12px", color: F.textMid }}>P30R005000</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: 12, display: "flex", gap: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}><div style={{ width: 12, height: 12, background: "#fffde7", border: "1px solid #ffe082", borderRadius: 2 }}></div><span style={{ color: F.textMid }}>Key 39 / Spl. G/L <strong>X</strong> = Retentions withheld (held until practical completion)</span></div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}><div style={{ width: 12, height: 12, background: F.white, border: `1px solid ${F.border}`, borderRadius: 2 }}></div><span style={{ color: F.textMid }}>Key 31 = Vendor payable — payment due within 7 days</span></div>
            </div>
          </div>
        </SapPanel>

        {/* Benefits summary */}
        <Card style={{ padding: "28px 32px", background: F.shell, color: "white", border: "none" }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>End-to-End Process Complete</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>You have walked through the full Frasers Property progress claims workflow in SAP</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 24 }}>
            {[["✅","Full audit trail","Every action logged in SAP from PO creation to final payment"],["🧮","Zero manual calculation","Retention, GST and payment calculated automatically"],["🧾","No supplier invoice","RCTI auto-generated under ERS — no invoice disputes"],["📒","Auto-posted accounting","Two linked FI documents created instantly with retention hold"],["⏱️","Payment terms enforced","Due date set automatically — 7 days from invoice date"],["🔒","Retention protected","Held in Special G/L X until practical completion"]].map(([icon,title,desc]) => (
              <div key={title} style={{ background: "rgba(255,255,255,0.08)", borderRadius: 8, padding: "14px 16px", display: "flex", gap: 10 }}>
                <div style={{ fontSize: 18, flexShrink: 0 }}>{icon}</div>
                <div><div style={{ fontSize: 12, fontWeight: 700, marginBottom: 3 }}>{title}</div><div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", lineHeight: 1.4 }}>{desc}</div></div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
            <button onClick={reset} style={{ padding: "10px 24px", background: "white", color: F.shell, border: "none", borderRadius: 4, fontSize: 13, cursor: "pointer", fontWeight: 700 }}>🔄 Try a different role</button>
            <button onClick={() => { setStage(activeStages[0]); setCompleted([]); setFeedback(""); }}
              style={{ padding: "10px 24px", background: "rgba(255,255,255,0.15)", color: "white", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 4, fontSize: 13, cursor: "pointer", fontWeight: 600 }}>↩ Restart demo</button>
          </div>
        </Card>
      </div>
    );
  }

  // ── MODALS ────────────────────────────────────────────────────────────────
  function VendorModal() {
    const [q, setQ] = useState("");
    const filtered = VENDORS.filter(v => !q || v.code.includes(q) || v.name.toLowerCase().includes(q.toLowerCase()));
    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ background: F.white, borderRadius: 8, width: 500, maxHeight: "75vh", display: "flex", flexDirection: "column", boxShadow: "0 16px 48px rgba(0,0,0,0.2)" }}>
          <div style={{ background: F.shell, color: "white", padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", borderRadius: "8px 8px 0 0" }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Vendor Search</span>
            <button onClick={() => setShowVendorModal(false)} style={{ background: "none", border: "none", color: "white", fontSize: 18, cursor: "pointer" }}>✕</button>
          </div>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${F.border}` }}>
            <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search by vendor code or name..."
              style={{ width: "100%", padding: "8px 12px", border: `1px solid #ccc`, borderRadius: 4, fontSize: 13, boxSizing: "border-box" }} />
          </div>
          <div style={{ overflowY: "auto", flex: 1 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead><tr style={{ background: "#e8ecf0", position: "sticky", top: 0 }}><th style={{ padding: "8px 14px", textAlign: "left" }}>Code</th><th style={{ padding: "8px 14px", textAlign: "left" }}>Name</th><th style={{ padding: "8px 14px", textAlign: "left" }}>ABN</th></tr></thead>
              <tbody>
                {filtered.map((v, i) => (
                  <tr key={v.code} onClick={() => { setPoData({...poData, vendor: v}); setErrors({...errors, vendor: ""}); setShowVendorModal(false); addLog(`Vendor ${v.code} — ${v.name} selected`); }}
                    style={{ background: i%2===0?F.white:"#f8f9fb", cursor: "pointer", borderBottom: `1px solid ${F.border}` }}
                    onMouseEnter={e => e.currentTarget.style.background = "#e8f2ff"}
                    onMouseLeave={e => e.currentTarget.style.background = i%2===0?F.white:"#f8f9fb"}>
                    <td style={{ padding: "10px 14px", color: F.blue, fontWeight: 600 }}>{v.code}</td>
                    <td style={{ padding: "10px 14px" }}>{v.name}</td>
                    <td style={{ padding: "10px 14px", color: F.textMid }}>{v.abn}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: "8px 16px", borderTop: `1px solid ${F.border}`, fontSize: 11, color: F.textMid }}>{filtered.length} vendors found</div>
        </div>
      </div>
    );
  }

  function RetentionModal() {
    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ background: F.white, borderRadius: 8, width: 420, boxShadow: "0 16px 48px rgba(0,0,0,0.2)" }}>
          <div style={{ background: F.shell, color: "white", padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", borderRadius: "8px 8px 0 0" }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Retention Code — 6 Entries Found</span>
            <button onClick={() => setShowRetModal(false)} style={{ background: "none", border: "none", color: "white", fontSize: 18, cursor: "pointer" }}>✕</button>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr style={{ background: "#e8ecf0" }}><th style={{ padding: "8px 14px", textAlign: "left" }}>Code</th><th style={{ padding: "8px 14px", textAlign: "right" }}>Ret. %</th><th style={{ padding: "8px 14px", textAlign: "right" }}>Max Ret. %</th></tr></thead>
            <tbody>
              {RET_CODES.map((r, i) => (
                <tr key={r.code} onClick={() => { setPoData({...poData, retCode: r}); setErrors({...errors, retCode: ""}); setShowRetModal(false); addLog(`Retention code ${r.code} selected — ${r.retPct}% / Max ${r.maxPct}%`); }}
                  style={{ background: i%2===0?F.white:"#f8f9fb", cursor: "pointer", borderBottom: `1px solid ${F.border}` }}
                  onMouseEnter={e => e.currentTarget.style.background = "#e8f2ff"}
                  onMouseLeave={e => e.currentTarget.style.background = i%2===0?F.white:"#f8f9fb"}>
                  <td style={{ padding: "10px 14px", color: F.blue, fontWeight: 700 }}>{r.code}</td>
                  <td style={{ padding: "10px 14px", textAlign: "right" }}>{r.retPct}</td>
                  <td style={{ padding: "10px 14px", textAlign: "right" }}>{r.maxPct}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: "8px 16px", borderTop: `1px solid ${F.border}`, fontSize: 11, color: F.textMid }}>6 entries found · Click a row to select</div>
        </div>
      </div>
    );
  }
}

function GlossaryModal({ lang, t, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 8, width: 560, maxHeight: "80vh", display: "flex", flexDirection: "column", boxShadow: "0 16px 48px rgba(0,0,0,0.2)" }}>
        <div style={{ background: "#354a5e", color: "white", padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", borderRadius: "8px 8px 0 0" }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>📖 Term Glossary</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "white", fontSize: 18, cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ overflowY: "auto", flex: 1, padding: 20 }}>
          {Object.entries(GLOSSARY).map(([term, defs]) => (
            <div key={term} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid #eee" }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "#0070f2", marginBottom: 5 }}>{term}</div>
              <div style={{ fontSize: 12, color: "#32363a", lineHeight: 1.6 }}>{defs[lang] || defs.en}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
