import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { api, money } from "../lib/api";

const STATUS_COLORS = { pending: "yellow", approved: "green", rejected: "red", completed: "blue" };

export default function Returns() {
  const [searchParams] = useSearchParams();
  const prefillOrderId = searchParams.get("orderId") || "";

  const [returns, setReturns] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ orderId: prefillOrderId, reason: "", items: [] });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(!!prefillOrderId);

  const returnItems = Array.isArray(returns) ? returns : [];
  const orderItems = Array.isArray(orders) ? orders : [];

  useEffect(() => {
    Promise.all([
      api.returns().then((d) => setReturns(Array.isArray(d?.returns) ? d.returns : [])),
      api.orders().then((d) => {
        const orders = Array.isArray(d?.orders) ? d.orders : [];
        setOrders(orders.filter((o) => ["delivered", "shipped"].includes(o.status)));
      }),
    ]).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const selectedOrder = orderItems.find((o) => o.id === form.orderId);

  function toggleItem(productId) {
    setForm((f) => ({
      ...f,
      items: f.items.find((i) => i.productId === productId)
        ? f.items.filter((i) => i.productId !== productId)
        : [...f.items, { productId, quantity: 1 }],
    }));
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.orderId) { setError("Select an order"); return; }
    if (!form.items.length) { setError("Select at least one item to return"); return; }
    if (!form.reason) { setError("Provide a reason"); return; }
    setSubmitting(true); setError("");
    try {
      const d = await api.createReturn(form);
      setReturns((r) => [d.return, ...(Array.isArray(r) ? r : [])]);
      setSuccess(`Return request submitted! ID: ${d.return.id}`);
      setForm({ orderId: "", reason: "", items: [] });
      setShowForm(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="page-loading">Loading…</div>;

  return (
    <div className="returns-page">
      <div className="page-header">
        <h1>Returns</h1>
        {orderItems.length > 0 && (
          <button className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Cancel" : "+ New Return Request"}
          </button>
        )}
      </div>

      {success && <div className="alert alert-success">{success}</div>}

      {showForm && (
        <form onSubmit={submit} className="card card-form">
          <h3>New Return Request</h3>
          {error && <div className="alert alert-error">{error}</div>}

          <div className="field">
            <label>Order</label>
            <select value={form.orderId} onChange={(e) => setForm((f) => ({ ...f, orderId: e.target.value, items: [] }))} required>
              <option value="">Select order…</option>
              {orderItems.map((o) => (
                <option key={o.id} value={o.id}>{o.id} — {new Date(o.createdAt).toLocaleDateString()}</option>
              ))}
            </select>
          </div>

          {selectedOrder && (
            <div className="field">
              <label>Items to Return</label>
              <div className="items-checklist">
                {(Array.isArray(selectedOrder.items) ? selectedOrder.items : []).map((item) => (
                  <label key={item.productId} className="check-item">
                    <input
                      type="checkbox"
                      checked={!!form.items.find((i) => i.productId === item.productId)}
                      onChange={() => toggleItem(item.productId)}
                    />
                    <span>{item.name} × {item.quantity} ({money(item.priceCents * item.quantity)})</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="field">
            <label>Reason for Return</label>
            <textarea value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} placeholder="Describe why you're returning this item…" rows={3} required />
          </div>

          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "Submitting…" : "Submit Return Request"}
          </button>
        </form>
      )}

      {returnItems.length === 0 && !showForm ? (
        <div className="empty-state">
          <span>📦</span>
          <h3>No returns yet</h3>
          <p>Returns you request will appear here. 30-day return window on all orders.</p>
        </div>
      ) : (
        <div className="returns-list">
          {returnItems.map((ret) => (
            <div key={ret.id} className="return-row">
              <div>
                <div className="return-id">{ret.id}</div>
                <div className="return-order">Order: {ret.orderId}</div>
                <div className="return-reason">{ret.reason}</div>
              </div>
              <div className="return-right">
                <span className={`status-badge status-${STATUS_COLORS[ret.status]}`}>{ret.status}</span>
                <span className="return-refund">{money(ret.refundCents)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
