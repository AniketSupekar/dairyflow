/**
 * features/auth/RegisterPage.jsx
 *
 * Self-serve dairy owner signup.
 * On success: auto-login via AuthContext.login() + redirect to /admin
 * Already-logged-in users are bounced away by PublicOnlyRoute before reaching here.
 */

import { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import api from "../../api/axios";
import logo from "../../assets/logo.png";
import {
  Building2, User, Phone, Mail, Lock,
  Eye, EyeOff, AlertCircle, CheckCircle2, ArrowRight,
} from "lucide-react";

const FIELDS = [
  { name: "businessName", label: "Dairy / Business Name", placeholder: "e.g. Shree Krishna Dairy", icon: Building2, type: "text" },
  { name: "ownerName",    label: "Your Full Name",         placeholder: "e.g. Ramesh Patil",        icon: User,      type: "text" },
  { name: "phone",        label: "Mobile Number",          placeholder: "10-digit mobile number",   icon: Phone,     type: "text", inputMode: "numeric" },
  { name: "email",        label: "Email Address",          placeholder: "yourname@email.com",       icon: Mail,      type: "email" },
];

export default function RegisterPage() {
  const { login } = useContext(AuthContext);
  const navigate  = useNavigate();

  const [form, setForm]       = useState({ businessName: "", ownerName: "", phone: "", email: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Basic client-side guard
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters."); return;
    }
    if (!/^[6-9]\d{9}$/.test(form.phone)) {
      setError("Enter a valid 10-digit Indian mobile number."); return;
    }

    setLoading(true);
    try {
      const res  = await api.post("/auth/register", form);
      const { token } = res.data.data;

      setSuccess(true);

      // Auto-login — no second step
      setTimeout(() => {
        login(token);
        navigate("/admin", { replace: true });
      }, 800);

    } catch (err) {
      setError(err.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">

        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <img src={logo} alt="DairyFlow" className="w-14 h-14 rounded-2xl object-cover shadow-md mb-4" />
          <h1 className="text-lg font-bold text-gray-900">DairyFlow</h1>
          <p className="text-xs text-gray-500 mt-1">Dairy Operations Platform</p>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-7">
          <div className="mb-6 text-center">
            <h2 className="text-xl font-bold text-gray-900">Start free trial</h2>
            <p className="text-sm text-gray-500 mt-1">30 days free · No credit card required</p>
          </div>

          {/* Success state */}
          {success && (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
                <CheckCircle2 size={28} className="text-green-500" />
              </div>
              <p className="text-sm font-bold text-gray-900">Account created!</p>
              <p className="text-xs text-gray-500">Taking you to your dashboard…</p>
            </div>
          )}

          {!success && (
            <form onSubmit={handleSubmit} className="space-y-4">

              {error && (
                <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 text-red-700 px-3.5 py-3 rounded-xl text-sm">
                  <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              {/* Text fields */}
              {FIELDS.map(({ name, label, placeholder, icon: Icon, type, inputMode }) => (
                <div key={name} className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">{label}</label>
                  <div className="relative">
                    <Icon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                      name={name} type={type} inputMode={inputMode}
                      value={form[name]} onChange={handleChange}
                      placeholder={placeholder} required
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50
                        focus:bg-white focus:border-gray-900 focus:ring-1 focus:ring-gray-900
                        outline-none text-sm text-gray-800 placeholder-gray-400 transition"
                    />
                  </div>
                </div>
              ))}

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Password</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    name="password" type={showPass ? "text" : "password"}
                    value={form.password} onChange={handleChange}
                    placeholder="Min. 8 characters" required minLength={8}
                    className="w-full pl-10 pr-11 py-3 border border-gray-200 rounded-xl bg-gray-50
                      focus:bg-white focus:border-gray-900 focus:ring-1 focus:ring-gray-900
                      outline-none text-sm text-gray-800 placeholder-gray-400 transition"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-gray-400 leading-relaxed">
                By registering you agree to our terms of service. Your 30-day free trial starts immediately.
              </p>

              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-black
                  text-white py-3 rounded-xl text-sm font-bold transition disabled:opacity-60 mt-1">
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Creating account…
                  </>
                ) : (
                  <>Create account <ArrowRight size={15} /></>
                )}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 mt-5">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-gray-900 hover:underline">Sign in</Link>
        </p>

        <p className="text-center text-gray-400 text-xs mt-4">
          © {new Date().getFullYear()} DairyFlow. All rights reserved.
        </p>
      </div>
    </div>
  );
}