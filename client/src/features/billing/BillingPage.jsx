import { useEffect, useState, useMemo, useCallback } from "react";
import { getCustomersByLane, generateBill, downloadBillPdf } from "../../api/billing.api";
import { getLanes } from "../../api/lane.api";
import CustomerFinancialPanel from "../../components/CustomerFinancialPanel";
import { useTenant } from "../../hooks/useTenant";
import { buildWhatsAppMessage, openWhatsApp } from "../../utils/whatsapp.util";
import api from "../../api/axios";
import {
  Search, X, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight,
  Download, Receipt, IndianRupee, Phone, PhoneOff,
  CheckSquare, Square, Send, Users,
} from "lucide-react";

const PAGE_SIZE = 12;

const fetchOutstandingBatch = async (customerIds) => {
  if (!customerIds.length) return {};
  const results = await Promise.allSettled(
    customerIds.map((id) =>
      api.get(`/billing/customer-summary/${id}`).then((r) => ({
        id,
        outstanding: r.data.data.totalOutstanding || 0,
      }))
    )
  );
  const map = {};
  results.forEach((r) => {
    if (r.status === "fulfilled") map[r.value.id] = r.value.outstanding;
  });
  return map;
};

const fetchLatestBill = async (customerId) => {
  try {
    const res = await api.get(`/billing/customer/${customerId}`, {
      params: { page: 1, limit: 1 },
    });
    return res.data.data.data?.[0] || null;
  } catch {
    return null;
  }
};

const triggerDownload = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  a.remove(); window.URL.revokeObjectURL(url);
};

