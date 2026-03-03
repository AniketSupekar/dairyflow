import { useEffect, useState, useMemo } from "react";
import { getLanes } from "../../api/lane.api";
import api from "../../api/axios";
import {
  ChevronRight, Zap, Eye, CheckCircle2, XCircle,
  AlertCircle, Download, RefreshCw, MapPin, Users,
  ArrowLeft, FileText, Minus,
} from "lucide-react";

// ─── Steps ────────────────────────────────────────────────────────────────────
const STEP = { CONFIGURE: 1, PREVIEW: 2, RESULT: 3 };

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(n || 0);

const getPreviousMonth = () => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const monthToRange = (monthStr) => {
  const [year, month] = monthStr.split("-").map(Number);
  const from = new Date(year, month - 1, 1);
  const to   = new Date(year, month,     0); // last day of month
  const pad  = (n) => String(n).padStart(2, "0");
  return {
    fromDate: `${year}-${pad(month)}-01`,
    toDate:   `${year}-${pad(month)}-${to.getDate()}`,
    label:    from.toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
  };
};

const STATUS_CFG = {
  ELIGIBLE:      { cls: "bg-emerald-100 text-emerald-700", label: "Ready"          },
  ALREADY_BILLED:{ cls: "bg-gray-100 text-gray-500",       label: "Already billed" },
  NO_DELIVERIES: { cls: "bg-amber-100 text-amber-700",     label: "No deliveries"  },
  SUCCESS:       { cls: "bg-emerald-100 text-emerald-700", label: "Generated"      },
  SKIPPED:       { cls: "bg-amber-100 text-amber-700",     label: "Skipped"        },
  FAILED:        { cls: "bg-red-100 text-red-700",         label: "Failed"         },
};

