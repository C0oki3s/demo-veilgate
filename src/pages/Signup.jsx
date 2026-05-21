import { useState } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { api } from "../lib/api";
import { setAuth, isLoggedIn } from "../lib/auth";

export default function Signup() {
  if (isLoggedIn()) return <Navigate to="/" replace />;

  const [form, setForm] = useState({ email: "", username: "", password: "", firstName: "", lastName: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (form.password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    try {
      const { token, user } = await api.signup(form);
      setAuth(token, user);
      navigate("/products");
    } catch (err) {
      setError(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card auth-card-wide">
        <div className="auth-header">
          <Link to="/" className="auth-logo">⚡ ShopStorm</Link>
          <h1>Create your account</h1>
          <p>Join millions of happy shoppers</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={submit} className="auth-form">
          <div className="field-row">
            <div className="field">
              <label>First Name</label>
              <input type="text" value={form.firstName} onChange={set("firstName")} placeholder="Jane" autoFocus />
            </div>
            <div className="field">
              <label>Last Name</label>
              <input type="text" value={form.lastName} onChange={set("lastName")} placeholder="Doe" />
            </div>
          </div>
          <div className="field">
            <label>Username</label>
            <input type="text" value={form.username} onChange={set("username")} placeholder="jane_doe" required />
          </div>
          <div className="field">
            <label>Email</label>
            <input type="email" value={form.email} onChange={set("email")} placeholder="jane@example.com" required />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={form.password} onChange={set("password")} placeholder="Min 6 characters" required />
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? "Creating account…" : "Create Account"}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
