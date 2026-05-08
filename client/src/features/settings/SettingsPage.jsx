import { useState, useRef, useEffect } from "react";
import { useTenant } from "../../hooks/useTenant";
import { updateTenantSettings, uploadTenantLogo, deleteTenantLogo } from "../../api/tenant.api";
import {
  Building2, User, Phone, MapPin, FileText,
  Upload, Trash2, Check, AlertCircle, Loader2,
  Camera, IndianRupee,
} from "lucide-react";

const Field = ({ label, icon: Icon, error, hint, ...props }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
    <div className="relative">
      {Icon && <Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />}
      <input className={`w-full rounded-xl border bg-gray-50 focus:bg-white px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none transition focus:ring-1 focus:ring-gray-900 focus:border-gray-900 ${Icon ? "pl-9" : ""} ${error ? "border-red-300 focus:border-red-400 focus:ring-red-300" : "border-gray-200"}`} {...props} />
    </div>
    {error ? <p className="text-xs text-red-500">{error}</p> : hint && <p className="text-xs text-gray-400">{hint}</p>}
  </div>
);

export default function SettingsPage() {
  const { tenant, loading, refreshTenant, updateTenantLocally } = useTenant();
  const [form, setForm] = useState({ name: "", contactName: "", phone: "", address: "", invoicePrefix: "INV", upiId: "" });

  useEffect(() => {
    if (tenant) setForm({ name: tenant.businessName || "", contactName: tenant.ownerName || "", phone: tenant.phone || "", address: tenant.address || "", invoicePrefix: tenant.invoicePrefix || "INV", upiId: tenant.upiId || "" });
  }, [tenant]);

  const [errors, setErrors]   = useState({});
  const [saving, setSaving]   = useState(false);
  const [saved,  setSaved]    = useState(false);
  const [saveErr, setSaveErr] = useState("");
  const [logoPreview, setLogoPreview]       = useState(null);
  const [logoFile, setLogoFile]             = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading]           = useState(false);
  const [uploadErr, setUploadErr]           = useState("");
  const [removingLogo, setRemovingLogo]     = useState(false);
  const fileInputRef = useRef(null);

  const handleChange = (field) => (e) => { setForm((p) => ({ ...p, [field]: e.target.value })); if (errors[field]) setErrors((p) => ({ ...p, [field]: "" })); setSaved(false); setSaveErr(""); };

  const validate = () => {
    const e = {};
    if (!form.name.trim())        e.name = "Business name is required";
    if (!form.contactName.trim()) e.contactName = "Owner name is required";
    if (!/^[6-9]\d{9}$/.test(form.phone)) e.phone = "Enter a valid 10-digit Indian mobile number";
    if (form.invoicePrefix && form.invoicePrefix.length > 6) e.invoicePrefix = "Max 6 characters";
    if (form.upiId && !/^[a-zA-Z0-9.\-_+]+@[a-zA-Z0-9]+$/.test(form.upiId.trim())) e.upiId = "Enter a valid UPI ID (e.g. 9876543210@ybl)";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true); setSaveErr("");
    try {
      await updateTenantSettings({ name: form.name.trim(), contactName: form.contactName.trim(), phone: form.phone.trim(), address: form.address.trim(), invoicePrefix: form.invoicePrefix.trim().toUpperCase(), upiId: form.upiId.trim() });
      updateTenantLocally({ businessName: form.name.trim(), ownerName: form.contactName.trim(), phone: form.phone.trim(), address: form.address.trim(), invoicePrefix: form.invoicePrefix.trim().toUpperCase(), upiId: form.upiId.trim() });
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch (err) { setSaveErr(err?.response?.data?.message || "Failed to save. Please try again."); }
    finally { setSaving(false); }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg","image/jpg","image/png","image/webp"].includes(file.type)) { setUploadErr("Only JPEG, PNG and WebP files are allowed."); return; }
    if (file.size > 2 * 1024 * 1024) { setUploadErr("Logo must be smaller than 2MB."); return; }
    setUploadErr(""); setLogoFile(file); setLogoPreview(URL.createObjectURL(file));
  };

  const handleUploadLogo = async () => {
    if (!logoFile) return;
    setUploading(true); setUploadProgress(0); setUploadErr("");
    try {
      const res = await uploadTenantLogo(logoFile, setUploadProgress);
      updateTenantLocally({ logoUrl: res.data.data.logoUrl });
      setLogoFile(null); setLogoPreview(null);
      await refreshTenant();
    } catch (err) { setUploadErr(err?.response?.data?.message || "Upload failed."); }
    finally { setUploading(false); }
  };

  const handleRemoveLogo = async () => {
    if (!window.confirm("Remove your logo?")) return;
    setRemovingLogo(true);
    try { await deleteTenantLogo(); updateTenantLocally({ logoUrl: "" }); setLogoPreview(null); setLogoFile(null); }
    catch (err) { setUploadErr(err?.response?.data?.message || "Could not remove logo."); }
    finally { setRemovingLogo(false); }
  };

  const currentLogo = logoPreview || tenant?.logoUrl || null;

  if (loading) return <div className="max-w-3xl mx-auto px-4 py-12 flex items-center justify-center"><Loader2 size={20} className="animate-spin text-gray-400" /></div>;

  return (
    <div className="max-w-3xl mx-auto px-4 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your dairy's business profile</p>
      </div>

      {/* Logo */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
        <div><h2 className="text-sm font-bold text-gray-900">Business Logo</h2><p className="text-xs text-gray-500 mt-0.5">Shown on PDF bills. JPEG, PNG or WebP · max 2MB.</p></div>
        <div className="flex items-start gap-5">
          <div onClick={() => fileInputRef.current?.click()} className="w-24 h-24 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center flex-shrink-0 overflow-hidden cursor-pointer hover:border-gray-400 transition">
            {currentLogo ? <img src={currentLogo} alt="Logo preview" className="w-full h-full object-contain p-1" /> : <div className="flex flex-col items-center gap-1 text-gray-300"><Camera size={22} /><span className="text-[10px] font-semibold">Upload</span></div>}
          </div>
          <div className="space-y-3 flex-1">
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handleFileSelect} className="hidden" />
            <div className="flex flex-wrap gap-2">
              <button onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-1.5 text-xs font-semibold border border-gray-200 px-3 py-2 rounded-xl hover:bg-gray-50 transition text-gray-700"><Upload size={12} /> Choose file</button>
              {logoFile && <button onClick={handleUploadLogo} disabled={uploading} className="inline-flex items-center gap-1.5 text-xs font-semibold bg-gray-900 text-white px-3 py-2 rounded-xl hover:bg-black disabled:opacity-50 transition">{uploading ? <><Loader2 size={12} className="animate-spin" /> {uploadProgress}%</> : <><Upload size={12} /> Upload</>}</button>}
              {tenant?.logoUrl && !logoFile && <button onClick={handleRemoveLogo} disabled={removingLogo} className="inline-flex items-center gap-1.5 text-xs font-semibold border border-red-200 text-red-500 px-3 py-2 rounded-xl hover:bg-red-50 disabled:opacity-50 transition">{removingLogo ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Remove</button>}
            </div>
            {logoFile && <p className="text-xs text-gray-400">{logoFile.name} · {(logoFile.size/1024).toFixed(0)}KB</p>}
            {uploading && <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-gray-900 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} /></div>}
            {uploadErr && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={11} />{uploadErr}</p>}
          </div>
        </div>
      </div>

      {/* Business profile */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
        <div><h2 className="text-sm font-bold text-gray-900">Business Profile</h2><p className="text-xs text-gray-500 mt-0.5">These details appear on every PDF bill sent to customers.</p></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Business Name"  icon={Building2} value={form.name}          onChange={handleChange("name")}          placeholder="Siddhivinayak Dairy" error={errors.name} />
          <Field label="Owner Name"     icon={User}      value={form.contactName}   onChange={handleChange("contactName")}   placeholder="Ramesh Patil"        error={errors.contactName} />
          <Field label="Phone Number"   icon={Phone}     value={form.phone}         onChange={handleChange("phone")}         placeholder="9876543210" maxLength={10} error={errors.phone} />
          <Field label="Invoice Prefix" icon={FileText}  value={form.invoicePrefix} onChange={handleChange("invoicePrefix")} placeholder="INV" maxLength={6}   error={errors.invoicePrefix} hint="e.g. INV → bill numbers like INV-001" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Address</label>
          <div className="relative">
            <MapPin size={14} className="absolute left-3 top-3 text-gray-400 pointer-events-none" />
            <textarea value={form.address} onChange={handleChange("address")} placeholder="Sector 12, Pune, Maharashtra" rows={2} maxLength={300} className="w-full rounded-xl border border-gray-200 bg-gray-50 focus:bg-white pl-9 pr-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none transition focus:ring-1 focus:ring-gray-900 focus:border-gray-900 resize-none" />
          </div>
          <p className="text-xs text-gray-400 text-right">{form.address.length}/300</p>
        </div>

        {/* UPI ID */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">UPI ID</label>
            <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Optional</span>
          </div>
          <div className="relative">
            <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input type="text" value={form.upiId} onChange={handleChange("upiId")} placeholder="9876543210@ybl  or  yourname@okicici" maxLength={100}
              className={`w-full rounded-xl border bg-gray-50 focus:bg-white pl-9 pr-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none transition focus:ring-1 focus:ring-gray-900 focus:border-gray-900 ${errors.upiId ? "border-red-300 focus:border-red-400 focus:ring-red-300" : "border-gray-200"}`} />
          </div>
          {errors.upiId ? <p className="text-xs text-red-500">{errors.upiId}</p> : <p className="text-xs text-gray-400">When set, a tap-to-pay UPI link is added to every WhatsApp bill automatically.</p>}
          {form.upiId && !errors.upiId && (
            <div className="flex items-center gap-2.5 bg-green-50 border border-green-100 rounded-xl px-3.5 py-2.5 mt-1">
              <div className="w-5 h-5 rounded-full bg-[#25D366] flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" fill="white" className="w-3 h-3"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </div>
              <div><p className="text-xs font-semibold text-green-800">Pay link active · {form.upiId.trim()}</p><p className="text-[10px] text-green-600 mt-0.5">Included in every WhatsApp message</p></div>
            </div>
          )}
        </div>

        {saveErr && <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 px-4 py-3 rounded-xl"><AlertCircle size={14} className="flex-shrink-0" />{saveErr}</div>}
        <div className="flex items-center justify-between pt-1 border-t border-gray-100">
          <p className="text-xs text-gray-400">Changes reflect on all future PDF bills.</p>
          <button onClick={handleSave} disabled={saving} className={`inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl transition disabled:opacity-50 ${saved ? "bg-green-600 text-white" : "bg-gray-900 hover:bg-black text-white"}`}>
            {saving ? <><Loader2 size={14} className="animate-spin" />Saving…</> : saved ? <><Check size={14} />Saved!</> : "Save Changes"}
          </button>
        </div>
      </div>

      {/* PDF preview */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-3">
        <div><h2 className="text-sm font-bold text-gray-900">PDF Header Preview</h2><p className="text-xs text-gray-500 mt-0.5">How your business info appears on customer bills.</p></div>
        <div className="flex items-center gap-4 bg-gray-900 rounded-xl p-4">
          {currentLogo ? <img src={currentLogo} alt="Logo" className="w-14 h-14 rounded-lg object-contain bg-white p-1 flex-shrink-0" /> : <div className="w-14 h-14 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0"><Building2 size={22} className="text-white/40" /></div>}
          <div className="min-w-0">
            <p className="text-white font-bold text-base truncate">{form.name || "Your Dairy Name"}</p>
            <p className="text-gray-400 text-xs mt-0.5 truncate">{[form.phone, form.address].filter(Boolean).join("  ·  ")}</p>
            {form.upiId && <p className="text-gray-500 text-[10px] mt-1 flex items-center gap-1"><IndianRupee size={9} /> UPI: {form.upiId.trim()}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}