function StatusPill({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.ELIGIBLE;
  return (
    <span className={`inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

// ─── Step indicator ───────────────────────────────────────────────────────────
function StepBar({ current }) {
  const steps = ["Configure", "Preview", "Generate"];
  return (
    <div className="flex items-center gap-2">
      {steps.map((label, i) => {
        const num  = i + 1;
        const done = current > num;
        const active = current === num;
        return (
          <div key={label} className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all
                ${done   ? "bg-emerald-500 text-white"
                : active ? "bg-gray-900 text-white"
                :          "bg-gray-100 text-gray-400"}`}
              >
                {done ? <CheckCircle2 size={13} /> : num}
              </div>
              <span className={`text-xs font-semibold hidden sm:block
                ${active ? "text-gray-900" : done ? "text-emerald-600" : "text-gray-400"}`}>
                {label}
              </span>
            </div>
            {i < 2 && <ChevronRight size={13} className="text-gray-300 flex-shrink-0" />}
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
const BulkBillingPage = () => {
  const [step, setStep] = useState(STEP.CONFIGURE);

  // ── Step 1: Configure ──────────────────────────────────────────────────────
  const [lanes, setLanes]           = useState([]);
  const [laneId, setLaneId]         = useState("all");
  const [useMonth, setUseMonth]     = useState(true);
  const [month, setMonth]           = useState(getPreviousMonth());
  const [fromDate, setFromDate]     = useState("");
  const [toDate, setToDate]         = useState("");
  const [previewing, setPreviewing] = useState(false);
  const [configError, setConfigError] = useState("");

  // ── Step 2: Preview ────────────────────────────────────────────────────────
  const [previewData, setPreviewData]       = useState([]);
  const [previewSummary, setPreviewSummary] = useState({});
  const [selected, setSelected]             = useState(new Set());
  const [generating, setGenerating]         = useState(false);

  // ── Step 3: Result ─────────────────────────────────────────────────────────
  const [results, setResults]           = useState([]);
  const [resultSummary, setResultSummary] = useState({});
  const [downloading, setDownloading]   = useState(false);
  const [downloadError, setDownloadError] = useState("");

  useEffect(() => {
    getLanes()
      .then((r) => setLanes(r.data.data))
      .catch(console.error);
  }, []);

  // ── Derived dates ──────────────────────────────────────────────────────────
  const { fromDate: resolvedFrom, toDate: resolvedTo, label: periodLabel } = useMemo(() => {
    if (useMonth && month) return monthToRange(month);
    return { fromDate, toDate, label: `${fromDate} to ${toDate}` };
  }, [useMonth, month, fromDate, toDate]);

  const selectedLaneName = useMemo(() => {
    if (laneId === "all") return "All Lanes";
    return lanes.find((l) => l._id === laneId)?.name || "Selected Lane";
  }, [laneId, lanes]);

  // ── Step 1 → Preview ──────────────────────────────────────────────────────
  const handlePreview = async () => {
    setConfigError("");
    if (!resolvedFrom || !resolvedTo) {
      setConfigError("Please select a valid period.");
      return;
    }
    if (new Date(resolvedFrom) >= new Date(resolvedTo)) {
      setConfigError("From date must be before to date.");
      return;
    }
    if (new Date(resolvedTo) > new Date()) {
      setConfigError("Cannot generate bills for future dates.");
      return;
    }
    setPreviewing(true);
    try {
      const res = await api.post("/billing/bulk-preview", {
        laneId: laneId === "all" ? undefined : laneId,
        fromDate: resolvedFrom,
        toDate:   resolvedTo,
      });
      const d = res.data.data;
      setPreviewData(d.customers);
      setPreviewSummary(d.summary);
      // Auto-select all eligible
      setSelected(
        new Set(
          d.customers
            .filter((c) => c.status === "ELIGIBLE")
            .map((c) => c.customerId.toString())
        )
      );
      setStep(STEP.PREVIEW);
    } catch (err) {
      setConfigError(err?.response?.data?.message || "Preview failed. Please retry.");
    } finally {
      setPreviewing(false);
    }
  };

  // ── Toggle customer selection ──────────────────────────────────────────────
  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const eligibleCustomers = previewData.filter((c) => c.status === "ELIGIBLE");
  const allEligibleSelected =
    eligibleCustomers.length > 0 &&
    eligibleCustomers.every((c) => selected.has(c.customerId.toString()));

  const toggleSelectAll = () => {
    if (allEligibleSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(eligibleCustomers.map((c) => c.customerId.toString())));
    }
  };

  // ── Step 2 → Generate ─────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!selected.size) return;
    setGenerating(true);
    try {
      const res = await api.post("/billing/bulk-generate", {
        customerIds: [...selected],
        fromDate:    resolvedFrom,
        toDate:      resolvedTo,
      });
      const d = res.data.data;
      setResults(d.results);
      setResultSummary(d.summary);
      setStep(STEP.RESULT);
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  // ── Download ZIP ───────────────────────────────────────────────────────────
  const handleDownloadZip = async () => {
    if (!resultSummary.billIds?.length) return;
    setDownloading(true);
    setDownloadError("");
    try {
      const zipName = `${selectedLaneName.replace(/\s+/g, "_")}_${periodLabel.replace(/\s+/g, "_")}`;
      const response = await api.post(
        "/billing/bulk-download",
        { billIds: resultSummary.billIds, zipName },
        { responseType: "blob" }
      );
      const url  = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href  = url;
      link.setAttribute("download", `${zipName}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setDownloadError("Download failed. Please retry.");
      console.error(err);
    } finally {
      setDownloading(false);
    }
  };

  // ── Reset to start ─────────────────────────────────────────────────────────
  const handleReset = () => {
    setStep(STEP.CONFIGURE);
    setPreviewData([]);
    setResults([]);
    setResultSummary({});
    setSelected(new Set());
    setConfigError("");
    setDownloadError("");
  };

  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Bulk Bill Generation</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Generate bills for all customers in a lane with one action
          </p>
        </div>
        <StepBar current={step} />
      </div>

      {/* ── STEP 1: CONFIGURE ──────────────────────────────────────────────── */}
      {step === STEP.CONFIGURE && (
        <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-6 max-w-xl">
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-gray-900">Set billing period & lane</h2>
            <p className="text-xs text-gray-400">
              Defaults to last month — the most common billing cycle.
            </p>
          </div>

          {/* Lane */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Lane</label>
            <select
              value={laneId}
              onChange={(e) => setLaneId(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none px-4 py-2.5 text-sm text-gray-700 transition"
            >
              <option value="all">All Lanes</option>
              {lanes.map((l) => (
                <option key={l._id} value={l._id}>{l.name}</option>
              ))}
            </select>
          </div>

          {/* Period mode toggle */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Billing Period</label>
              <button
                onClick={() => setUseMonth(!useMonth)}
                className="text-xs font-semibold text-gray-500 hover:text-gray-800 underline underline-offset-2 transition"
              >
                {useMonth ? "Use custom dates instead" : "Use month picker instead"}
              </button>
            </div>

            {useMonth ? (
              <input
                type="month"
                value={month}
                max={getPreviousMonth()}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none px-4 py-2.5 text-sm text-gray-700 transition"
              />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">From</label>
                  <input
                    type="date"
                    value={fromDate}
                    max={toDate || new Date().toISOString().split("T")[0]}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 focus:bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">To</label>
                  <input
                    type="date"
                    value={toDate}
                    min={fromDate}
                    max={new Date().toISOString().split("T")[0]}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 focus:bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Summary of selection */}
          {resolvedFrom && resolvedTo && (
            <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
              <FileText size={14} className="text-gray-400 flex-shrink-0" />
              <p className="text-xs text-gray-600">
                Generating for{" "}
                <span className="font-bold text-gray-900">{selectedLaneName}</span>
                {" · "}
                <span className="font-bold text-gray-900">{periodLabel}</span>
              </p>
            </div>
          )}

          {configError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <AlertCircle size={13} className="text-red-500 flex-shrink-0" />
              <p className="text-xs font-medium text-red-700">{configError}</p>
            </div>
          )}

          <button
            onClick={handlePreview}
            disabled={previewing || !resolvedFrom || !resolvedTo}
            className="w-full inline-flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white text-sm font-bold py-3 rounded-xl transition disabled:opacity-40"
          >
            {previewing
              ? <><RefreshCw size={14} className="animate-spin" /> Loading preview…</>
              : <><Eye size={14} /> Preview Customers</>
            }
          </button>
        </div>
      )}

      {/* ── STEP 2: PREVIEW ────────────────────────────────────────────────── */}
      {step === STEP.PREVIEW && (
        <div className="space-y-4">

          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3 max-w-lg">
            <SummaryCard value={previewSummary.eligible}      label="Ready to bill" color="emerald" />
            <SummaryCard value={previewSummary.alreadyBilled} label="Already billed" color="gray"    />
            <SummaryCard value={previewSummary.noDeliveries}  label="No deliveries"  color="amber"   />
          </div>

          {previewSummary.eligible === 0 ? (
            <div className="bg-white border border-gray-100 rounded-2xl py-12 flex flex-col items-center gap-3">
              <CheckCircle2 size={24} className="text-emerald-400" />
              <p className="text-sm font-semibold text-gray-600">No eligible customers</p>
              <p className="text-xs text-gray-400">All customers are either already billed or have no deliveries.</p>
              <button onClick={handleReset} className="mt-2 text-xs font-semibold text-gray-500 hover:text-gray-800 underline">
                ← Change period
              </button>
            </div>
          ) : (
            <>
              {/* Table header */}
              <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
                {/* Select all bar */}
                <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-50 bg-gray-50/60">
                  <input
                    type="checkbox"
                    checked={allEligibleSelected}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded accent-gray-900 cursor-pointer"
                  />
                  <p className="text-xs font-semibold text-gray-700 flex-1">
                    {selected.size} of {eligibleCustomers.length} eligible selected
                  </p>
                  <p className="text-xs font-bold text-gray-900">
                    Est. ₹{fmt(
                      previewData
                        .filter((c) => selected.has(c.customerId.toString()))
                        .reduce((s, c) => s + c.estimatedAmount, 0)
                    )}
                  </p>
                </div>

                {/* Customer rows */}
                <div className="divide-y divide-gray-50">
                  {previewData.map((c) => {
                    const id         = c.customerId.toString();
                    const isEligible = c.status === "ELIGIBLE";
                    const isChecked  = selected.has(id);

                    return (
                      <div
                        key={id}
                        onClick={() => isEligible && toggleSelect(id)}
                        className={`flex items-center gap-4 px-5 py-3.5 transition
                          ${isEligible ? "cursor-pointer hover:bg-gray-50/80" : "opacity-50 cursor-not-allowed"}
                          ${isChecked  ? "bg-emerald-50/30" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={!isEligible}
                          onChange={() => isEligible && toggleSelect(id)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 rounded accent-gray-900 cursor-pointer disabled:cursor-not-allowed"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 leading-none truncate">
                            {c.customerName}
                          </p>
                          <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1">
                            <MapPin size={9} /> {c.laneName}
                            {c.deliveryCount > 0 && (
                              <span className="ml-2 text-gray-400">· {c.deliveryCount} deliveries</span>
                            )}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          {c.estimatedAmount > 0 && (
                            <p className="text-sm font-bold text-gray-900">₹{fmt(c.estimatedAmount)}</p>
                          )}
                          <StatusPill status={c.status} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleReset}
                  className="inline-flex items-center gap-2 border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-semibold px-4 py-2.5 rounded-xl transition"
                >
                  <ArrowLeft size={14} /> Back
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={!selected.size || generating}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white text-sm font-bold px-6 py-2.5 rounded-xl transition disabled:opacity-40"
                >
                  {generating
                    ? <><RefreshCw size={14} className="animate-spin" /> Generating…</>
                    : <><Zap size={14} /> Generate {selected.size} Bill{selected.size !== 1 ? "s" : ""}</>
                  }
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── STEP 3: RESULT ─────────────────────────────────────────────────── */}
      {step === STEP.RESULT && (
        <div className="space-y-4">

          {/* Result summary */}
          <div className="grid grid-cols-3 gap-3 max-w-lg">
            <SummaryCard value={resultSummary.success} label="Generated"  color="emerald" icon={<CheckCircle2 size={16} />} />
            <SummaryCard value={resultSummary.skipped} label="Skipped"    color="amber"   icon={<Minus size={16} />}        />
            <SummaryCard value={resultSummary.failed}  label="Failed"     color="red"     icon={<XCircle size={16} />}      />
          </div>

          {/* Download buttons */}
          {resultSummary.billIds?.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleDownloadZip}
                disabled={downloading}
                className="inline-flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white text-sm font-bold px-5 py-2.5 rounded-xl transition disabled:opacity-40"
              >
                {downloading
                  ? <><RefreshCw size={14} className="animate-spin" /> Preparing ZIP…</>
                  : <><Download size={14} /> Download All PDFs ({resultSummary.billIds.length})</>
                }
              </button>
            </div>
          )}

          {downloadError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <AlertCircle size={13} className="text-red-500 flex-shrink-0" />
              <p className="text-xs font-medium text-red-700">{downloadError}</p>
            </div>
          )}

          {/* Per-customer result list */}
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-50 bg-gray-50/60">
              <p className="text-xs font-bold text-gray-700">
                {periodLabel} · {selectedLaneName}
              </p>
            </div>
            <div className="divide-y divide-gray-50">
              {results.map((r) => (
                <div key={r.customerId?.toString()} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 leading-none truncate">
                      {r.customerName || r.customerId}
                    </p>
                    {r.reason && (
                      <p className="text-[11px] text-gray-400 mt-0.5">{r.reason}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0 space-y-1">
                    {r.amount > 0 && (
                      <p className="text-sm font-bold text-gray-900">₹{fmt(r.amount)}</p>
                    )}
                    <StatusPill status={r.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Start again */}
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-2 border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-semibold px-4 py-2.5 rounded-xl transition"
          >
            <RefreshCw size={13} /> Generate for another period
          </button>
        </div>
      )}
    </div>
  );
};

// ─── SummaryCard ──────────────────────────────────────────────────────────────
function SummaryCard({ value, label, color, icon }) {
  const colorMap = {
    emerald: "bg-emerald-50 text-emerald-700",
    amber:   "bg-amber-50 text-amber-700",
    gray:    "bg-gray-50 text-gray-600",
    red:     "bg-red-50 text-red-600",
  };
  return (
    <div className={`rounded-2xl px-4 py-3.5 ${colorMap[color] || colorMap.gray}`}>
      <p className="text-2xl font-bold leading-none">{value ?? 0}</p>
      <p className="text-[11px] font-semibold mt-1.5 opacity-80">{label}</p>
    </div>
  );
}

export default BulkBillingPage;