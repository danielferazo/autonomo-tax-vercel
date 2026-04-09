import { useState, useEffect } from "react";

const CLAUDE_MODEL = "claude-sonnet-4-20250514";

const EXPENSE_CATEGORIES = [
  { key: "rent",        label: "Rent / Alquiler",           labelES: "Alquiler",      deductPct: 0.20, ivaRate: 0    },
  { key: "electricity", label: "Electricity / Luz",          labelES: "Electricidad",  deductPct: 0.20, ivaRate: 0.21 },
  { key: "water",       label: "Water / Agua",               labelES: "Agua",          deductPct: 0.20, ivaRate: 0    },
  { key: "internet",    label: "Internet",                   labelES: "Internet",      deductPct: 0.50, ivaRate: 0.21 },
  { key: "phone",       label: "Phone / Móvil",              labelES: "Teléfono",      deductPct: 0.50, ivaRate: 0.21 },
  { key: "cuota",       label: "Cuota Autónomos",            labelES: "Cuota SS",      deductPct: 1.00, ivaRate: 0    },
  { key: "software",    label: "Software / Subscriptions",   labelES: "Software",      deductPct: 1.00, ivaRate: 0.21 },
  { key: "hardware",    label: "Hardware / Equipment",       labelES: "Equipamiento",  deductPct: 1.00, ivaRate: 0.21 },
  { key: "other",       label: "Other Professional",         labelES: "Otros",         deductPct: 1.00, ivaRate: 0.21 },
];

const QUARTERS  = ["Q1 (Jan–Mar)", "Q2 (Apr–Jun)", "Q3 (Jul–Sep)", "Q4 (Oct–Dec)"];
const DEADLINES = ["April 20",     "July 20",      "October 20",   "January 20"  ];
const PERIODO_MAP = ["1T", "2T", "3T", "4T"];

const fmt    = n => "€" + Number(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const fmtUSD = n => "$" + Number(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const pct    = n => (Number(n || 0) * 100).toFixed(0) + "%";
const fmtNum = n => Number(n || 0).toFixed(2);

async function callClaude(prompt, fileBase64 = null, mediaType = "image/jpeg") {
  const content = [];
  if (fileBase64) {
    if (mediaType === "application/pdf") {
      content.push({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: fileBase64 },
      });
    } else {
      content.push({
        type: "image",
        source: { type: "base64", media_type: mediaType, data: fileBase64 },
      });
    }
  }
  content.push({ type: "text", text: prompt });

  let bodyStr;
  try {
    bodyStr = JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 1000,
      messages: [{ role: "user", content }],
    });
  } catch (jsonErr) {
    throw new Error("Failed to serialize request: " + jsonErr.message);
  }

  // Retry with exponential backoff (handles rate limits + transient errors)
  const maxAttempts = 4;
  let lastErr;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      // Exponential backoff: 2s, 4s, 8s
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(r => setTimeout(r, delay));
    }
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: bodyStr,
      });
      // Handle rate limiting explicitly
      if (res.status === 429) {
        const retryAfter = res.headers.get("retry-after");
        const wait = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt + 1) * 1000;
        lastErr = new Error("Rate limited — retrying in " + (wait/1000) + "s");
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
      if (res.status === 529) {
        lastErr = new Error("API overloaded — retrying");
        continue;
      }
      if (!res.ok) {
        const errText = await res.text().catch(() => "unknown error");
        throw new Error(`API ${res.status}: ${errText.slice(0, 200)}`);
      }
      const data = await res.json();
      const text = data.content?.[0]?.text || "";
      if (!text) throw new Error("Empty response from API");
      return text;
    } catch (err) {
      lastErr = err;
      // Only retry on network/transient errors, not on clear API rejections
      if (err.message?.includes("API 4") && !err.message?.includes("API 429") && !err.message?.includes("API 408")) {
        throw err; // 400, 401, 403 etc — don't retry
      }
    }
  }
  throw lastErr;
}

// Throttle helper — ensures minimum gap between calls
let lastApiCall = 0;
async function throttledCallClaude(prompt, fileBase64, mediaType) {
  const minGap = 1500; // 1.5s between calls
  const now = Date.now();
  const elapsed = now - lastApiCall;
  if (elapsed < minGap) {
    await new Promise(r => setTimeout(r, minGap - elapsed));
  }
  lastApiCall = Date.now();
  return callClaude(prompt, fileBase64, mediaType);
}

async function fetchUSDtoEUR(dateStr) {
  try {
    const res  = await fetch(`https://api.frankfurter.app/${dateStr}?from=USD&to=EUR`);
    const data = await res.json();
    if (data?.rates?.EUR) return { rate: data.rates.EUR, date: data.date };
    const d = new Date(dateStr);
    for (let i = 1; i <= 7; i++) {
      d.setDate(d.getDate() - 1);
      const fb = d.toISOString().split("T")[0];
      const r2 = await fetch(`https://api.frankfurter.app/${fb}?from=USD&to=EUR`);
      const d2 = await r2.json();
      if (d2?.rates?.EUR) return { rate: d2.rates.EUR, date: d2.date };
    }
  } catch {}
  return null;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const dataUrl = reader.result;
        // dataUrl format: "data:<mime>;base64,<data>"
        const idx = dataUrl.indexOf(",");
        if (idx === -1) { reject(new Error("No comma in data URL")); return; }
        // Clean: strip whitespace, newlines, carriage returns
        const base64 = dataUrl.substring(idx + 1).replace(/[\s\r\n]/g, "");
        // Validate: base64 should only contain A-Za-z0-9+/=
        if (!/^[A-Za-z0-9+/=]+$/.test(base64.substring(0, 100))) {
          reject(new Error("Invalid characters in base64 output"));
          return;
        }
        resolve(base64);
      } catch (e) {
        reject(new Error("base64 encode failed: " + e.message));
      }
    };
    reader.onerror = () => reject(new Error("FileReader error for " + file.name));
    reader.readAsDataURL(file);
  });
}

