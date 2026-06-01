import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

function formatError(detail) {
  if (!detail) return "Something went wrong.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map(e => e?.msg || JSON.stringify(e)).join(" ");
  return String(detail);
}

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(formatError(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-testid="login-page" className="min-h-screen flex items-center justify-center pt-20 px-4">
      <div className="w-full max-w-md">
        <div className="bg-[#16161f] border border-[#2a2a3a] rounded-2xl p-8">
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#6c5ce7] to-[#a29bfe] flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-lg">PS</span>
            </div>
            <h1 className="heading-font text-2xl font-semibold text-white">Welcome Back</h1>
            <p className="text-sm text-[#6b6b80] mt-1">Sign in to your account</p>
          </div>

          {error && (
            <div data-testid="login-error" className="bg-[#e74c3c]/10 border border-[#e74c3c]/30 rounded-xl px-4 py-3 mb-5 text-sm text-[#e74c3c]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-[#a1a1b5] mb-1 block">Email</label>
              <input data-testid="login-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full bg-[#0a0a0f] border border-[#2a2a3a] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#6b6b80] focus:outline-none focus:border-[#6c5ce7]" placeholder="you@example.com" />
            </div>
            <div>
              <label className="text-xs text-[#a1a1b5] mb-1 block">Password</label>
              <input data-testid="login-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full bg-[#0a0a0f] border border-[#2a2a3a] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#6b6b80] focus:outline-none focus:border-[#6c5ce7]" placeholder="Your password" />
            </div>
            <button data-testid="login-submit" type="submit" disabled={loading} className="w-full bg-[#6c5ce7] hover:bg-[#5b4bd6] text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50">
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="text-center text-sm text-[#6b6b80] mt-6">
            Don't have an account?{" "}
            <Link to="/register" data-testid="register-link" className="text-[#6c5ce7] hover:underline">Sign Up</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await register(name, email, password);
      navigate("/");
    } catch (err) {
      setError(formatError(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-testid="register-page" className="min-h-screen flex items-center justify-center pt-20 px-4">
      <div className="w-full max-w-md">
        <div className="bg-[#16161f] border border-[#2a2a3a] rounded-2xl p-8">
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#6c5ce7] to-[#a29bfe] flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-lg">PS</span>
            </div>
            <h1 className="heading-font text-2xl font-semibold text-white">Create Account</h1>
            <p className="text-sm text-[#6b6b80] mt-1">Join Premium Sphere today</p>
          </div>

          {error && (
            <div data-testid="register-error" className="bg-[#e74c3c]/10 border border-[#e74c3c]/30 rounded-xl px-4 py-3 mb-5 text-sm text-[#e74c3c]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-[#a1a1b5] mb-1 block">Name</label>
              <input data-testid="register-name" type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full bg-[#0a0a0f] border border-[#2a2a3a] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#6b6b80] focus:outline-none focus:border-[#6c5ce7]" placeholder="Your name" />
            </div>
            <div>
              <label className="text-xs text-[#a1a1b5] mb-1 block">Email</label>
              <input data-testid="register-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full bg-[#0a0a0f] border border-[#2a2a3a] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#6b6b80] focus:outline-none focus:border-[#6c5ce7]" placeholder="you@example.com" />
            </div>
            <div>
              <label className="text-xs text-[#a1a1b5] mb-1 block">Password</label>
              <input data-testid="register-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} className="w-full bg-[#0a0a0f] border border-[#2a2a3a] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#6b6b80] focus:outline-none focus:border-[#6c5ce7]" placeholder="Min 6 characters" />
            </div>
            <button data-testid="register-submit" type="submit" disabled={loading} className="w-full bg-[#6c5ce7] hover:bg-[#5b4bd6] text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50">
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <p className="text-center text-sm text-[#6b6b80] mt-6">
            Already have an account?{" "}
            <Link to="/login" data-testid="login-link-from-register" className="text-[#6c5ce7] hover:underline">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export { LoginPage, RegisterPage };
