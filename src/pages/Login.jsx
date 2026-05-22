import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { setAuth, isLoggedIn } from "../lib/auth";
import { Navigate } from "react-router-dom";

export default function Login() {
  if (isLoggedIn()) return <Navigate to="/" replace />;

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { token, user } = await api.login(form);
      setAuth(token, user);
      navigate("/");
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  function demoLogin(email, password = "Password1!") {
    setForm({ email, password });
  }

  function selectAdminLogin() {
    setForm({ email: "admin@shopstorm.io", password: "" });
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <Link to="/" className="auth-logo">⚡ ShopStorm</Link>
          <h1>Welcome back</h1>
          <p>Sign in to your account</p>
        </div>

        <div className="demo-hints">
          <p className="demo-label">Demo accounts: customers use Password1!, admin uses Sairohith@9</p>
          <div className="demo-btns">
            <button className="demo-btn" onClick={() => demoLogin("alice@shopstorm.io")}>alice</button>
            <button className="demo-btn" onClick={() => demoLogin("bob@shopstorm.io")}>bob</button>
            <button className="demo-btn demo-btn-admin" onClick={selectAdminLogin}>admin</button>
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={submit} className="auth-form">
          <div className="field">
            <label>Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" required autoFocus />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" required />
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p className="auth-switch">
          Don't have an account? <Link to="/signup">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