function getMediaType(file) {
  if (file.type && file.type !== "application/octet-stream") return file.type;
  const ext = file.name.toLowerCase().split(".").pop();
  const map = { pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", webp: "image/webp" };
  return map[ext] || "application/pdf";
}

function sortInvoices(arr) {
  return [...arr].sort((a, b) => {
    const na = parseInt(a.number?.replace(/\D/g, "")) || 0;
    const nb = parseInt(b.number?.replace(/\D/g, "")) || 0;
    return na - nb;
  });
}

function effectivePct(key, homeOfficePct) {
  if (["rent", "electricity", "water"].includes(key)) return homeOfficePct / 100;
  return EXPENSE_CATEGORIES.find(c => c.key === key)?.deductPct ?? 1;
}

/* ═══════════════════════════════════════════
   Casilla Component — mimics Agencia Tributaria
   ═══════════════════════════════════════════ */
function Casilla({ num, label, value, highlight, sublabel, editable, onChange, color }) {
  const isNeg = parseFloat(value) < 0;
  return (
    <div style={{
      display: "flex", alignItems: "stretch", borderBottom: "1px solid #C4B8AC",
      background: highlight ? "#FFF9E8" : "transparent",
      minHeight: 42,
    }}>
      <div style={{
        width: 52, minWidth: 52, display: "flex", alignItems: "center", justifyContent: "center",
        background: "#1A1A2E", color: "#F7F4EF", fontFamily: "'JetBrains Mono', monospace",
        fontSize: 12, fontWeight: "bold", letterSpacing: 0.5,
      }}>
        [{num}]
      </div>
      <div style={{ flex: 1, padding: "8px 12px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ fontSize: 12, color: "#4A3F35", lineHeight: 1.3 }}>{label}</div>
        {sublabel && <div style={{ fontSize: 10, color: "#9B8B7A", marginTop: 2 }}>{sublabel}</div>}
      </div>
      <div style={{
        width: 140, minWidth: 140, display: "flex", alignItems: "center", justifyContent: "flex-end",
        padding: "4px 12px", fontFamily: "'JetBrains Mono', monospace", fontSize: 14,
        fontWeight: highlight ? "bold" : "normal",
        color: color || (isNeg ? "#2E7D32" : highlight ? "#C9392B" : "#1A1A1A"),
        borderLeft: "1px solid #D4CBC0",
      }}>
        {editable ? (
          <input
            type="number" step="0.01" value={value}
            onChange={e => onChange(e.target.value)}
            style={{
              width: "100%", textAlign: "right", border: "1px solid #C4B8AC", borderRadius: 3,
              padding: "3px 6px", fontSize: 13, fontFamily: "'JetBrains Mono', monospace",
              background: "#FFFDE7",
            }}
          />
        ) : (
          fmtNum(value)
        )}
      </div>
    </div>
  );
}

function SectionHeader({ title, color }) {
  return (
    <div style={{
      padding: "8px 12px", background: color || "#EDE8E0",
      fontSize: 11, fontWeight: "bold", letterSpacing: 1.5, textTransform: "uppercase",
      color: color === "#1A1A2E" ? "#F7F4EF" : "#4A3F35",
      borderBottom: "2px solid #1A1A2E",
    }}>
      {title}
    </div>
  );
}

function FormHeader({ modelo, periodo, year, ejercicio, nif }) {
  return (
    <div style={{
      background: "#1A1A2E", color: "#F7F4EF", padding: "16px 20px",
      display: "flex", justifyContent: "space-between", alignItems: "center",
      borderRadius: "6px 6px 0 0", flexWrap: "wrap", gap: 8,
    }}>
      <div>
        <div style={{ fontSize: 10, letterSpacing: 2, color: "#9B8B7A", textTransform: "uppercase" }}>
          Agencia Tributaria — Autoliquidación
        </div>
        <div style={{ fontSize: 22, fontWeight: "bold", fontFamily: "'JetBrains Mono', monospace", marginTop: 4 }}>
          Modelo {modelo}
        </div>
        <div style={{ fontSize: 12, color: "#9B8B7A", marginTop: 2 }}>
          {modelo === "303" ? "Impuesto sobre el Valor Añadido (IVA)" : "IRPF — Pago Fraccionado"}
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 11, color: "#9B8B7A" }}>Ejercicio: <strong style={{ color: "#F7F4EF" }}>{ejercicio || year}</strong></div>
        <div style={{ fontSize: 11, color: "#9B8B7A" }}>Período: <strong style={{ color: "#F7F4EF" }}>{periodo}</strong></div>
        {nif && <div style={{ fontSize: 11, color: "#9B8B7A" }}>NIF: <strong style={{ color: "#F7F4EF" }}>{nif}</strong></div>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════ */
export default function AutonomoTaxPrep() {
  const [tab,           setTab          ] = useState("invoices");
  const [quarter,       setQuarter      ] = useState(0);
  const [year,          setYear         ] = useState(new Date().getFullYear());
  const [homeOfficePct, setHomeOfficePct] = useState(20);
  const [invoices,      setInvoices     ] = useState([]);
  const [expenses,      setExpenses     ] = useState([]);
  const [parsing,       setParsing      ] = useState(false);
  const [parseStatus,   setParseStatus  ] = useState("");
  const [parseErrors,   setParseErrors  ] = useState([]);
  const [savedProfile,  setSavedProfile ] = useState(null);
  const [manualInv,     setManualInv    ] = useState({ number:"", date:"", datePaid:"", client:"", gross:"", currency:"USD", exchangeRate:"", ivaRate:0, irpfPct:15 });
  const [manualExp,     setManualExp    ] = useState({ category:"cuota", description:"", gross:"", isFixed:false });
  const [nif,           setNif          ] = useState("");

  // Prior quarters cumulative data (user enters manually for Modelo 130)
  const [priorIngresos,   setPriorIngresos  ] = useState(0);
  const [priorGastos,     setPriorGastos    ] = useState(0);
  const [priorPagos,      setPriorPagos     ] = useState(0);
  const [priorRetenciones,setPriorRetenciones] = useState(0);
  const [prior303,        setPrior303       ] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get("autonomo_profile_v2");
        if (r?.value) {
          const p = JSON.parse(r.value);
          setSavedProfile(p);
        }
      } catch {}
    })();
  }, []);

  async function saveProfile() {
    const profile = {
      homeOfficePct, nif, prior303,
      fixedExpenses: expenses.filter(e => e.isFixed),
      priorIngresos, priorGastos, priorPagos, priorRetenciones,
    };
    try {
      await window.storage.set("autonomo_profile_v2", JSON.stringify(profile));
      setSavedProfile(profile);
      alert("Profile saved.");
    } catch { alert("Save failed."); }
  }

  function loadProfile() {
    if (!savedProfile) return;
    setHomeOfficePct(savedProfile.homeOfficePct || 20);
    setNif(savedProfile.nif || "");
    setPrior303(savedProfile.prior303 || 0);
    setPriorIngresos(savedProfile.priorIngresos || 0);
    setPriorGastos(savedProfile.priorGastos || 0);
    setPriorPagos(savedProfile.priorPagos || 0);
    setPriorRetenciones(savedProfile.priorRetenciones || 0);
    setExpenses(prev => [...prev.filter(e => !e.isFixed),
      ...(savedProfile.fixedExpenses || []).map(e => ({ ...e, id: Date.now() + Math.random() }))]);
  }

  async function parseInvoiceFile(file) {
    if (file.size > 8 * 1024 * 1024) {
      throw new Error(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB) — max ~8MB`);
    }
    const mediaType = getMediaType(file);
    const base64 = await fileToBase64(file);
    if (!base64 || base64.length < 20) {
      throw new Error("File produced empty or invalid base64 data");
    }
    let raw;
    try {
      raw = await throttledCallClaude(`Extract from this invoice and return ONLY valid JSON, no markdown:
{
  "invoiceNumber": "string or null",
  "date": "YYYY-MM-DD (invoice date) or null",
  "clientName": "string or null",
  "grossAmount": number,
  "ivaAmount": number (0 if none),
  "irpfAmount": number (0 if none),
  "currency": "USD or EUR"
}`, base64, mediaType);
    } catch (apiErr) {
      throw new Error("API call failed: " + apiErr.message);
    }
    try { return JSON.parse(raw.replace(/```json|```/g, "").trim()); }
    catch { throw new Error("API returned non-JSON: " + raw.slice(0, 120)); }
  }

  async function handleInvoiceUpload(e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setParsing(true);
    setParseErrors([]);
    const errors = [];
    let addedCount = 0;
    for (let i = 0; i < files.length; i++) {
      setParseStatus(`📄 Scanning invoice ${i + 1} of ${files.length}: ${files[i].name}…${i > 0 ? " (throttled to avoid rate limits)" : ""}`);
      try {
        const parsed = await parseInvoiceFile(files[i]);
        if (!parsed) { errors.push(`${files[i].name}: Could not parse response as JSON`); continue; }
        const currency  = (parsed.currency || "USD").toUpperCase();
        const grossOrig = parseFloat(parsed.grossAmount) || 0;
        if (grossOrig === 0) { errors.push(`${files[i].name}: Parsed but gross amount was 0 — check the document`); }
        let grossEUR = grossOrig, fxRate = null, fxDate = null;
        if (currency === "USD") {
          // FX rate entered manually in the rate column after upload — not an error
        }
        const uniqueId = Date.now() + Math.random();
        const newInvoice = {
          id: uniqueId, filename: files[i].name,
          number: parsed.invoiceNumber || `INV-${files[i].name.replace(/\.[^.]+$/, "")}`,
          date: parsed.date || "", datePaid: "", client: parsed.clientName || "Unknown",
          currency, grossOrig, fxRate, fxDate, gross: grossEUR,
          ivaCollected: parseFloat(parsed.ivaAmount)  || 0,
          irpfRetained: parseFloat(parsed.irpfAmount) || 0,
        };
        // Add each invoice to state immediately so user sees progress
        setInvoices(prev => sortInvoices([...prev, newInvoice]));
        addedCount++;
        setParseStatus(`Added ${addedCount} of ${files.length} invoices…`);
      } catch (err) {
        errors.push(`${files[i].name}: ${err.message || "Unknown error"}`);
      }
    }
    setParseErrors(errors);
    setParsing(false); setParseStatus(""); e.target.value = "";
  }

  async function handleExpenseUpload(e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setParsing(true);
    setParseErrors([]);
    const errors = [];
    let addedCount = 0;
    for (let i = 0; i < files.length; i++) {
      setParseStatus(`🧾 Scanning expense ${i + 1} of ${files.length}: ${files[i].name}…${i > 0 ? " (throttled)" : ""}`);
      try {
        const mediaType = getMediaType(files[i]);
        const base64 = await fileToBase64(files[i]);
        const catList   = EXPENSE_CATEGORIES.map(c => c.key).join(", ");
        const raw = await throttledCallClaude(`Expense receipt. Return ONLY valid JSON, no markdown:
{
  "description": "short label",
  "gross": number,
  "ivaAmount": number (0 if none),
  "category": "one of: ${catList}"
}`, base64, mediaType);
        const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
        const cat = EXPENSE_CATEGORIES.find(c => c.key === parsed.category) || EXPENSE_CATEGORIES[8];
        const ep  = effectivePct(cat.key, homeOfficePct);
        const g   = parseFloat(parsed.gross) || 0;
        if (g === 0) { errors.push(`${files[i].name}: Parsed but gross was 0 — check the receipt`); }
        const newExpense = {
          id: Date.now() + Math.random(), filename: files[i].name,
          description: parsed.description || files[i].name,
          category: cat.key, gross: g,
          ivaPaid: parseFloat(parsed.ivaAmount) || 0,
          deductPct: ep, isFixed: false,
        };
        // Add each expense to state immediately
        setExpenses(prev => [...prev, newExpense]);
        addedCount++;
        setParseStatus(`Added ${addedCount} of ${files.length} expenses…`);
      } catch (err) {
        errors.push(`${files[i].name}: ${err.message || "Unknown error"}`);
      }
    }
    setParseErrors(errors);
    setParsing(false); setParseStatus(""); e.target.value = "";
  }

  async function addManualInvoice() {
    if (!manualInv.gross) return;
    const currency  = manualInv.currency;
    const grossOrig = parseFloat(manualInv.gross) || 0;
    let grossEUR = grossOrig, fxRate = parseFloat(manualInv.exchangeRate) || null, fxDate = null;
    if (currency === "USD") {
      if (!fxRate && manualInv.date) {
        setParsing(true); setParseStatus("Fetching ECB rate…");
        const fx = await fetchUSDtoEUR(manualInv.date);
        if (fx) { fxRate = fx.rate; fxDate = fx.date; }
        setParsing(false); setParseStatus("");
      }
      if (fxRate) grossEUR = grossOrig * fxRate;
    }
    const ivaC = grossEUR * (parseFloat(manualInv.ivaRate)  / 100);
    const irpfR= grossEUR * (parseFloat(manualInv.irpfPct)  / 100);
    setInvoices(prev => sortInvoices([...prev, {
      id: Date.now(), filename: "manual",
      number: manualInv.number || `INV-${invoices.length + 1}`,
      date: manualInv.date || "", datePaid: manualInv.datePaid || "", client: manualInv.client || "Client",
      currency, grossOrig, fxRate, fxDate, gross: grossEUR,
      ivaCollected: ivaC, irpfRetained: irpfR,
    }]));
    setManualInv({ number:"", date:"", client:"", gross:"", currency:"USD", exchangeRate:"", ivaRate:0, irpfPct:15, datePaid:"" });
  }

  function addManualExpense() {
    if (!manualExp.gross) return;
    const cat = EXPENSE_CATEGORIES.find(c => c.key === manualExp.category) || EXPENSE_CATEGORIES[8];
    const ep  = effectivePct(cat.key, homeOfficePct);
    const g   = parseFloat(manualExp.gross) || 0;
    setExpenses(prev => [...prev, {
      id: Date.now(), filename: "manual",
      description: manualExp.description || cat.label,
      category: cat.key, gross: g,
      ivaPaid: g * cat.ivaRate / (1 + cat.ivaRate),
      deductPct: ep, isFixed: manualExp.isFixed || false,
    }]);
    setManualExp({ category:"cuota", description:"", gross:"", isFixed:false });
  }

  function updateFxRate(id, newRate) {
    setInvoices(prev => prev.map(inv => {
      if (inv.id !== id || inv.currency !== "USD") return inv;
      const rate    = parseFloat(newRate) || inv.fxRate;
      if (!rate) return inv;
      const grossEUR = inv.grossOrig * rate;
      // If original gross was 0 or same as grossOrig (no prior conversion), convert directly
      const oldGross = inv.gross || inv.grossOrig;
      if (oldGross === 0) return { ...inv, fxRate: rate, gross: grossEUR };
      const ratio   = grossEUR / oldGross;
      return { ...inv, fxRate: rate, gross: grossEUR, ivaCollected: inv.ivaCollected * ratio, irpfRetained: inv.irpfRetained * ratio };
    }));
  }

  function removeInvoice(id) { setInvoices(prev => prev.filter(i => i.id !== id)); }
  function removeExpense(id) { setExpenses(prev => prev.filter(e => e.id !== id)); }
  function updateDatePaid(id, val) {
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, datePaid: val } : inv));
  }

  // ═══ QUARTER DATE HELPERS ═══
  const quarterStartMonth = [0, 3, 6, 9]; // Jan, Apr, Jul, Oct
  function isInQuarter(dateStr) {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d)) return false;
    const m = d.getMonth();
    const y = d.getFullYear();
    return y === year && m >= quarterStartMonth[quarter] && m <= quarterStartMonth[quarter] + 2;
  }

  // Split invoices: "realized" = paid in this quarter, "unrealized" = no datePaid or paid in different quarter
  const realizedInvoices   = invoices.filter(i => isInQuarter(i.datePaid));
  const unrealizedInvoices = invoices.filter(i => !isInQuarter(i.datePaid));

  // ═══ COMPUTED VALUES (only realized invoices count toward tax) ═══
  const totalGross        = realizedInvoices.reduce((s, i) => s + i.gross,             0);
  const totalIvaCollected = realizedInvoices.reduce((s, i) => s + i.ivaCollected,      0);
  const totalIrpfRetained = realizedInvoices.reduce((s, i) => s + i.irpfRetained,      0);
  const totalNetReceived  = totalGross - totalIvaCollected - totalIrpfRetained;
  const totalExpenseGross = expenses.reduce((s, e) => s + e.gross,             0);
  // Use live homeOfficePct for deduction calculations, not the frozen deductPct
  const getDeductPct      = (e) => effectivePct(e.category, homeOfficePct);
  const totalDeductible   = expenses.reduce((s, e) => s + e.gross * getDeductPct(e), 0);
  const totalIvaPaid      = expenses.reduce((s, e) => s + (e.ivaPaid || 0),    0);

  // IVA calculations
  const numOperations     = realizedInvoices.length;
  const baseImponibleIva  = totalGross - totalIvaCollected;
  const ivaRepercutido    = totalIvaCollected;
  const ivaSoportado      = totalIvaPaid;
  const netIvaToPay       = ivaRepercutido - ivaSoportado;
  const net303Result      = netIvaToPay - prior303;

  // IRPF calculations — this quarter only
  const qIngresos         = totalGross - totalIvaCollected; // net revenue (base imponible)
  const qGastos           = totalDeductible;

  // IRPF — cumulative YTD for Modelo 130
  const ytdIngresos       = parseFloat(priorIngresos) + qIngresos;
  const ytdGastos         = parseFloat(priorGastos)   + qGastos;
  const ytdRendimiento    = ytdIngresos - ytdGastos;
  const ytd20Pct          = ytdRendimiento * 0.20;
  const ytdPriorPagos     = parseFloat(priorPagos)    || 0;
  const ytdRetenciones    = parseFloat(priorRetenciones) + totalIrpfRetained;
  const m130Result        = ytd20Pct - ytdPriorPagos - ytdRetenciones;

  const quarterLabel      = `${QUARTERS[quarter].split(" ")[0]} ${year}`;
  const periodo           = PERIODO_MAP[quarter];
  const deadline          = quarter === 3 ? `${DEADLINES[quarter]} ${year + 1}` : `${DEADLINES[quarter]} ${year}`;

  // ═══ TAB CONFIG ═══
  const tabs = [
    { key: "invoices", label: `Facturas (${invoices.length})`, icon: "📄" },
    { key: "expenses", label: `Gastos (${expenses.length})`, icon: "🧾" },
    { key: "m303",     label: "Modelo 303", icon: "🏛️" },
    { key: "m130",     label: "Modelo 130", icon: "🏛️" },
    { key: "summary",  label: "Resumen", icon: "📊" },
  ];

  return (
    <div style={{ fontFamily: "'Georgia','Times New Roman',serif", background: "#F7F4EF", minHeight: "100vh", color: "#1A1A1A" }}>

      {/* ═══ HEADER ═══ */}
      <div style={{ background: "#1A1A2E", color: "#F7F4EF", padding: "20px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: 3, color: "#9B8B7A", textTransform: "uppercase", marginBottom: 4 }}>Agencia Tributaria · Autónomo</div>
          <div style={{ fontSize: 22, fontWeight: "bold", letterSpacing: -0.5 }}>Tax Prep / Preparación Fiscal</div>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <select value={quarter} onChange={e => setQuarter(+e.target.value)} style={ss}>
            {QUARTERS.map((q,i) => <option key={i} value={i}>{q}</option>)}
          </select>
          <input type="number" value={year} onChange={e => setYear(+e.target.value)} style={{ ...ss, width: 80 }} />
          <div style={{ background: "#C9392B", color: "white", padding: "6px 12px", borderRadius: 4, fontSize: 12, fontFamily: "monospace" }}>
            Deadline: {deadline}
          </div>
        </div>
      </div>

      {/* ═══ SETTINGS BAR ═══ */}
      <div style={{ background: "#EDE8E0", padding: "10px 28px", display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap", borderBottom: "1px solid #D4CBC0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
          <span style={{ color: "#6B5E52" }}>NIF:</span>
          <input type="text" value={nif} onChange={e => setNif(e.target.value)} placeholder="12345678A"
            style={{ width: 110, padding: "3px 6px", border: "1px solid #C4B8AC", borderRadius: 4, fontSize: 13, background: "white" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
          <span style={{ color: "#6B5E52" }}>Home office %:</span>
          <input type="number" min={0} max={100} value={homeOfficePct} onChange={e => setHomeOfficePct(+e.target.value)}
            style={{ width: 55, padding: "3px 6px", border: "1px solid #C4B8AC", borderRadius: 4, fontSize: 13, background: "white" }} />
          <span style={{ color: "#9B8B7A", fontSize: 11 }}>(rent / utilities)</span>
        </div>
        <button onClick={saveProfile} style={btnSec}>Save Profile</button>
        {savedProfile && <button onClick={loadProfile} style={btnSec}>Load Saved</button>}
      </div>

      {/* ═══ TABS ═══ */}
      <div style={{ display: "flex", borderBottom: "2px solid #D4CBC0", background: "#EDE8E0", paddingLeft: 28, flexWrap: "wrap" }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: "12px 18px", border: "none",
            borderBottom: tab === t.key ? "3px solid #1A1A2E" : "3px solid transparent",
            background: "transparent", fontSize: 13, fontFamily: "Georgia,serif",
            fontWeight: tab === t.key ? "bold" : "normal",
            color: tab === t.key ? "#1A1A2E" : "#6B5E52", cursor: "pointer", letterSpacing: 0.5,
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {parsing && (
        <div style={{ background: "#1A1A2E", color: "#F7F4EF", padding: "10px 28px", fontSize: 13, fontFamily: "monospace" }}>
          ⏳ {parseStatus}
        </div>
      )}

      {parseErrors.length > 0 && !parsing && (
        <div style={{ background: "#FFF3F0", border: "1px solid #FFCDD2", padding: "12px 28px", fontSize: 12, color: "#C62828" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: parseErrors.length > 1 ? 6 : 0 }}>
            <strong>⚠ {parseErrors.length} issue{parseErrors.length > 1 ? "s" : ""} during parsing:</strong>
            <button onClick={() => setParseErrors([])} style={{ background: "none", border: "none", color: "#C62828", cursor: "pointer", fontSize: 14 }}>✕</button>
          </div>
          {parseErrors.map((err, i) => (
            <div key={i} style={{ padding: "2px 0", fontFamily: "monospace", fontSize: 11 }}>· {err}</div>
          ))}
        </div>
      )}

      <div style={{ padding: "24px 28px", maxWidth: 1200 }}>

        {/* ══════════════════════════
            INVOICES TAB
           ══════════════════════════ */}
        {tab === "invoices" && (
          <div>
            <label style={uploadBtnStyle}>
              📎 Upload Invoices (PDF / Image)
              <input type="file" accept=".pdf,image/*" multiple onChange={handleInvoiceUpload} style={{ display: "none" }} />
            </label>

            <div style={{ margin: "12px 0", padding: "10px 14px", background: "#E8F4FD", border: "1px solid #90CAF9", borderRadius: 5, fontSize: 12, color: "#1565C0", lineHeight: 1.5 }}>
              💱 USD invoices auto-fetch the ECB historical rate for the invoice date. Override any rate inline after parsing.
            </div>
            <div style={{ margin: "0 0 12px", padding: "10px 14px", background: "#FFF8E1", border: "1px solid #FFD54F", borderRadius: 5, fontSize: 12, color: "#5D4037", lineHeight: 1.5 }}>
              📅 <strong>Date Paid matters for tax:</strong> Only invoices with a <em>Date Paid</em> that falls within the selected quarter ({PERIODO_MAP[quarter]}) count toward your tax calculations.
              Rows highlighted <span style={{ background: "#FFF8E1", padding: "0 4px", border: "1px solid #FFD54F", borderRadius: 2 }}>yellow</span> = pending payment,
              <span style={{ background: "#F3E5F5", padding: "0 4px", border: "1px solid #CE93D8", borderRadius: 2 }}>purple</span> = paid in a different quarter (excluded from this quarter's totals).
            </div>

            <div style={card}>
              <div style={cardTitle}>Manual Entry</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
                <F label="Invoice #"  v={manualInv.number}       s={v => setManualInv(p=>({...p,number:v}))}       ph="2025-001" w={95} />
                <F label="Invoiced"  v={manualInv.date}         s={v => setManualInv(p=>({...p,date:v}))}         t="date"      w={135}/>
                <F label="Date Paid" v={manualInv.datePaid}     s={v => setManualInv(p=>({...p,datePaid:v}))}     t="date"      w={135}/>
                <F label="Client"     v={manualInv.client}       s={v => setManualInv(p=>({...p,client:v}))}       ph="Client"   w={150}/>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={lbl}>Currency</label>
                  <select value={manualInv.currency} onChange={e => setManualInv(p=>({...p,currency:e.target.value}))}
                    style={{ padding: "5px 8px", border: "1px solid #C4B8AC", borderRadius: 4, fontSize: 13, background: "white" }}>
                    <option value="USD">USD $</option>
                    <option value="EUR">EUR €</option>
                  </select>
                </div>
                <F label={manualInv.currency === "USD" ? "Amount (USD)" : "Amount (EUR)"}
                   v={manualInv.gross} s={v => setManualInv(p=>({...p,gross:v}))} t="number" ph="0.00" w={110}/>
                {manualInv.currency === "USD" && (
                  <F label="Rate override (opt.)" v={manualInv.exchangeRate} s={v => setManualInv(p=>({...p,exchangeRate:v}))} t="number" ph="auto" w={110}/>
                )}
                <F label="IVA %"  v={manualInv.ivaRate}  s={v => setManualInv(p=>({...p,ivaRate:v}))}  t="number" w={60}/>
                <F label="IRPF %" v={manualInv.irpfPct}  s={v => setManualInv(p=>({...p,irpfPct:v}))} t="number" w={60}/>
                <button onClick={addManualInvoice} style={btnPri}>Add</button>
              </div>
            </div>

            {invoices.length > 0 && (
              <div style={card}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: "#1A1A2E", color: "#F7F4EF" }}>
                        {["#","Invoice No.","Invoiced","Date Paid","Client","Original","ECB Rate","Rate Date","EUR Gross","IVA","IRPF","Net EUR",""].map(h=>(
                          <th key={h} style={{ padding: "8px 9px", textAlign: "left", fontWeight: "normal", letterSpacing: 0.5, fontSize: 11, whiteSpace: "nowrap",
                            ...(h === "Date Paid" ? { background: "#2E4057", color: "#FFD54F" } : {})
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((inv,i) => {
                        const realized = isInQuarter(inv.datePaid);
                        const noPaid = !inv.datePaid;
                        return (
                        <tr key={inv.id} style={{
                          background: noPaid ? "#FFF8E1" : realized ? (i%2===0 ? "white" : "#F7F4EF") : "#F5F0FF",
                          borderBottom: "1px solid #E8E0D8",
                          opacity: (!noPaid && !realized) ? 0.6 : 1,
                        }}>
                          <td style={td}>{i+1}</td>
                          <td style={{ ...td, fontFamily: "monospace", fontWeight: "bold" }}>{inv.number}</td>
                          <td style={{ ...td, whiteSpace: "nowrap" }}>{inv.date}</td>
                          <td style={td}>
                            <input type="date" value={inv.datePaid || ""}
                              onChange={e => updateDatePaid(inv.id, e.target.value)}
                              style={{
                                width: 120, padding: "2px 4px", border: `1px solid ${noPaid ? "#FFD54F" : realized ? "#81C784" : "#CE93D8"}`,
                                borderRadius: 3, fontSize: 11, fontFamily: "monospace",
                                background: noPaid ? "#FFF8E1" : realized ? "#E8F5E9" : "#F3E5F5",
                              }}
                            />
                            {noPaid && <div style={{ fontSize: 9, color: "#F57F17", marginTop: 2 }}>pending</div>}
                            {!noPaid && !realized && <div style={{ fontSize: 9, color: "#7B1FA2", marginTop: 2 }}>other Q</div>}
                          </td>
                          <td style={td}>{inv.client}</td>
                          <td style={{ ...td, fontFamily: "monospace", color: inv.currency==="USD" ? "#1565C0" : "#4A3F35" }}>
                            {inv.currency==="USD" ? fmtUSD(inv.grossOrig) : fmt(inv.grossOrig)}
                          </td>
                          <td style={td}>
                            {inv.currency==="USD" ? (
                              <input type="text" inputMode="decimal"
                                defaultValue={inv.fxRate ? inv.fxRate.toFixed(4) : ""}
                                key={inv.id + "-fx-" + (inv.fxRate || "")}
                                onBlur={e => {
                                  const v = e.target.value.trim();
                                  if (v && !isNaN(parseFloat(v))) updateFxRate(inv.id, v);
                                }}
                                onKeyDown={e => { if (e.key === "Enter") e.target.blur(); }}
                                placeholder="0.0000"
                                style={{ width: 78, padding: "2px 5px", border: "1px solid #C4B8AC", borderRadius: 3, fontSize: 11,
                                  fontFamily: "monospace", background: inv.fxRate ? "#EBF5FB" : "#FFF8E1" }}
                              />
                            ) : <span style={{ color: "#9B8B7A" }}>—</span>}
                          </td>
                          <td style={{ ...td, fontSize: 10, color: "#9B8B7A" }}>{inv.fxDate || "—"}</td>
                          <td style={{ ...td, fontFamily: "monospace", fontWeight: "bold" }}>{fmt(inv.gross)}</td>
                          <td style={{ ...td, fontFamily: "monospace", color: "#2E7D32" }}>{fmt(inv.ivaCollected)}</td>
                          <td style={{ ...td, fontFamily: "monospace", color: "#C9392B" }}>{fmt(inv.irpfRetained)}</td>
                          <td style={{ ...td, fontFamily: "monospace", fontWeight: "bold" }}>{fmt(inv.gross - inv.ivaCollected - inv.irpfRetained)}</td>
                          <td style={td}><button onClick={() => removeInvoice(inv.id)} style={btnDel}>×</button></td>
                        </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: "#1A1A2E", color: "#F7F4EF", fontWeight: "bold" }}>
                        <td colSpan={5} style={{ padding: "10px", fontSize: 12 }}>
                          REALIZED IN {PERIODO_MAP[quarter]} — {realizedInvoices.length} of {invoices.length} invoice{invoices.length!==1?"s":""}
                          {unrealizedInvoices.length > 0 && <span style={{ color: "#FFD54F", marginLeft: 8 }}>({unrealizedInvoices.length} excluded)</span>}
                        </td>
                        <td colSpan={3} style={{ padding: "10px", color: "#9B8B7A", fontSize: 11 }}>realized only →</td>
                        <td style={{ padding: "10px", fontFamily: "monospace" }}>{fmt(totalGross)}</td>
                        <td style={{ padding: "10px", fontFamily: "monospace", color: "#81C784" }}>{fmt(totalIvaCollected)}</td>
                        <td style={{ padding: "10px", fontFamily: "monospace", color: "#EF9A9A" }}>{fmt(totalIrpfRetained)}</td>
                        <td style={{ padding: "10px", fontFamily: "monospace" }}>{fmt(totalNetReceived)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════
            EXPENSES TAB
           ══════════════════════════ */}
        {tab === "expenses" && (
          <div>
            <label style={uploadBtnStyle}>
              📎 Upload Receipts (PDF / Image)
              <input type="file" accept=".pdf,image/*" multiple onChange={handleExpenseUpload} style={{ display: "none" }} />
            </label>

            <div style={{ ...card, marginTop: 16 }}>
              <div style={cardTitle}>Manual Entry</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={lbl}>Category</label>
                  <select value={manualExp.category} onChange={e => setManualExp(p=>({...p,category:e.target.value}))}
                    style={{ padding: "5px 8px", border: "1px solid #C4B8AC", borderRadius: 4, fontSize: 13, background: "white" }}>
                    {EXPENSE_CATEGORIES.map(c => (
                      <option key={c.key} value={c.key}>{c.label} — {pct(effectivePct(c.key, homeOfficePct))}</option>
                    ))}
                  </select>
                </div>
                <F label="Description" v={manualExp.description} s={v => setManualExp(p=>({...p,description:v}))} ph="Vodafone Q1" w={170}/>
                <F label="Gross (€)"   v={manualExp.gross}       s={v => setManualExp(p=>({...p,gross:v}))}       t="number" ph="0.00" w={100}/>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input type="checkbox" id="fixedCb" checked={manualExp.isFixed} onChange={e => setManualExp(p=>({...p,isFixed:e.target.checked}))} />
                  <label htmlFor="fixedCb" style={{ fontSize: 12, color: "#6B5E52" }}>Fixed monthly</label>
                </div>
                <button onClick={addManualExpense} style={btnPri}>Add</button>
              </div>
            </div>

            {expenses.length > 0 && (
              <div style={card}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#1A1A2E", color: "#F7F4EF" }}>
                      {["Description","Category","Gross (€)","Deduct %","Deductible (€)","IVA Paid (€)",""].map(h=>(
                        <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontWeight: "normal", letterSpacing: 0.5, fontSize: 11 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((exp,i) => {
                      const cat = EXPENSE_CATEGORIES.find(c=>c.key===exp.category);
                      const livePct = getDeductPct(exp);
                      return (
                        <tr key={exp.id} style={{ background: i%2===0 ? "white" : "#F7F4EF", borderBottom: "1px solid #E8E0D8" }}>
                          <td style={td}>{exp.description}
                            {exp.isFixed && <span style={{ marginLeft: 6, fontSize: 10, background: "#E8E0D8", padding: "1px 5px", borderRadius: 3 }}>fixed</span>}
                          </td>
                          <td style={{ ...td, color: "#6B5E52", fontStyle: "italic" }}>{cat?.labelES}</td>
                          <td style={{ ...td, fontFamily: "monospace" }}>{fmt(exp.gross)}</td>
                          <td style={{ ...td, fontFamily: "monospace" }}>{pct(livePct)}</td>
                          <td style={{ ...td, fontFamily: "monospace", fontWeight: "bold", color: "#2E7D32" }}>{fmt(exp.gross*livePct)}</td>
                          <td style={{ ...td, fontFamily: "monospace", color: "#1565C0" }}>{fmt(exp.ivaPaid||0)}</td>
                          <td style={td}><button onClick={() => removeExpense(exp.id)} style={btnDel}>×</button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: "#1A1A2E", color: "#F7F4EF", fontWeight: "bold" }}>
                      <td colSpan={2} style={{ padding: "10px", fontSize: 12 }}>TOTALS</td>
                      <td style={{ padding: "10px", fontFamily: "monospace" }}>{fmt(totalExpenseGross)}</td>
                      <td style={{ padding: "10px" }}>—</td>
                      <td style={{ padding: "10px", fontFamily: "monospace", color: "#81C784" }}>{fmt(totalDeductible)}</td>
                      <td style={{ padding: "10px", fontFamily: "monospace", color: "#90CAF9" }}>{fmt(totalIvaPaid)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════
            MODELO 303 — IVA
           ══════════════════════════ */}
        {tab === "m303" && (
          <div>
            {invoices.length > 0 && realizedInvoices.length === 0 && (
              <div style={{ padding: "12px 18px", background: "#FFF3F0", border: "1px solid #FFCDD2", borderRadius: 6, marginBottom: 16, fontSize: 12, color: "#C62828", lineHeight: 1.5 }}>
                ⚠️ You have <strong>{invoices.length} invoice{invoices.length > 1 ? "s" : ""}</strong> loaded but <strong>none</strong> have a Date Paid within {PERIODO_MAP[quarter]} {year}. All tax amounts below will show €0.00. Go to the Facturas tab and set the Date Paid for invoices received this quarter.
              </div>
            )}
            <div style={{ ...card, padding: 0, overflow: "hidden" }}>
              <FormHeader modelo="303" periodo={periodo} year={year} ejercicio={year} nif={nif} />

              {/* Identification */}
              <div style={{ padding: "12px 20px", background: "#F7F4EF", borderBottom: "1px solid #D4CBC0", fontSize: 12 }}>
                <span style={{ color: "#6B5E52" }}>Sujeto Pasivo: </span>
                <strong>{nif || "—"}</strong>
                <span style={{ marginLeft: 20, color: "#6B5E52" }}>Período: </span>
                <strong>{periodo} ({year})</strong>
                <span style={{ marginLeft: 20, color: "#6B5E52" }}>Régimen: </span>
                <strong>General</strong>
              </div>

              {/* IVA Devengado (output/collected) */}
              <SectionHeader title="IVA Devengado — Régimen General" />
              <Casilla num="01" label="Nº de operaciones" sublabel="Number of invoices issued" value={numOperations} />
              <Casilla num="02" label="Base imponible" sublabel="Taxable base (gross revenue minus IVA)" value={baseImponibleIva} />
              <Casilla num="03" label="Cuota (IVA repercutido)" sublabel="IVA collected from clients" value={ivaRepercutido} highlight />

              {/* IVA Deducible (input/paid) */}
              <SectionHeader title="IVA Deducible — Operaciones Interiores" />
              <Casilla num="28" label="Base imponible (gastos deducibles)" sublabel="Taxable base of deductible expenses with IVA" value={expenses.reduce((s,e) => s + (e.ivaPaid > 0 ? e.gross * e.deductPct : 0), 0)} />
              <Casilla num="29" label="Cuota (IVA soportado deducible)" sublabel="Deductible IVA paid on expenses" value={ivaSoportado} highlight />

              {/* Result */}
              <SectionHeader title="Resultado" color="#1A1A2E" />
              <Casilla num="40" label="Suma de cuotas IVA devengado" sublabel="Total IVA devengado [03]" value={ivaRepercutido} />
              <Casilla num="41" label="Suma de IVA deducible" sublabel="Total IVA deducible [29]" value={ivaSoportado} />
              <Casilla num="45" label="Diferencia [40] - [41]" sublabel="IVA devengado minus IVA deducible" value={ivaRepercutido - ivaSoportado} highlight />
              <Casilla num="64" label="Resultado de las autoliquidaciones anteriores" sublabel="Prior 303 filings this year (enter if applicable)" value={prior303} editable onChange={v => setPrior303(parseFloat(v) || 0)} />
              <Casilla num="69" label="Resultado de la autoliquidación"
                sublabel="FINAL RESULT — [45] minus [64]"
                value={net303Result}
                highlight
                color={net303Result > 0 ? "#C9392B" : "#2E7D32"}
              />

              {/* Outcome */}
              <div style={{
                padding: "16px 20px", background: net303Result > 0 ? "#FFF3F0" : "#F0FFF4",
                borderTop: `3px solid ${net303Result > 0 ? "#C9392B" : "#2E7D32"}`,
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <div>
                  <div style={{ fontSize: 11, color: "#6B5E52", letterSpacing: 1, textTransform: "uppercase" }}>
                    {net303Result > 0 ? "A Ingresar (to pay)" : net303Result < 0 ? "A Devolver / Compensar (refund)" : "Sin actividad"}
                  </div>
                  <div style={{ fontSize: 28, fontWeight: "bold", fontFamily: "'JetBrains Mono', monospace", color: net303Result > 0 ? "#C9392B" : "#2E7D32", marginTop: 4 }}>
                    {fmt(Math.abs(net303Result))}
                  </div>
                </div>
                <div style={{ textAlign: "right", fontSize: 12, color: "#6B5E52" }}>
                  <div>Deadline: <strong>{deadline}</strong></div>
                  <div>File via Sede Electrónica</div>
                </div>
              </div>
            </div>

            {/* Explanation */}
            <div style={{ marginTop: 16, padding: "14px 18px", background: "#E8F4FD", border: "1px solid #90CAF9", borderRadius: 6, fontSize: 12, color: "#1565C0", lineHeight: 1.5 }}>
              <strong>How to use this:</strong> Open the Sede Electrónica → Modelo 303 → enter the period ({periodo}) → transfer these casilla values into the form. The key numbers are [03] (IVA collected), [29] (IVA deductible), and [69] (result). If your invoices have no IVA (e.g., services to non-EU clients), casilla [03] will be €0.00 and you may qualify for the "sin actividad" declaration.
            </div>
          </div>
        )}

        {/* ══════════════════════════
            MODELO 130 — IRPF
           ══════════════════════════ */}
        {tab === "m130" && (
          <div>
            {invoices.length > 0 && realizedInvoices.length === 0 && (
              <div style={{ padding: "12px 18px", background: "#FFF3F0", border: "1px solid #FFCDD2", borderRadius: 6, marginBottom: 16, fontSize: 12, color: "#C62828", lineHeight: 1.5 }}>
                ⚠️ No invoices have a Date Paid within {PERIODO_MAP[quarter]} {year}. Set payment dates in the Facturas tab.
              </div>
            )}
            {/* Prior quarters input */}
            {quarter > 0 && (
              <div style={{ ...card, borderTop: "4px solid #FFD54F", marginBottom: 20 }}>
                <div style={cardTitle}>Prior Quarters (Year-to-Date Cumulative)</div>
                <div style={{ fontSize: 12, color: "#6B5E52", marginBottom: 12, lineHeight: 1.5 }}>
                  Modelo 130 is cumulative — you must enter your totals from <strong>prior quarters this year</strong> so the form calculates correctly. If this is Q1, these should all be zero.
                </div>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  <F label="Prior ingresos (€)" v={priorIngresos} s={v => setPriorIngresos(parseFloat(v)||0)} t="number" ph="0" w={130} />
                  <F label="Prior gastos (€)" v={priorGastos} s={v => setPriorGastos(parseFloat(v)||0)} t="number" ph="0" w={130} />
                  <F label="Prior pagos fraccionados (€)" v={priorPagos} s={v => setPriorPagos(parseFloat(v)||0)} t="number" ph="0" w={170} />
                  <F label="Prior retenciones (€)" v={priorRetenciones} s={v => setPriorRetenciones(parseFloat(v)||0)} t="number" ph="0" w={150} />
                </div>
              </div>
            )}

            <div style={{ ...card, padding: 0, overflow: "hidden" }}>
              <FormHeader modelo="130" periodo={periodo} year={year} ejercicio={year} nif={nif} />

              {/* Identification */}
              <div style={{ padding: "12px 20px", background: "#F7F4EF", borderBottom: "1px solid #D4CBC0", fontSize: 12 }}>
                <span style={{ color: "#6B5E52" }}>Contribuyente: </span>
                <strong>{nif || "—"}</strong>
                <span style={{ marginLeft: 20, color: "#6B5E52" }}>Actividad: </span>
                <strong>Estimación Directa Simplificada</strong>
              </div>

              <SectionHeader title="I. Actividades económicas en estimación directa" />

              <Casilla num="01" label="Ingresos computables del período"
                sublabel={`Revenue (net of IVA) — this quarter: ${fmt(qIngresos)} + prior: ${fmt(parseFloat(priorIngresos))}`}
                value={ytdIngresos} />
              <Casilla num="02" label="Gastos fiscalmente deducibles"
                sublabel={`Deductible expenses — this quarter: ${fmt(qGastos)} + prior: ${fmt(parseFloat(priorGastos))}`}
                value={ytdGastos} />
              <Casilla num="03" label="Rendimiento neto ([01] − [02])"
                sublabel="Net taxable income year-to-date"
                value={ytdRendimiento}
                highlight />
              <Casilla num="04" label="20% de [03]"
                sublabel="Standard pago fraccionado rate"
                value={ytd20Pct}
                highlight />
              <Casilla num="05" label="Deducciones — pagos fraccionados anteriores"
                sublabel={`Total Modelo 130 payments made in prior quarters this year`}
                value={ytdPriorPagos} />
              <Casilla num="06" label="Retenciones e ingresos a cuenta"
                sublabel={`IRPF retained by clients — this quarter: ${fmt(totalIrpfRetained)} + prior: ${fmt(parseFloat(priorRetenciones))}`}
                value={ytdRetenciones} />
              <Casilla num="07" label="Pago fraccionado previo a deducir ([05] + [06])"
                sublabel="Total deductions from quarterly result"
                value={ytdPriorPagos + ytdRetenciones} />

              <SectionHeader title="Resultado" color="#1A1A2E" />
              <Casilla num="12" label="Resultado de la autoliquidación ([04] − [07])"
                sublabel="FINAL RESULT — amount to pay (positive) or zero (negative means nothing owed)"
                value={Math.max(0, m130Result)}
                highlight
                color={m130Result > 0 ? "#C9392B" : "#2E7D32"}
              />

              {/* Outcome */}
              <div style={{
                padding: "16px 20px",
                background: m130Result > 0 ? "#FFF3F0" : "#F0FFF4",
                borderTop: `3px solid ${m130Result > 0 ? "#C9392B" : "#2E7D32"}`,
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <div>
                  <div style={{ fontSize: 11, color: "#6B5E52", letterSpacing: 1, textTransform: "uppercase" }}>
                    {m130Result > 0 ? "A Ingresar (to pay)" : "Negativa — nada que ingresar"}
                  </div>
                  <div style={{ fontSize: 28, fontWeight: "bold", fontFamily: "'JetBrains Mono', monospace", color: m130Result > 0 ? "#C9392B" : "#2E7D32", marginTop: 4 }}>
                    {fmt(Math.max(0, m130Result))}
                  </div>
                  {m130Result < 0 && (
                    <div style={{ fontSize: 12, color: "#6B5E52", marginTop: 4 }}>
                      Excess of {fmt(Math.abs(m130Result))} carries forward (retentions exceeded liability)
                    </div>
                  )}
                </div>
                <div style={{ textAlign: "right", fontSize: 12, color: "#6B5E52" }}>
                  <div>Deadline: <strong>{deadline}</strong></div>
                  <div>File via Sede Electrónica</div>
                </div>
              </div>
            </div>

            {/* Explanation */}
            <div style={{ marginTop: 16, padding: "14px 18px", background: "#E8F4FD", border: "1px solid #90CAF9", borderRadius: 6, fontSize: 12, color: "#1565C0", lineHeight: 1.5 }}>
              <strong>How to use this:</strong> Open Sede Electrónica → Modelo 130 → enter period ({periodo}). Key casillas: [01] cumulative income, [02] cumulative expenses, [04] the 20% amount, [05] prior quarter payments, [06] retentions. The result in [12] is what you owe. If negative, enter €0.00 — the excess means your retentions already covered it.
              {quarter === 0 && <span> Since this is <strong>Q1</strong>, prior quarter fields should be zero.</span>}
            </div>

            {/* YTD breakdown */}
            <div style={{ marginTop: 16, ...card, borderTop: "4px solid #9B8B7A" }}>
              <div style={cardTitle}>Year-to-Date Breakdown</div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #D4CBC0" }}>
                    <th style={{ padding: "6px 10px", textAlign: "left", color: "#6B5E52", fontWeight: "normal", fontSize: 11 }}>Component</th>
                    <th style={{ padding: "6px 10px", textAlign: "right", color: "#6B5E52", fontWeight: "normal", fontSize: 11 }}>Prior Q's</th>
                    <th style={{ padding: "6px 10px", textAlign: "right", color: "#6B5E52", fontWeight: "normal", fontSize: 11 }}>This Q ({PERIODO_MAP[quarter]})</th>
                    <th style={{ padding: "6px 10px", textAlign: "right", color: "#6B5E52", fontSize: 11, fontWeight: "bold" }}>YTD Total</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Ingresos (revenue)", priorIngresos, qIngresos, ytdIngresos],
                    ["Gastos deducibles", priorGastos, qGastos, ytdGastos],
                    ["Rendimiento neto", parseFloat(priorIngresos) - parseFloat(priorGastos), qIngresos - qGastos, ytdRendimiento],
                    ["Retenciones IRPF", priorRetenciones, totalIrpfRetained, ytdRetenciones],
                    ["Pagos fraccionados", priorPagos, 0, ytdPriorPagos],
                  ].map(([label, prior, current, total], i) => (
                    <tr key={label} style={{ borderBottom: "1px solid #EDE8E0", background: i % 2 === 0 ? "white" : "#F7F4EF" }}>
                      <td style={{ padding: "8px 10px", fontSize: 12 }}>{label}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "monospace", color: "#9B8B7A" }}>{fmt(prior)}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "monospace" }}>{fmt(current)}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "monospace", fontWeight: "bold" }}>{fmt(total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══════════════════════════
            SUMMARY TAB
           ══════════════════════════ */}
        {tab === "summary" && (
          <div>
            {/* FX conversion table */}
            {invoices.some(i => i.currency === "USD") && (
              <div style={{ ...card, borderTop: "4px solid #1565C0", marginBottom: 20 }}>
                <div style={cardTitle}>Currency Conversion / Conversión de Divisas</div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #D4CBC0" }}>
                      {["Invoice","Date","USD Amount","Rate Used","Rate Date","EUR Equivalent"].map(h=>(
                        <th key={h} style={{ padding: "6px 10px", textAlign: "left", fontSize: 11, color: "#6B5E52", fontWeight: "normal", letterSpacing: 0.5 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.filter(i=>i.currency==="USD").map((inv,i)=>(
                      <tr key={inv.id} style={{ borderBottom: "1px solid #EDE8E0", background: i%2===0 ? "white" : "#F7F4EF" }}>
                        <td style={{ ...td, fontFamily: "monospace", fontWeight: "bold" }}>{inv.number}</td>
                        <td style={td}>{inv.date}</td>
                        <td style={{ ...td, fontFamily: "monospace", color: "#1565C0" }}>{fmtUSD(inv.grossOrig)}</td>
                        <td style={{ ...td, fontFamily: "monospace" }}>{inv.fxRate ? `1 USD = ${inv.fxRate.toFixed(4)} EUR` : "—"}</td>
                        <td style={{ ...td, color: "#9B8B7A", fontSize: 11 }}>{inv.fxDate||"—"}</td>
                        <td style={{ ...td, fontFamily: "monospace", fontWeight: "bold", color: "#2E7D32" }}>{fmt(inv.gross)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Side-by-side summary cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
              <div style={{ ...card, borderTop: "4px solid #1565C0" }}>
                <div style={cardTitle}>Modelo 303 — IVA</div>
                <SR label="IVA Repercutido (collected)"      value={fmt(ivaRepercutido)} color="#1565C0" />
                <SR label="IVA Soportado (paid on expenses)" value={fmt(ivaSoportado)}      color="#6B5E52" />
                <div style={{ borderTop: "2px solid #1A1A2E", marginTop: 10, paddingTop: 10 }}>
                  <SR label="NET IVA TO PAY / A INGRESAR" value={fmt(net303Result)} bold color={net303Result > 0 ? "#C9392B" : "#2E7D32"} />
                </div>
              </div>

              <div style={{ ...card, borderTop: "4px solid #C9392B" }}>
                <div style={cardTitle}>Modelo 130 — IRPF</div>
                <SR label="YTD Ingresos"              value={fmt(ytdIngresos)} />
                <SR label="YTD Gastos Deducibles"      value={`− ${fmt(ytdGastos)}`} color="#6B5E52" />
                <SR label="Rendimiento Neto"           value={fmt(ytdRendimiento)} />
                <SR label="20% Pago Fraccionado"       value={fmt(ytd20Pct)} color="#C9392B" />
                <SR label="Prior Pagos + Retenciones"  value={`− ${fmt(ytdPriorPagos + ytdRetenciones)}`} color="#2E7D32" />
                <div style={{ borderTop: "2px solid #1A1A2E", marginTop: 10, paddingTop: 10 }}>
                  <SR label="IRPF TO PAY" value={fmt(Math.max(0, m130Result))} bold color={m130Result > 0 ? "#C9392B" : "#2E7D32"} />
                </div>
              </div>
            </div>

            {/* Total liability */}
            <div style={{ ...card, background: "#1A1A2E", color: "#F7F4EF", borderTop: "none" }}>
              <div style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: "#9B8B7A", marginBottom: 12 }}>{quarterLabel} — Total Liability</div>
              <div style={{ display: "flex", gap: 40, flexWrap: "wrap" }}>
                <BN label="Modelo 303 (IVA)"  value={fmt(net303Result)}                                   color="#64B5F6" />
                <BN label="Modelo 130 (IRPF)"  value={fmt(Math.max(0, m130Result))}                       color="#EF9A9A" />
                <BN label="Total Set Aside"    value={fmt(net303Result + Math.max(0, m130Result))}          color="#FFD54F" />
              </div>
              <div style={{ marginTop: 16, fontSize: 12, color: "#9B8B7A" }}>
                Filing deadline: <strong style={{ color: "#F7F4EF" }}>{deadline}</strong> · Quarter: <strong style={{ color: "#F7F4EF" }}>{quarterLabel}</strong>
              </div>
            </div>

            <div style={{ marginTop: 12, padding: "12px 16px", background: "#FFF8E1", border: "1px solid #FFD54F", borderRadius: 6, fontSize: 12, color: "#5D4037", lineHeight: 1.5 }}>
              ⚠️ <strong>Note:</strong> IRPF 20% is the standard pago fraccionado rate — actual annual IRPF depends on full-year income and personal circumstances. Exchange rates via ECB / frankfurter.app — verify against your bank rate. This tool prepares your numbers for filing; it does not file on your behalf. Always confirm with your asesor fiscal.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══ Helper Components ═══ */

function F({ label, v, s, t="text", ph="", w=120 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={lbl}>{label}</label>
      <input type={t} value={v} onChange={e=>s(e.target.value)} placeholder={ph}
        style={{ width: w, padding: "5px 8px", border: "1px solid #C4B8AC", borderRadius: 4, fontSize: 13, background: "white", fontFamily: "Georgia,serif" }} />
    </div>
  );
}

function SR({ label, value, bold, color }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13, borderBottom: "1px solid #EDE8E0" }}>
      <span style={{ color: "#4A3F35" }}>{label}</span>
      <span style={{ fontWeight: bold ? "bold" : "normal", color: color || "#1A1A1A", fontFamily: "monospace" }}>{value}</span>
    </div>
  );
}

function BN({ label, value, color }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "#9B8B7A", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: "bold", color: color || "white", fontFamily: "monospace" }}>{value}</div>
    </div>
  );
}

/* ═══ Style Constants ═══ */
const ss             = { padding: "6px 10px", border: "1px solid #3A3A5C", borderRadius: 4, background: "#2A2A4E", color: "#F7F4EF", fontSize: 13, cursor: "pointer" };
const card           = { background: "white", border: "1px solid #D4CBC0", borderRadius: 6, padding: "16px 20px", marginBottom: 16 };
const cardTitle      = { fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#9B8B7A", marginBottom: 12 };
const td             = { padding: "8px 9px" };
const lbl            = { fontSize: 11, color: "#6B5E52", letterSpacing: 0.5 };
const uploadBtnStyle = { display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 18px", background: "#1A1A2E", color: "#F7F4EF", borderRadius: 5, fontSize: 13, cursor: "pointer", fontFamily: "Georgia,serif" };
const btnPri         = { padding: "6px 16px", background: "#1A1A2E", color: "#F7F4EF", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 13, fontFamily: "Georgia,serif" };
const btnSec         = { padding: "5px 12px", background: "transparent", color: "#4A3F35", border: "1px solid #C4B8AC", borderRadius: 4, cursor: "pointer", fontSize: 12, fontFamily: "Georgia,serif" };
const btnDel         = { background: "transparent", border: "none", color: "#C9392B", cursor: "pointer", fontSize: 16, padding: "2px 6px" };
