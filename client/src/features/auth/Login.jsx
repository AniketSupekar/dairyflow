import { useState, useContext } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";
import { AuthContext } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, AlertCircle, Phone, Lock } from "lucide-react";
import logo from "../../assets/logo.png";

const Login = () => {
  const [phone, setPhone]               = useState("");
  const [password, setPassword]         = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");
  const { login }  = useContext(AuthContext);
  const navigate   = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!phone || !password) { setError("Please enter your phone and password."); return; }
    setLoading(true);
    try {
      const res      = await api.post("/auth/login", { phone, password });
      const token    = res.data.data.token;
      const userData = login(token);
      navigate(userData.role === "admin" ? "/admin" : "/user");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid credentials. Please try again.");
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
          <div className="mb-6 text-center">
            <h2 className="text-xl font-bold text-gray-900">Welcome back</h2>
            <p className="text-sm text-gray-500 mt-1">Sign in to continue to your dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 text-red-700 px-3.5 py-3 rounded-xl text-sm">
                <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />{error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Phone Number</label>
              <div className="relative">
                <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input type="text" inputMode="numeric" placeholder="Enter your phone number"
                  value={phone} onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50
                    focus:bg-white focus:border-gray-900 focus:ring-1 focus:ring-gray-900
                    outline-none text-sm text-gray-800 placeholder-gray-400 transition" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Password</label>
                <Link to="/forgot-password"
                  className="text-xs font-semibold text-gray-500 hover:text-gray-900 transition">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input type={showPassword ? "text" : "password"} placeholder="Enter your password"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-11 py-3 border border-gray-200 rounded-xl bg-gray-50
                    focus:bg-white focus:border-gray-900 focus:ring-1 focus:ring-gray-900
                    outline-none text-sm text-gray-800 placeholder-gray-400 transition" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-gray-900 hover:bg-black text-white py-3 rounded-xl text-sm font-bold transition disabled:opacity-60 mt-1">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Signing in…
                </span>
              ) : "Sign in"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-5">
          New to DairyFlow?{" "}
          <Link to="/register" className="font-semibold text-gray-900 hover:underline">Start free trial</Link>
        </p>

        <p className="text-center text-gray-400 text-xs mt-4">
          © {new Date().getFullYear()} DairyFlow. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default Login;