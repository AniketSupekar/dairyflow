import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";
import logo from "../../assets/logo.png";
import { Mail, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) { setError("Please enter your email address."); return; }
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email: email.trim() });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        <div className="flex flex-col items-center mb-8">
          <img src={logo} alt="DairyFlow" className="w-14 h-14 rounded-2xl object-cover shadow-md mb-4" />
          <h1 className="text-lg font-bold text-gray-900">DairyFlow</h1>
          <p className="text-xs text-gray-500 mt-1">Dairy Operations Platform</p>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-7">
          {sent ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
                <CheckCircle2 size={28} className="text-green-500" />
              </div>
              <div>
                <p className="text-base font-bold text-gray-900">Check your email</p>
                <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                  If an account exists for <strong>{email}</strong>, we've sent a password reset link.
                  It expires in 1 hour.
                </p>
              </div>
              <p className="text-xs text-gray-400">
                Didn't get it? Check your spam folder.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900">Forgot password?</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Enter your registered email and we'll send you a reset link.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 text-red-700 px-3.5 py-3 rounded-xl text-sm">
                    <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />{error}
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Email Address</label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="yourname@email.com" required
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50
                        focus:bg-white focus:border-gray-900 focus:ring-1 focus:ring-gray-900
                        outline-none text-sm text-gray-800 placeholder-gray-400 transition" />
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full bg-gray-900 hover:bg-black text-white py-3 rounded-xl
                    text-sm font-bold transition disabled:opacity-60">
                  {loading ? "Sending…" : "Send Reset Link"}
                </button>
              </form>
            </>
          )}
        </div>

        <div className="flex justify-center mt-5">
          <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition font-medium">
            <ArrowLeft size={14} /> Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}