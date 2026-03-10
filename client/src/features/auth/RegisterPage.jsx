/**
 * features/auth/RegisterPage.jsx
 *
 * Self-serve signup for new dairy owners.
 * Creates their Tenant + admin account in one step.
 * On success → auto-login → redirect to dashboard.
 *
 * Route: /register (public, add to AppRouter.jsx)
 */

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerTenant } from "../../api/auth.api";
import { useAuth } from "../../context/AuthContext"; // your existing auth context
import {
  Building2, User, Phone, Mail, Lock, Eye, EyeOff,
  AlertCircle, Loader2, Check,
} from "lucide-react";

const Field = ({ label, icon: Icon, rightSlot, error, ...props }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
      {label}
    </label>
    <div className="relative">
      {Icon && (
        <Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      )}
      <input
        className={`w-full rounded-xl border bg-gray-50 focus:bg-white py-2.5 text-sm
          text-gray-800 placeholder-gray-400 outline-none transition
          focus:ring-1 focus:ring-gray-900 focus:border-gray-900
          ${Icon ? "pl-9" : "pl-3"}
          ${rightSlot ? "pr-10" : "pr-3"}
          ${error ? "border-red-300" : "border-gray-200"}`}
        {...props}
      />
      {rightSlot && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightSlot}</div>
      )}
    </div>
    {error && (
      <p className="text-xs text-red-500 flex items-center gap-1">
        <AlertCircle size={10} /> {error}
      </p>
    )}
  </div>
);

export default function RegisterPage() {
  const navigate = useNavigate();
  const { login: authLogin } = useAuth(); // your existing AuthContext login method

  const [form, setForm] = useState({
    businessName: "",
    ownerName:    "",
    phone:        "",
    email:        "",
    password:     "",
    confirm:      "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);
  const [apiErr,  setApiErr]  = useState("");
  const [success, setSuccess] = useState(false);

  const set = (field) => (e) => {
    setForm((p) => ({ ...p, [field]: e.target.value }));
    if (errors[field]) setErrors((p) => ({ ...p, [field]: "" }));
    setApiErr("");
  };

  const validate = () => {
    const e = {};
    if (!form.businessName.trim()) e.businessName = "Business name is required";
    if (!form.ownerName.trim())    e.ownerName    = "Owner name is required";
    if (!/^[6-9]\d{9}$/.test(form.phone))
      e.phone = "Enter a valid 10-digit mobile number";
    if (!/^\S+@\S+\.\S+$/.test(form.email))
      e.email = "Enter a valid email address";
    if (form.password.length < 8)
      e.password = "Password must be at least 8 characters";
    if (form.password !== form.confirm)
      e.confirm = "Passwords do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setApiErr("");

    try {
      const res = await registerTenant({
        businessName: form.businessName.trim(),
        ownerName:    form.ownerName.trim(),
        phone:        form.phone.trim(),
        email:        form.email.toLowerCase().trim(),
        password:     form.password,
      });

      const { token, user } = res.data.data;

      // Log them in immediately via your existing AuthContext
      authLogin(token, user);
      setSuccess(true);

      // Brief success moment, then redirect
      setTimeout(() => navigate("/admin/dashboard"), 1000);

    } catch (err) {
      setApiErr(err?.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto">
            <Building2 size={22} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Start your free trial</h1>
          <p className="text-sm text-gray-500">
            Set up your dairy in 60 seconds. No credit card needed.
          </p>
        </div>

        {/* Form */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">

            <Field
              label="Dairy / Business Name"
              icon={Building2}
              value={form.businessName}
              onChange={set("businessName")}
              placeholder="Siddhivinayak Dairy"
              error={errors.businessName}
            />
            <Field
              label="Your Name"
              icon={User}
              value={form.ownerName}
              onChange={set("ownerName")}
              placeholder="Ramesh Patil"
              error={errors.ownerName}
            />

            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Phone"
                icon={Phone}
                value={form.phone}
                onChange={set("phone")}
                placeholder="9876543210"
                maxLength={10}
                error={errors.phone}
              />
              <Field
                label="Email"
                icon={Mail}
                type="email"
                value={form.email}
                onChange={set("email")}
                placeholder="you@email.com"
                error={errors.email}
              />
            </div>

            <Field
              label="Password"
              icon={Lock}
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={set("password")}
              placeholder="Min. 8 characters"
              error={errors.password}
              rightSlot={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              }
            />
            <Field
              label="Confirm Password"
              icon={Lock}
              type={showPassword ? "text" : "password"}
              value={form.confirm}
              onChange={set("confirm")}
              placeholder="Repeat your password"
              error={errors.confirm}
            />

            {apiErr && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50
                border border-red-100 px-4 py-3 rounded-xl">
                <AlertCircle size={14} className="flex-shrink-0" />
                {apiErr}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || success}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl
                text-sm font-semibold transition disabled:opacity-70
                ${success
                  ? "bg-green-600 text-white"
                  : "bg-gray-900 hover:bg-black text-white"}`}
            >
              {loading  ? <><Loader2 size={15} className="animate-spin" /> Creating account…</> :
               success  ? <><Check size={15} /> Account created! Redirecting…</> :
               "Create free account"}
            </button>

          </form>
        </div>

        {/* Trial info */}
        <div className="bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4 space-y-2">
          <p className="text-xs font-bold text-amber-800 uppercase tracking-wide">
            What you get free for 30 days
          </p>
          {["Unlimited lanes and customers", "Bill generation and PDF download",
            "Payment tracking", "Daily delivery summary"].map((item) => (
            <div key={item} className="flex items-center gap-2 text-xs text-amber-700">
              <Check size={11} className="flex-shrink-0 text-amber-600" />
              {item}
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-gray-400">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-gray-700 hover:text-gray-900">
            Sign in
          </Link>
        </p>

      </div>
    </div>
  );
}