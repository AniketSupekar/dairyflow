import { useEffect, useState, useMemo } from "react";
import { getCustomersByLane, generateBill, downloadBillPdf } from "../../api/billing.api";
import { getLanes } from "../../api/lane.api";
import CustomerFinancialPanel from "../../components/CustomerFinancialPanel";
import { Search, X, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Download } from "lucide-react";

const PAGE_SIZE = 12;

const BillingPage = () => {
  const [lanes, setLanes] = useState([]);
  const [selectedLane, setSelectedLane] = useState("");
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [generatedBill, setGeneratedBill] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [financialCustomerId, setFinancialCustomerId] = useState(null);
  const [financialCustomer, setFinancialCustomer] = useState(null);

  useEffect(() => {
    const fetchLanes = async () => {
      try {
        const res = await getLanes();
        setLanes(res.data.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchLanes();
  }, []);

  const handleLaneChange = async (laneId) => {
    setSelectedLane(laneId);
    setCustomers([]);
    setSearch("");
    setCurrentPage(1);
    if (!laneId) return;
    try {
      const res = await getCustomersByLane(laneId);
      setCustomers(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredCustomers = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase();
    return customers.filter((c) => c.name.toLowerCase().includes(q));
  }, [customers, search]);

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedCustomers = filteredCustomers.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const openModal = (customer) => {
    setSelectedCustomer(customer);
    setGeneratedBill(null);
    setError("");
    setSuccess("");
    setFromDate("");
    setToDate("");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setFromDate("");
    setToDate("");
    setGeneratedBill(null);
    setError("");
    setSuccess("");
  };

  const handleGenerateBill = async () => {
    setError("");
    setSuccess("");
    if (!fromDate || !toDate) { setError("Please select both from and to dates."); return; }
    if (new Date(fromDate) >= new Date(toDate)) { setError("From date must be before to date."); return; }
    if (new Date(toDate) > new Date()) { setError("Cannot generate bill for future dates."); return; }

    setLoading(true);
    try {
      const res = await generateBill({ customerId: selectedCustomer._id, fromDate, toDate });
      setGeneratedBill(res.data.data);
      setSuccess("Bill generated successfully.");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to generate bill.");
    }
    setLoading(false);
  };

  // ── PDF Download ──────────────────────────────────────────────────────────────
  // FIX: window.open() makes a plain browser request with no headers → 401
  // axios has the JWT interceptor so it sends Authorization: Bearer <token>
  // We receive the PDF as a blob and trigger a programmatic download
  const handleDownload = async () => {
    if (!generatedBill?._id) return;
    setDownloading(true);
    setError("");
    try {
      const blob = await downloadBillPdf(generatedBill._id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bill-${generatedBill._id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError("Failed to download PDF. Please try again.");
      console.error(err);
    }
    setDownloading(false);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">

      {financialCustomerId && (
        <CustomerFinancialPanel
          customerId={financialCustomerId}
          customer={financialCustomer}
          onClose={() => { setFinancialCustomerId(null); setFinancialCustomer(null); }}
        />
      )}

      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">Financials</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage bills and payments by lane</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-6">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">Select Lane</label>
        <select
          value={selectedLane}
          onChange={(e) => handleLaneChange(e.target.value)}
          className="w-full sm:w-72 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white px-4 py-2.5 text-sm text-gray-700 focus:ring-1 focus:ring-gray-900 focus:border-gray-900 outline-none transition"
        >
          <option value="">Select Lane</option>
          {lanes.map((lane) => (
            <option key={lane._id} value={lane._id}>{lane.name}</option>
          ))}
        </select>
      </div>

      {customers.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <p className="text-sm text-gray-500">
            <span className="font-semibold text-gray-900">{filteredCustomers.length}</span>{" "}
            customer{filteredCustomers.length !== 1 ? "s" : ""}
            {search && ` matching "${search}"`}
          </p>
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              placeholder="Search customer…"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none pl-9 pr-8 py-2.5 text-sm text-gray-700 placeholder-gray-400 transition"
            />
            {search && (
              <button onClick={() => { setSearch(""); setCurrentPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={13} />
              </button>
            )}
          </div>
        </div>
      )}

      {paginatedCustomers.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {paginatedCustomers.map((customer) => (
            <div key={customer._id} className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4 hover:border-gray-300 hover:shadow-sm transition">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 truncate">{customer.name}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Opening: ₹{customer.openingBalance || 0}</p>
                </div>
                {(customer.openingBalance || 0) > 0 && (
                  <span className="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100">
                    ₹{customer.openingBalance} due
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={() => openModal(customer)} className="flex-1 bg-gray-900 hover:bg-black text-white text-xs font-semibold px-3 py-2 rounded-xl transition">
                  Generate Bill
                </button>
                <button onClick={() => { setFinancialCustomerId(customer._id); setFinancialCustomer(customer); }} className="flex-1 border border-gray-200 text-xs font-semibold px-3 py-2 rounded-xl hover:bg-gray-50 transition text-gray-700">
                  View Financials
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {customers.length > 0 && filteredCustomers.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16">
          <Search size={20} className="text-gray-300 mb-3" />
          <p className="text-sm font-semibold text-gray-500">No customers match &ldquo;{search}&rdquo;</p>
          <p className="text-xs text-gray-400 mt-1">Try a different name</p>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pb-2">
          <p className="text-xs text-gray-400 font-medium">
            Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredCustomers.length)} of {filteredCustomers.length}
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setCurrentPage(safePage - 1)} disabled={safePage === 1} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition">
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
              .reduce((acc, p, idx, arr) => {
                if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
                acc.push(p);
                return acc;
              }, [])
              .map((item, idx) =>
                item === "..." ? (
                  <span key={`e-${idx}`} className="w-8 h-8 flex items-center justify-center text-xs text-gray-400">…</span>
                ) : (
                  <button key={item} onClick={() => setCurrentPage(item)} className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition ${safePage === item ? "bg-gray-900 text-white" : "border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                    {item}
                  </button>
                )
              )}
            <button onClick={() => setCurrentPage(safePage + 1)} disabled={safePage === totalPages} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

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

            {error && (
              <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2.5 rounded-xl">
                <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />{error}
              </div>
            )}
            {success && (
              <div className="flex items-start gap-2 text-sm text-green-600 bg-green-50 border border-green-100 px-3 py-2.5 rounded-xl">
                <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0" />{success}
              </div>
            )}

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
                  <div className="flex justify-between">
                    <span className="text-gray-500">Delivery Total</span>
                    <span className="font-semibold text-gray-900">₹{generatedBill.deliveryTotal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Advance Applied</span>
                    <span className="font-semibold text-green-600">₹{generatedBill.amountPaid}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base border-t border-gray-200 pt-3">
                    <span>Pending</span>
                    <span className={generatedBill.totalAmount - generatedBill.amountPaid > 0 ? "text-red-600" : "text-green-600"}>
                      ₹{Math.max(0, generatedBill.totalAmount - generatedBill.amountPaid)}
                    </span>
                  </div>
                  <StatusPill status={generatedBill.status} />
                </div>
                <button onClick={handleDownload} disabled={downloading} className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white text-sm font-semibold py-2.5 rounded-xl transition disabled:opacity-50">
                  <Download size={14} />
                  {downloading ? "Downloading…" : "Download PDF"}
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
    PAID:    { cls: "bg-green-100 text-green-700", label: "Paid" },
    PARTIAL: { cls: "bg-amber-100 text-amber-700", label: "Partially Paid" },
    UNPAID:  { cls: "bg-red-100 text-red-600",     label: "Unpaid" },
  };
  const { cls, label } = cfg[status] || cfg.UNPAID;
  return <span className={`inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-full ${cls}`}>{label}</span>;
}

export default BillingPage;