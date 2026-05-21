import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, money } from "../lib/api";
import { setAuth, getToken } from "../lib/auth";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const orderItems = Array.isArray(orders) ? orders : [];

  useEffect(() => {
    Promise.all([
      api.profile().then((d) => setUser(d.user)),
      api.orders().then((d) => {
        const orders = Array.isArray(d?.orders) ? d.orders : [];
        setOrders(orders.slice(0, 3));
      }),
    ]).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function saveProfile(e) {
    e.preventDefault();
    setSaving(true); setError(""); setSuccess("");
    try {
      const d = await api.updateProfile({
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        address: user.address,
      });
      setUser(d.user);
      setAuth(getToken(), d.user);
      setSuccess("Profile updated!");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(e) {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirm) { setError("Passwords don't match"); return; }
    setSavingPw(true); setError("");
    try {
      await api.changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      setSuccess("Password changed!");
      setPwForm({ currentPassword: "", newPassword: "", confirm: "" });
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingPw(false);
    }
  }

  const setU = (path) => (e) => {
    const parts = path.split(".");
    setUser((u) => {
      const next = { ...u };
      if (parts.length === 1) next[parts[0]] = e.target.value;
      else next[parts[0]] = { ...next[parts[0]], [parts[1]]: e.target.value };
      return next;
    });
  };

  const setPw = (k) => (e) => setPwForm((f) => ({ ...f, [k]: e.target.value }));

  if (loading) return <div className="page-loading">Loading profile…</div>;
  if (!user) return null;

  return (
    <div className="profile-page">
      <h1>My Profile</h1>

      {success && <div className="alert alert-success">{success}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="profile-layout">
        <div className="profile-main">
          <form onSubmit={saveProfile} className="card card-form">
            <h3>Personal Information</h3>
            <div className="field-row">
              <div className="field">
                <label>First Name</label>
                <input type="text" value={user.firstName} onChange={setU("firstName")} />
              </div>
              <div className="field">
                <label>Last Name</label>
                <input type="text" value={user.lastName} onChange={setU("lastName")} />
              </div>
            </div>
            <div className="field">
              <label>Username</label>
              <input type="text" value={user.username} disabled className="disabled-input" />
            </div>
            <div className="field">
              <label>Email</label>
              <input type="email" value={user.email} disabled className="disabled-input" />
            </div>
            <div className="field">
              <label>Phone</label>
              <input type="tel" value={user.phone} onChange={setU("phone")} placeholder="555-555-5555" />
            </div>

            <h3>Default Address</h3>
            <div className="field">
              <label>Street</label>
              <input type="text" value={user.address?.line1 || ""} onChange={setU("address.line1")} />
            </div>
            <div className="field-row">
              <div className="field">
                <label>City</label>
                <input type="text" value={user.address?.city || ""} onChange={setU("address.city")} />
              </div>
              <div className="field field-sm">
                <label>State</label>
                <input type="text" value={user.address?.state || ""} onChange={setU("address.state")} maxLength={2} />
              </div>
              <div className="field">
                <label>ZIP</label>
                <input type="text" value={user.address?.zip || ""} onChange={setU("address.zip")} />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </form>

          <form onSubmit={changePassword} className="card card-form">
            <h3>Change Password</h3>
            <div className="field">
              <label>Current Password</label>
              <input type="password" value={pwForm.currentPassword} onChange={setPw("currentPassword")} required />
            </div>
            <div className="field">
              <label>New Password</label>
              <input type="password" value={pwForm.newPassword} onChange={setPw("newPassword")} required />
            </div>
            <div className="field">
              <label>Confirm New Password</label>
              <input type="password" value={pwForm.confirm} onChange={setPw("confirm")} required />
            </div>
            <button type="submit" className="btn btn-outline" disabled={savingPw}>
              {savingPw ? "Changing…" : "Change Password"}
            </button>
          </form>
        </div>

        <div className="profile-aside">
          <div className="card">
            <div className="profile-avatar-section">
              <div className="profile-avatar">{user.firstName?.[0] || user.username?.[0] || "U"}</div>
              <div>
                <strong>{user.firstName} {user.lastName}</strong>
                <p>@{user.username}</p>
                {user.role === "admin" && <span className="badge badge-accent">Admin</span>}
              </div>
            </div>
            <p className="profile-member">Member since {new Date(user.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long" })}</p>
          </div>

          <div className="card">
            <h4>Recent Orders</h4>
            {orderItems.length === 0 ? (
              <p className="muted">No orders yet.</p>
            ) : (
              orderItems.map((o) => (
                <Link key={o.id} to={`/orders/${o.id}`} className="mini-order-row">
                  <span>{o.id}</span>
                  <span>{money(o.totalCents)}</span>
                </Link>
              ))
            )}
            <Link to="/orders" className="btn btn-ghost btn-sm btn-full">View All Orders</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