// ─────────────────────────────────────────────────────────────────────────────
// WHATSAPP BLAST MODAL
// ─────────────────────────────────────────────────────────────────────────────
function WhatsAppBlastModal({ customers, outstandingMap, laneName, dairyName, upiId, onClose }) {
  const [billMap, setBillMap]     = useState({});
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState(new Set());
  const [search, setSearch]       = useState("");
  const [sendQueue, setSendQueue] = useState(null);
  const [sendDone, setSendDone]   = useState(false);
  const [sendResults, setSendResults] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const pairs = await Promise.all(
        customers.map(async (c) => [c._id, await fetchLatestBill(c._id)])
      );
      if (!cancelled) {
        const map = Object.fromEntries(pairs);
        setBillMap(map);
        setSelected(new Set(customers.filter((c) => map[c._id] && c.phone).map((c) => c._id)));
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [customers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? customers.filter((c) => c.name.toLowerCase().includes(q)) : customers;
  }, [customers, search]);

  const eligibleIds = useMemo(
    () => customers.filter((c) => billMap[c._id] && c.phone).map((c) => c._id),
    [customers, billMap]
  );

  const allSelected  = eligibleIds.length > 0 && eligibleIds.every((id) => selected.has(id));
  const noPhoneCount = customers.filter((c) => !c.phone).length;
  const noBillCount  = customers.filter((c) => !billMap[c._id]).length;

  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(eligibleIds));
  const toggleOne = (id) =>
    setSelected((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const handleSend = () => {
    const toSend = customers.filter((c) => selected.has(c._id));
    if (!toSend.length) return;
    const items = [], skippedUpfront = [];
    for (const customer of toSend) {
      const bill = billMap[customer._id];
      if (!customer.phone) { skippedUpfront.push({ customer, status: "skipped", reason: "No phone number" }); continue; }
      if (!bill)            { skippedUpfront.push({ customer, status: "skipped", reason: "No bill found" }); continue; }
      items.push({ customer, bill });
    }
    setSendDone(false); setSendResults([]);
    setSendQueue({ items, index: 0, results: skippedUpfront });
  };

  const handleQueueOpen = () => {
    if (!sendQueue) return;
    const { items, index, results } = sendQueue;
    const { customer, bill } = items[index];
    // Direct user click → window.open always works
    openWhatsApp({ phone: customer.phone, message: buildWhatsAppMessage({ bill, customer, dairyName, upiId }) });
    const newResults = [...results, { customer, status: "sent", reason: null }];
    const nextIndex  = index + 1;
    if (nextIndex >= items.length) { setSendResults(newResults); setSendQueue(null); setSendDone(true); }
    else setSendQueue({ items, index: nextIndex, results: newResults });
  };

  const handleQueueSkip = () => {
    if (!sendQueue) return;
    const { items, index, results } = sendQueue;
    const { customer } = items[index];
    const newResults = [...results, { customer, status: "skipped", reason: "Skipped by admin" }];
    const nextIndex  = index + 1;
    if (nextIndex >= items.length) { setSendResults(newResults); setSendQueue(null); setSendDone(true); }
    else setSendQueue({ items, index: nextIndex, results: newResults });
  };

  // ── View: queue ───────────────────────────────────────────────────────────
  if (sendQueue) {
    const { items, index, results } = sendQueue;
    const current   = items[index];
    const sentSoFar = results.filter(r => r.status === "sent").length;
    return (
      <ModalShell onClose={null} maxWidth="max-w-sm">
        <div className="p-6 space-y-5">
          <div className="flex items-center gap-3">
            <WAIcon size={20} />
            <div>
              <p className="text-sm font-bold text-gray-900">Sending Bills</p>
              <p className="text-xs text-gray-400">{index + 1} of {items.length} · {sentSoFar} sent so far</p>
            </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div className="bg-[#25D366] h-1.5 rounded-full transition-all duration-300" style={{ width: `${Math.round((index / items.length) * 100)}%` }} />
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-gray-900">{current.customer.name}</p>
                <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><Phone size={10} /> {current.customer.phone}</p>
              </div>
              {(() => {
                const s = { PAID: { cls: "bg-green-100 text-green-700", label: "Paid" }, PARTIAL: { cls: "bg-amber-100 text-amber-700", label: "Partial" }, UNPAID: { cls: "bg-red-100 text-red-600", label: "Unpaid" } };
                const cfg = s[current.bill.status] || s.UNPAID;
                return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${cfg.cls}`}>{cfg.label}</span>;
              })()}
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500 pt-1 border-t border-gray-100">
              <span>Amount</span>
              <span className="font-bold text-gray-900">₹{current.bill.totalAmount}</span>
            </div>
            {current.bill.status !== "PAID" && (
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Due</span>
                <span className="font-bold text-red-500">₹{Math.max(0, current.bill.totalAmount - current.bill.amountPaid)}</span>
              </div>
            )}
            {/* UPI indicator */}
            {upiId && current.bill.status !== "PAID" && (
              <div className="flex items-center gap-1.5 pt-1 border-t border-gray-100">
                <IndianRupee size={10} className="text-green-600" />
                <span className="text-[10px] text-green-700 font-semibold">Pay link included · {upiId}</span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={handleQueueSkip} className="flex-1 border border-gray-200 text-xs font-semibold py-2.5 rounded-xl hover:bg-gray-50 transition text-gray-500">Skip</button>
            <button onClick={handleQueueOpen} className="flex-[2] flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20b858] text-white text-sm font-bold py-2.5 rounded-xl transition">
              <WAIcon size={15} /> Open WhatsApp
            </button>
          </div>
          <p className="text-[11px] text-gray-400 text-center">Click "Open WhatsApp" → send the message → come back and continue</p>
        </div>
      </ModalShell>
    );
  }

  // ── View: done ────────────────────────────────────────────────────────────
  if (sendDone) {
    const sent    = sendResults.filter(r => r.status === "sent");
    const skipped = sendResults.filter(r => r.status === "skipped");
    return (
      <ModalShell onClose={onClose} maxWidth="max-w-md">
        <div className="p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">WhatsApp Blast Complete</p>
              <p className="text-xs text-gray-400">{laneName} · {sendResults.length} customers processed</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{sent.length}</p>
              <p className="text-xs font-semibold text-green-700 mt-0.5">Bills Sent</p>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-amber-500">{skipped.length}</p>
              <p className="text-xs font-semibold text-amber-700 mt-0.5">Skipped</p>
            </div>
          </div>
          {skipped.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Skipped</p>
              <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                {skipped.map(({ customer, reason }) => (
                  <div key={customer._id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 border border-gray-100">
                    <span className="text-xs font-semibold text-gray-700">{customer.name}</span>
                    <span className="text-[10px] text-gray-400">{reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <button onClick={() => { setSendDone(false); setSendResults([]); }} className="flex-1 border border-gray-200 text-sm font-semibold py-2.5 rounded-xl hover:bg-gray-50 transition text-gray-700">Send Again</button>
            <button onClick={onClose} className="flex-1 bg-gray-900 hover:bg-black text-white text-sm font-semibold py-2.5 rounded-xl transition">Done</button>
          </div>
        </div>
      </ModalShell>
    );
  }

  // ── View: selection ───────────────────────────────────────────────────────
  return (
    <ModalShell onClose={onClose} maxWidth="max-w-2xl">
      <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <WAIcon size={18} />
            <h2 className="text-base font-bold text-gray-900">Send Bills on WhatsApp</h2>
          </div>
          <p className="text-xs text-gray-400">{laneName} · Select customers to send their latest bill</p>
        </div>
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-100 transition text-gray-500"><X size={15} /></button>
      </div>

      {/* UPI indicator banner */}
      {upiId && (
        <div className="px-6 pt-4">
          <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-3 py-2 text-xs text-green-700">
            <IndianRupee size={12} className="flex-shrink-0 text-green-600" />
            <span>Pay link active — <strong>{upiId}</strong> will be included in every message</span>
          </div>
        </div>
      )}

      {/* Warning banners */}
      {!loading && (noPhoneCount > 0 || noBillCount > 0) && (
        <div className="px-6 pt-3 flex flex-col sm:flex-row gap-2">
          {noPhoneCount > 0 && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 text-xs text-amber-700 flex-1">
              <PhoneOff size={12} className="flex-shrink-0" />
              <span><strong>{noPhoneCount}</strong> customer{noPhoneCount > 1 ? "s" : ""} have no phone — cannot send</span>
            </div>
          )}
          {noBillCount > 0 && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 text-xs text-blue-700 flex-1">
              <Receipt size={12} className="flex-shrink-0" />
              <span><strong>{noBillCount}</strong> customer{noBillCount > 1 ? "s" : ""} have no bill yet</span>
            </div>
          )}
        </div>
      )}

      {/* Toolbar */}
      <div className="px-6 pt-4 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100">
        <div className="flex items-center gap-3">
          {!loading && (
            <button onClick={toggleAll} className="flex items-center gap-2 text-xs font-semibold text-gray-700 hover:text-gray-900 transition">
              {allSelected ? <CheckSquare size={16} className="text-gray-900" /> : <Square size={16} className="text-gray-400" />}
              {allSelected ? "Deselect All" : "Select All"}
            </button>
          )}
          <span className="text-xs text-gray-400">
            {loading ? "Loading bills…" : `${selected.size} of ${eligibleIds.length} eligible selected`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…"
              className="w-44 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-gray-900 outline-none pl-8 pr-3 py-2 text-xs text-gray-700 placeholder-gray-400 transition" />
            {search && <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={11} /></button>}
          </div>
          <SendBtn count={selected.size} disabled={loading || selected.size === 0} onClick={handleSend} />
        </div>
      </div>

      {/* Customer list */}
      <div className="px-6 py-4 space-y-2 max-h-[55vh] overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-14 gap-3">
            <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-400 rounded-full animate-spin" />
            <p className="text-xs font-semibold text-gray-400">Loading bills for all customers…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10">
            <Users size={20} className="text-gray-300 mb-2" />
            <p className="text-xs font-semibold text-gray-400">No customers found</p>
          </div>
        ) : (
          filtered.map((customer) => {
            const bill       = billMap[customer._id];
            const isEligible = !!(customer.phone && bill);
            const isSelected = selected.has(customer._id);
            const pending    = bill ? Math.max(0, bill.totalAmount - bill.amountPaid) : 0;
            const statusCfg  = { PAID: { cls: "bg-green-100 text-green-700", label: "Paid" }, PARTIAL: { cls: "bg-amber-100 text-amber-700", label: "Partial" }, UNPAID: { cls: "bg-red-100 text-red-600", label: "Unpaid" } };
            const bs         = bill ? (statusCfg[bill.status] || statusCfg.UNPAID) : null;
            const fmt        = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
            return (
              <div key={customer._id} onClick={() => isEligible && toggleOne(customer._id)}
                className={`flex items-center gap-3 p-3.5 rounded-xl border transition
                  ${!isEligible ? "opacity-40 cursor-not-allowed border-gray-100 bg-gray-50/50"
                    : isSelected ? "border-green-300 bg-green-50/40 cursor-pointer"
                    : "border-gray-200 hover:border-gray-300 cursor-pointer hover:bg-gray-50"}`}
              >
                <div className="flex-shrink-0">
                  {isEligible ? isSelected ? <CheckSquare size={17} className="text-green-600" /> : <Square size={17} className="text-gray-300" />
                    : <Square size={17} className="text-gray-200" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900 truncate">{customer.name}</span>
                    {!customer.phone && <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-50 text-red-500 border border-red-100 flex-shrink-0"><PhoneOff size={8} /> No phone</span>}
                    {customer.phone && !bill && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400 flex-shrink-0">No bill</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    {customer.phone && <span className="flex items-center gap-1 text-[11px] text-gray-400"><Phone size={9} /> {customer.phone}</span>}
                    {bill && <span className="text-[11px] text-gray-400">{fmt(bill.fromDate)} – {fmt(bill.toDate)}</span>}
                  </div>
                </div>
                <div className="flex-shrink-0 text-right min-w-[72px]">
                  {bill ? (
                    <>
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${bs.cls}`}>{bs.label}</span>
                      <p className="text-xs font-bold text-gray-900 mt-0.5">₹{bill.totalAmount}</p>
                      {bill.status !== "PAID" && pending > 0 && <p className="text-[11px] text-red-500 font-semibold">₹{pending} due</p>}
                    </>
                  ) : <span className="text-[11px] text-gray-300">—</span>}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      {!loading && (
        <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-400">
            {selected.size > 0 ? `WhatsApp will open ${selected.size} tab${selected.size !== 1 ? "s" : ""} · allow popups` : "Select customers to send"}
          </p>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2.5 text-xs font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition">Cancel</button>
            <SendBtn count={selected.size} disabled={selected.size === 0} onClick={handleSend} label="Send to" />
          </div>
        </div>
      )}
    </ModalShell>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────
function ModalShell({ children, onClose, maxWidth = "max-w-sm" }) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-start justify-center overflow-y-auto px-4 py-6">
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${maxWidth} mb-8`}>{children}</div>
    </div>
  );
}

function WAIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#25D366">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function SendBtn({ count, disabled, onClick, label = "Send" }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="flex items-center gap-2 bg-[#25D366] hover:bg-[#20b858] disabled:bg-gray-200 disabled:text-gray-400 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition disabled:cursor-not-allowed">
      <Send size={13} />
      {label} {count > 0 ? `(${count})` : ""}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN BillingPage
// ─────────────────────────────────────────────────────────────────────────────
const BillingPage = () => {
  const { tenant } = useTenant();
  const dairyName = tenant?.businessName || tenant?.name || "Dairy";
  const upiId     = tenant?.upiId || "";

  const [lanes, setLanes]                   = useState([]);
  const [selectedLane, setSelectedLane]     = useState("");
  const [selectedLaneName, setSelectedLaneName] = useState("");
  const [customers, setCustomers]           = useState([]);
  const [outstandingMap, setOutstandingMap] = useState({});
  const [outstandingLoading, setOutstandingLoading] = useState(false);
  const [search, setSearch]                 = useState("");
  const [currentPage, setCurrentPage]       = useState(1);
  const [blastOpen, setBlastOpen]           = useState(false);

  const [modalOpen, setModalOpen]           = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [fromDate, setFromDate]             = useState("");
  const [toDate, setToDate]                 = useState("");
  const [generatedBill, setGeneratedBill]   = useState(null);
  const [loading, setLoading]               = useState(false);
  const [downloading, setDownloading]       = useState(false);
  const [error, setError]                   = useState("");
  const [success, setSuccess]               = useState("");

  const [financialCustomerId, setFinancialCustomerId] = useState(null);
  const [financialCustomer, setFinancialCustomer]     = useState(null);

  useEffect(() => {
    getLanes().then((res) => setLanes(res.data.data)).catch(console.error);
  }, []);

  const handleLaneChange = async (laneId) => {
    const lane = lanes.find((l) => l._id === laneId);
    setSelectedLane(laneId); setSelectedLaneName(lane?.name || "");
    setCustomers([]); setOutstandingMap({});
    setSearch(""); setCurrentPage(1); setBlastOpen(false);
    if (!laneId) return;
    try {
      const res = await getCustomersByLane(laneId);
      const loaded = res.data.data;
      setCustomers(loaded);
      setOutstandingLoading(true);
      const map = await fetchOutstandingBatch(loaded.map((c) => c._id));
      setOutstandingMap(map);
    } catch (err) { console.error(err); }
    finally { setOutstandingLoading(false); }
  };

  const refreshOutstanding = useCallback(async (customerId) => {
    try {
      const r = await api.get(`/billing/customer-summary/${customerId}`);
      setOutstandingMap((prev) => ({ ...prev, [customerId]: r.data.data.totalOutstanding || 0 }));
    } catch { /* silent */ }
  }, []);

  const handlePanelClose = () => {
    if (financialCustomerId) refreshOutstanding(financialCustomerId);
    setFinancialCustomerId(null); setFinancialCustomer(null);
  };

  const filteredCustomers = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase();
    return customers.filter((c) => c.name.toLowerCase().includes(q));
  }, [customers, search]);

  const totalPages         = Math.max(1, Math.ceil(filteredCustomers.length / PAGE_SIZE));
  const safePage           = Math.min(currentPage, totalPages);
  const paginatedCustomers = filteredCustomers.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const laneStats = useMemo(() => {
    const vals = Object.values(outstandingMap);
    if (!vals.length) return null;
    return {
      total:    vals.reduce((s, v) => s + v, 0),
      withDues: vals.filter((v) => v > 0).length,
      settled:  vals.filter((v) => v === 0).length,
    };
  }, [outstandingMap]);

  const openModal = (customer) => {
    setSelectedCustomer(customer); setGeneratedBill(null);
    setError(""); setSuccess(""); setFromDate(""); setToDate(""); setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false); setFromDate(""); setToDate("");
    setGeneratedBill(null); setError(""); setSuccess("");
  };

  const handleGenerateBill = async () => {
    setError(""); setSuccess("");
    if (!fromDate || !toDate)                     { setError("Please select both from and to dates."); return; }
    if (new Date(fromDate) >= new Date(toDate))   { setError("From date must be before to date."); return; }
    if (new Date(toDate) > new Date())            { setError("Cannot generate bill for future dates."); return; }
    setLoading(true);
    try {
      const res = await generateBill({ customerId: selectedCustomer._id, fromDate, toDate });
      setGeneratedBill(res.data.data); setSuccess("Bill generated successfully.");
      refreshOutstanding(selectedCustomer._id);
    } catch (err) { setError(err?.response?.data?.message || "Failed to generate bill."); }
    setLoading(false);
  };

  const handleDownload = async () => {
    if (!generatedBill?._id) return;
    setDownloading(true); setError("");
    try {
      const { blob, filename } = await downloadBillPdf(generatedBill._id, {
        customerName: selectedCustomer?.name,
        laneName: selectedLaneName,
        fromDate: generatedBill.fromDate || fromDate,
      });
      triggerDownload(blob, filename);
    } catch { setError("Failed to download PDF. Please try again."); }
    setDownloading(false);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 space-y-5">

      {financialCustomerId && (
        <CustomerFinancialPanel customerId={financialCustomerId} customer={financialCustomer} onClose={handlePanelClose} />
      )}

      {blastOpen && (
        <WhatsAppBlastModal
          customers={customers}
          outstandingMap={outstandingMap}
          laneName={selectedLaneName}
          dairyName={dairyName}
          upiId={upiId}
          onClose={() => setBlastOpen(false)}
        />
      )}

      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">Financials</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage bills and payments by lane</p>
      </div>

      {/* Lane selector */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-5">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">Select Lane</label>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <select value={selectedLane} onChange={(e) => handleLaneChange(e.target.value)}
            className="w-full sm:w-72 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white px-4 py-2.5 text-sm text-gray-700 focus:ring-1 focus:ring-gray-900 focus:border-gray-900 outline-none transition">
            <option value="">Select Lane</option>
            {lanes.map((lane) => <option key={lane._id} value={lane._id}>{lane.name}</option>)}
          </select>
          {customers.length > 0 && (
            <button onClick={() => setBlastOpen(true)}
              className="flex items-center gap-2 bg-[#25D366] hover:bg-[#20b858] text-white text-sm font-bold px-5 py-2.5 rounded-xl transition shadow-sm whitespace-nowrap">
              <WAIcon size={16} />
              Send Bills on WhatsApp
              <span className="bg-white/25 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{customers.length}</span>
            </button>
          )}
        </div>
      </div>

      {/* Lane stats */}
      {laneStats && !outstandingLoading && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: "Outstanding", value: `₹${laneStats.total.toFixed(2)}`, cls: "text-red-600" },
            { label: "With Dues",   value: laneStats.withDues,               cls: "text-amber-600" },
            { label: "Settled",     value: laneStats.settled,                cls: "text-emerald-600" },
          ].map(({ label, value, cls }) => (
            <div key={label} className="bg-white border border-gray-200 rounded-xl px-4 py-3">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
              <p className={`text-sm font-bold mt-0.5 ${cls}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      {customers.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <p className="text-sm text-gray-500">
            <span className="font-semibold text-gray-900">{filteredCustomers.length}</span> customer{filteredCustomers.length !== 1 ? "s" : ""}
            {search && ` matching "${search}"`}
          </p>
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} placeholder="Search customer…"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none pl-9 pr-8 py-2.5 text-sm text-gray-700 placeholder-gray-400 transition" />
            {search && <button onClick={() => { setSearch(""); setCurrentPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={13} /></button>}
          </div>
        </div>
      )}

      {/* Customer cards */}
      {paginatedCustomers.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {paginatedCustomers.map((customer) => {
            const outstanding    = outstandingMap[customer._id] ?? null;
            const hasOutstanding = outstanding !== null && outstanding > 0;
            return (
              <div key={customer._id}
                className={`bg-white border rounded-2xl p-5 space-y-4 hover:shadow-sm transition
                  ${hasOutstanding ? "border-rose-200 bg-rose-50/20" : "border-gray-200 hover:border-gray-300"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">{customer.name}</h3>
                    {customer.openingBalance > 0 && <p className="text-xs text-gray-400 mt-0.5">Opening: ₹{customer.openingBalance}</p>}
                  </div>
                  {outstandingLoading && outstanding === null ? (
                    <span className="flex-shrink-0 w-16 h-5 bg-gray-100 rounded-full animate-pulse" />
                  ) : hasOutstanding ? (
                    <span className="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100 whitespace-nowrap">₹{outstanding} due</span>
                  ) : outstanding === 0 ? (
                    <span className="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">Settled</span>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openModal(customer)} className="flex-1 flex items-center justify-center gap-1.5 bg-gray-900 hover:bg-black text-white text-xs font-semibold px-3 py-2 rounded-xl transition">
                    <Receipt size={12} /> Generate Bill
                  </button>
                  <button onClick={() => { setFinancialCustomerId(customer._id); setFinancialCustomer(customer); }} className="flex-1 flex items-center justify-center gap-1.5 border border-gray-200 text-xs font-semibold px-3 py-2 rounded-xl hover:bg-gray-50 transition text-gray-700">
                    <IndianRupee size={12} /> Financials
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {customers.length > 0 && filteredCustomers.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16">
          <Search size={20} className="text-gray-300 mb-3" />
          <p className="text-sm font-semibold text-gray-500">No customers match &ldquo;{search}&rdquo;</p>
          <p className="text-xs text-gray-400 mt-1">Try a different name</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pb-2">
          <p className="text-xs text-gray-400 font-medium">
            Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredCustomers.length)} of {filteredCustomers.length}
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setCurrentPage(safePage - 1)} disabled={safePage === 1} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition"><ChevronLeft size={14} /></button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
              .reduce((acc, p, idx, arr) => { if (idx > 0 && p - arr[idx - 1] > 1) acc.push("..."); acc.push(p); return acc; }, [])
              .map((item, idx) => item === "..." ? (
                <span key={`e-${idx}`} className="w-8 h-8 flex items-center justify-center text-xs text-gray-400">…</span>
              ) : (
                <button key={item} onClick={() => setCurrentPage(item)} className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition ${safePage === item ? "bg-gray-900 text-white" : "border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>{item}</button>
              ))}
            <button onClick={() => setCurrentPage(safePage + 1)} disabled={safePage === totalPages} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition"><ChevronRight size={14} /></button>
          </div>
        </div>
      )}

      {/* Bill generation modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50" onClick={closeModal}>
          <div className="bg-white w-full max-w-md rounded-2xl p-6 space-y-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900">{selectedCustomer?.name}</h2>
                <p className="text-xs text-gray-400 mt-0.5">Generate bill for a date range</p>
              </div>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
            </div>
            {error && <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2.5 rounded-xl"><AlertCircle size={14} className="mt-0.5 flex-shrink-0" />{error}</div>}
            {success && <div className="flex items-start gap-2 text-sm text-green-600 bg-green-50 border border-green-100 px-3 py-2.5 rounded-xl"><CheckCircle2 size={14} className="mt-0.5 flex-shrink-0" />{success}</div>}
            {!generatedBill && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">From</label>
                    <input type="date" value={fromDate} max={toDate || new Date().toISOString().split("T")[0]} onChange={(e) => setFromDate(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-50 focus:bg-white px-3 py-2 text-sm text-gray-700 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">To</label>
                    <input type="date" value={toDate} min={fromDate} max={new Date().toISOString().split("T")[0]} onChange={(e) => setToDate(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-50 focus:bg-white px-3 py-2 text-sm text-gray-700 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none" />
                  </div>
                </div>
                <button onClick={handleGenerateBill} disabled={loading || !fromDate || !toDate} className="w-full bg-gray-900 hover:bg-black text-white text-sm font-semibold py-2.5 rounded-xl transition disabled:opacity-50">
                  {loading ? "Generating…" : "Generate Bill"}
                </button>
              </>
            )}
            {generatedBill && (
              <>
                <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-sm border border-gray-100">
                  <div className="flex justify-between"><span className="text-gray-500">Delivery Total</span><span className="font-semibold text-gray-900">₹{generatedBill.deliveryTotal}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Advance Applied</span><span className="font-semibold text-green-600">₹{generatedBill.amountPaid}</span></div>
                  <div className="flex justify-between font-bold text-base border-t border-gray-200 pt-3">
                    <span>Pending</span>
                    <span className={generatedBill.totalAmount - generatedBill.amountPaid > 0 ? "text-red-600" : "text-green-600"}>
                      ₹{Math.max(0, generatedBill.totalAmount - generatedBill.amountPaid)}
                    </span>
                  </div>
                  <StatusPill status={generatedBill.status} />
                </div>
                <button onClick={handleDownload} disabled={downloading} className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white text-sm font-semibold py-2.5 rounded-xl transition disabled:opacity-50">
                  <Download size={14} />{downloading ? "Downloading…" : "Download PDF"}
                </button>
              </>
            )}
            <button onClick={closeModal} className="text-sm text-gray-400 hover:text-gray-600 w-full text-center">Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

function StatusPill({ status }) {
  const cfg = {
    PAID:    { cls: "bg-green-100 text-green-700",  label: "Paid"           },
    PARTIAL: { cls: "bg-amber-100 text-amber-700",  label: "Partially Paid" },
    UNPAID:  { cls: "bg-red-100 text-red-600",      label: "Unpaid"         },
  };
  const { cls, label } = cfg[status] || cfg.UNPAID;
  return <span className={`inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-full ${cls}`}>{label}</span>;
}

export default BillingPage;