import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import api from "../../api/axios";
import logo from "../../assets/logo.png";
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";

export default function ResetPasswordPage() {
  const [searchParams]  = useSearchParams();
  const token           = searchParams.get("token");
  const navigate        = useNavigate();

  const [password,     setPassword]     = useState("");
  const [confirmPass,  setConfirmPass]  = useState("");
  const [showPass,     setShowPass]     = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [success,      setSuccess]      = useState(false);
  const [error,        setError]        = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 8)       { setError("Password must be at least 8 characters."); return; }
    if (password !== confirmPass)  { setError("Passwords do not match."); return; }
    if (!token)                    { setError("Invalid reset link. Please request a new one."); return; }
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      setSuccess(true);
      setTimeout(() => navigate("/login", { replace: true }), 2500);
    } catch (err) {
      setError(err.response?.data?.message || "Reset failed. The link may have expired.");
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
          {success ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
                <CheckCircle2 size={28} className="text-green-500" />
              </div>
              <div>
                <p className="text-base font-bold text-gray-900">Password updated!</p>
                <p className="text-sm text-gray-500 mt-1">Redirecting you to sign in…</p>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900">Set new password</h2>
                <p className="text-sm text-gray-500 mt-1">Must be at least 8 characters.</p>
              </div>

              {!token && (
                <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 text-red-700 px-3.5 py-3 rounded-xl text-sm mb-4">
                  <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                  Invalid reset link. Please{" "}
                  <Link to="/forgot-password" className="underline font-semibold ml-1">request a new one</Link>.
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 text-red-700 px-3.5 py-3 rounded-xl text-sm">
                    <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />{error}
                  </div>
                )}

                {/* New password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">New Password</label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input type={showPass ? "text" : "password"} value={password}
                      onChange={(e) => setPassword(e.target.value)} placeholder="Min. 8 characters" required
                      className="w-full pl-10 pr-11 py-3 border border-gray-200 rounded-xl bg-gray-50
                        focus:bg-white focus:border-gray-900 focus:ring-1 focus:ring-gray-900
                        outline-none text-sm text-gray-800 placeholder-gray-400 transition" />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
                      {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                {/* Confirm password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Confirm Password</label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input type={showPass ? "text" : "password"} value={confirmPass}
                      onChange={(e) => setConfirmPass(e.target.value)} placeholder="Re-enter password" required
                      className={`w-full pl-10 pr-4 py-3 border rounded-xl bg-gray-50
                        focus:bg-white focus:ring-1 outline-none text-sm text-gray-800
                        placeholder-gray-400 transition
                        ${confirmPass && confirmPass !== password
                          ? "border-red-300 focus:border-red-400 focus:ring-red-300"
                          : "border-gray-200 focus:border-gray-900 focus:ring-gray-900"}`} />
                  </div>
                  {confirmPass && confirmPass !== password && (
                    <p className="text-xs text-red-500">Passwords do not match</p>
                  )}
                </div>

                <button type="submit" disabled={loading || !token}
                  className="w-full bg-gray-900 hover:bg-black text-white py-3 rounded-xl
                    text-sm font-bold transition disabled:opacity-60">
                  {loading ? "Updating…" : "Set New Password"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}