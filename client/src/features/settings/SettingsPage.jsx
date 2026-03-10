/**
 * features/settings/SettingsPage.jsx
 *
 * Business profile settings page.
 * - Edit dairy name, owner name, phone, address, invoice prefix
 * - Upload / replace / remove logo with live preview
 * - All changes reflect instantly in header and PDFs via TenantContext
 *
 * Route: /admin/settings
 */

import { useState, useRef, useEffect } from "react";
import { useTenant } from "../../hooks/useTenant";
import {
  updateTenantSettings,
  uploadTenantLogo,
  deleteTenantLogo,
} from "../../api/tenant.api";
import {
  Building2, User, Phone, MapPin, FileText,
  Upload, Trash2, Check, AlertCircle, Loader2,
  Camera, Crown,
} from "lucide-react";

// ─── Shared input component ───────────────────────────────────────────────────
const Field = ({ label, icon: Icon, error, ...props }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
      {label}
    </label>
    <div className="relative">
      {Icon && (
        <Icon
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
      )}
      <input
        className={`w-full rounded-xl border bg-gray-50 focus:bg-white px-3 py-2.5 text-sm
          text-gray-800 placeholder-gray-400 outline-none transition
          focus:ring-1 focus:ring-gray-900 focus:border-gray-900
          ${Icon ? "pl-9" : ""}
          ${error ? "border-red-300 focus:border-red-400 focus:ring-red-300" : "border-gray-200"}`}
        {...props}
      />
    </div>
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { tenant, loading, refreshTenant, updateTenantLocally } = useTenant();

  const [form, setForm] = useState({
    name:          "",
    contactName:   "",
    phone:         "",
    address:       "",
    invoicePrefix: "INV",
  });

  // Populate form once tenant data arrives — useEffect is the correct pattern,
  // never call setState during render
  useEffect(() => {
    if (tenant) {
      setForm({
        name:          tenant.businessName  || "",
        contactName:   tenant.ownerName     || "",
        phone:         tenant.phone         || "",
        address:       tenant.address       || "",
        invoicePrefix: tenant.invoicePrefix || "INV",
      });
    }
  }, [tenant]);

  const [errors,  setErrors]  = useState({});
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [saveErr, setSaveErr] = useState("");

  // Logo state
  const [logoPreview,    setLogoPreview]    = useState(null);
  const [logoFile,       setLogoFile]       = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading,      setUploading]      = useState(false);
  const [uploadErr,      setUploadErr]      = useState("");
  const [removingLogo,   setRemovingLogo]   = useState(false);

  const fileInputRef = useRef(null);

  const handleChange = (field) => (e) => {
    setForm((p) => ({ ...p, [field]: e.target.value }));
    if (errors[field]) setErrors((p) => ({ ...p, [field]: "" }));
    setSaved(false);
    setSaveErr("");
  };

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.name.trim())
      e.name = "Business name is required";
    if (!form.contactName.trim())
      e.contactName = "Owner name is required";
    if (!/^[6-9]\d{9}$/.test(form.phone))
      e.phone = "Enter a valid 10-digit Indian mobile number";
    if (form.invoicePrefix && form.invoicePrefix.length > 6)
      e.invoicePrefix = "Prefix cannot exceed 6 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Save profile ───────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    setSaveErr("");
    try {
      await updateTenantSettings({
        name:          form.name.trim(),
        contactName:   form.contactName.trim(),
        phone:         form.phone.trim(),
        address:       form.address.trim(),
        invoicePrefix: form.invoicePrefix.trim().toUpperCase(),
      });
      updateTenantLocally({
        businessName:  form.name.trim(),
        ownerName:     form.contactName.trim(),
        phone:         form.phone.trim(),
        address:       form.address.trim(),
        invoicePrefix: form.invoicePrefix.trim().toUpperCase(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setSaveErr(err?.response?.data?.message || "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ── Logo file select ───────────────────────────────────────────────────────
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ALLOWED = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!ALLOWED.includes(file.type)) {
      setUploadErr("Only JPEG, PNG and WebP files are allowed.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setUploadErr("Logo must be smaller than 2MB.");
      return;
    }
    setUploadErr("");
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  // ── Logo upload ────────────────────────────────────────────────────────────
  const handleUploadLogo = async () => {
    if (!logoFile) return;
    setUploading(true);
    setUploadProgress(0);
    setUploadErr("");
    try {
      const res = await uploadTenantLogo(logoFile, setUploadProgress);
      const newLogoUrl = res.data.data.logoUrl;
      updateTenantLocally({ logoUrl: newLogoUrl });
      setLogoFile(null);
      setLogoPreview(null);
      await refreshTenant();
    } catch (err) {
      setUploadErr(err?.response?.data?.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  // ── Logo remove ────────────────────────────────────────────────────────────
  const handleRemoveLogo = async () => {
    if (!window.confirm("Remove your logo? The app default will be used in PDFs.")) return;
    setRemovingLogo(true);
    try {
      await deleteTenantLogo();
      updateTenantLocally({ logoUrl: "" });
      setLogoPreview(null);
      setLogoFile(null);
    } catch (err) {
      setUploadErr(err?.response?.data?.message || "Could not remove logo.");
    } finally {
      setRemovingLogo(false);
    }
  };

  const currentLogo = logoPreview || tenant?.logoUrl || null;

  // ── Plan badge helpers (only computed when tenant exists) ──────────────────
  const planLabel = (() => {
    if (!tenant?.plan) return null;
    if (tenant.plan === "free") {
      const trialEnd = tenant.trialEndsAt
        ? new Date(tenant.trialEndsAt).toLocaleDateString("en-IN", {
            day: "numeric", month: "short",
          })
        : null;
      return trialEnd ? `Free plan · Trial ends ${trialEnd}` : "Free plan";
    }
    return `${tenant.plan.charAt(0).toUpperCase()}${tenant.plan.slice(1)} plan`;
  })();

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 space-y-6">

      {/* ── Page header ── */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Manage your dairy's business profile
        </p>
      </div>

      {/* ── Plan badge ── */}
      {planLabel && (
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold
          ${tenant.plan === "free"
            ? "bg-gray-100 text-gray-600"
            : "bg-amber-100 text-amber-700"}`}
        >
          <Crown size={11} />
          {planLabel}
        </div>
      )}

      {/* ── Logo section ── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-bold text-gray-900">Business Logo</h2>
        <p className="text-xs text-gray-500">
          Shown on PDF bills sent to your customers. JPEG, PNG or WebP, max 2MB.
        </p>

        <div className="flex items-start gap-5">
          {/* Preview box */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-24 h-24 rounded-2xl border-2 border-dashed border-gray-200
              bg-gray-50 flex items-center justify-center flex-shrink-0 overflow-hidden
              cursor-pointer hover:border-gray-400 transition"
          >
            {currentLogo ? (
              <img
                src={currentLogo}
                alt="Logo preview"
                className="w-full h-full object-contain p-1"
              />
            ) : (
              <div className="flex flex-col items-center gap-1 text-gray-300">
                <Camera size={22} />
                <span className="text-[10px] font-semibold">Upload</span>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="space-y-3 flex-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 text-xs font-semibold
                  border border-gray-200 px-3 py-2 rounded-xl hover:bg-gray-50 transition text-gray-700"
              >
                <Upload size={12} /> Choose file
              </button>

              {logoFile && (
                <button
                  onClick={handleUploadLogo}
                  disabled={uploading}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold
                    bg-gray-900 text-white px-3 py-2 rounded-xl hover:bg-black
                    disabled:opacity-50 transition"
                >
                  {uploading
                    ? <><Loader2 size={12} className="animate-spin" /> Uploading {uploadProgress}%</>
                    : <><Upload size={12} /> Upload logo</>}
                </button>
              )}

              {tenant?.logoUrl && !logoFile && (
                <button
                  onClick={handleRemoveLogo}
                  disabled={removingLogo}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold
                    border border-red-200 text-red-500 px-3 py-2 rounded-xl
                    hover:bg-red-50 disabled:opacity-50 transition"
                >
                  {removingLogo
                    ? <Loader2 size={12} className="animate-spin" />
                    : <Trash2 size={12} />}
                  Remove
                </button>
              )}
            </div>

            {logoFile && (
              <p className="text-xs text-gray-400">
                Selected: <span className="font-semibold text-gray-600">{logoFile.name}</span>
                {" "}· {(logoFile.size / 1024).toFixed(0)}KB
              </p>
            )}

            {uploading && (
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gray-900 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}

            {uploadErr && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle size={11} /> {uploadErr}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Profile form ── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
        <h2 className="text-sm font-bold text-gray-900">Business Profile</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="Business Name"
            icon={Building2}
            value={form.name}
            onChange={handleChange("name")}
            placeholder="Siddhivinayak Dairy"
            error={errors.name}
          />
          <Field
            label="Owner Name"
            icon={User}
            value={form.contactName}
            onChange={handleChange("contactName")}
            placeholder="Ramesh Patil"
            error={errors.contactName}
          />
          <Field
            label="Phone Number"
            icon={Phone}
            value={form.phone}
            onChange={handleChange("phone")}
            placeholder="9876543210"
            maxLength={10}
            error={errors.phone}
          />
          <Field
            label="Invoice Prefix"
            icon={FileText}
            value={form.invoicePrefix}
            onChange={handleChange("invoicePrefix")}
            placeholder="INV"
            maxLength={6}
            error={errors.invoicePrefix}
          />
        </div>

        {/* Address — full width */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Address
          </label>
          <div className="relative">
            <MapPin
              size={14}
              className="absolute left-3 top-3 text-gray-400 pointer-events-none"
            />
            <textarea
              value={form.address}
              onChange={handleChange("address")}
              placeholder="Sector 12, Pune, Maharashtra"
              rows={2}
              maxLength={300}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 focus:bg-white
                pl-9 pr-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none
                transition focus:ring-1 focus:ring-gray-900 focus:border-gray-900 resize-none"
            />
          </div>
          <p className="text-xs text-gray-400 text-right">{form.address.length}/300</p>
        </div>

        {/* Save error */}
        {saveErr && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50
            border border-red-100 px-4 py-3 rounded-xl">
            <AlertCircle size={14} className="flex-shrink-0" />
            {saveErr}
          </div>
        )}

        {/* Save button */}
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-gray-400">
            These details appear on all PDF bills sent to your customers.
          </p>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5
              rounded-xl transition disabled:opacity-50
              ${saved
                ? "bg-green-600 text-white"
                : "bg-gray-900 hover:bg-black text-white"}`}
          >
            {saving  ? <><Loader2 size={14} className="animate-spin" /> Saving…</> :
             saved   ? <><Check size={14} /> Saved!</> :
             "Save Changes"}
          </button>
        </div>
      </div>

      {/* ── PDF Header Preview ── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-3">
        <h2 className="text-sm font-bold text-gray-900">PDF Header Preview</h2>
        <p className="text-xs text-gray-500">
          This is how your business info will appear on customer bills.
        </p>

        <div className="flex items-center gap-4 bg-gray-900 rounded-xl p-4">
          {currentLogo ? (
            <img
              src={currentLogo}
              alt="Logo"
              className="w-14 h-14 rounded-lg object-contain bg-white p-1 flex-shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
              <Building2 size={22} className="text-white/40" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-white font-bold text-base truncate">
              {form.name || "Your Dairy Name"}
            </p>
            <p className="text-gray-400 text-xs mt-0.5 truncate">
              {[form.phone, form.address].filter(Boolean).join("  ·  ")}
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}