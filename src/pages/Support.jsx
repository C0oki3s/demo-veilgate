import { useEffect, useState } from "react";
import { api } from "../lib/api";

const CATEGORIES = ["shipping", "billing", "product", "account", "other"];
const STATUS_COLORS = { open: "blue", in_progress: "yellow", resolved: "green", closed: "red" };

export default function Support() {
  const [tickets, setTickets] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [replyBody, setReplyBody] = useState("");
  const [form, setForm] = useState({ subject: "", body: "", category: "other", relatedOrderId: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const ticketItems = Array.isArray(tickets) ? tickets : [];
  const orderItems = Array.isArray(orders) ? orders : [];

  useEffect(() => {
    Promise.all([
      api.tickets().then((d) => setTickets(Array.isArray(d?.tickets) ? d.tickets : [])),
      api.orders().then((d) => setOrders(Array.isArray(d?.orders) ? d.orders : [])),
    ]).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function createTicket(e) {
    e.preventDefault();
    if (!form.subject || !form.body) { setError("Subject and message are required"); return; }
    setSubmitting(true); setError("");
    try {
      const d = await api.createTicket(form);
      setTickets((t) => [d.ticket, ...(Array.isArray(t) ? t : [])]);
      setForm({ subject: "", body: "", category: "other", relatedOrderId: "" });
      setShowForm(false);
      setOpenId(d.ticket.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function reply(ticketId) {
    if (!replyBody.trim()) return;
    try {
      const d = await api.replyTicket(ticketId, replyBody);
      setTickets((ts) => (Array.isArray(ts) ? ts : []).map((t) => t.id === ticketId ? d.ticket : t));
      setReplyBody("");
    } catch (err) { alert(err.message); }
  }

  async function close(ticketId) {
    if (!confirm("Close this ticket?")) return;
    const d = await api.closeTicket(ticketId);
    setTickets((ts) => (Array.isArray(ts) ? ts : []).map((t) => t.id === ticketId ? d.ticket : t));
  }

  if (loading) return <div className="page-loading">Loading…</div>;

  return (
    <div className="support-page">
      <div className="page-header">
        <div>
          <h1>Support Center</h1>
          <p>We typically respond within 24 hours.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancel" : "+ New Ticket"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={createTicket} className="card card-form">
          <h3>Create Support Ticket</h3>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="field-row">
            <div className="field">
              <label>Category</label>
              <select value={form.category} onChange={set("category")}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Related Order (optional)</label>
              <select value={form.relatedOrderId} onChange={set("relatedOrderId")}>
                <option value="">None</option>
                {orderItems.map((o) => <option key={o.id} value={o.id}>{o.id}</option>)}
              </select>
            </div>
          </div>
          <div className="field">
            <label>Subject</label>
            <input type="text" value={form.subject} onChange={set("subject")} placeholder="What do you need help with?" required autoFocus />
          </div>
          <div className="field">
            <label>Message</label>
            <textarea value={form.body} onChange={set("body")} placeholder="Describe your issue in detail…" rows={4} required />
          </div>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "Submitting…" : "Submit Ticket"}
          </button>
        </form>
      )}

      {ticketItems.length === 0 && !showForm ? (
        <div className="empty-state">
          <span>💬</span>
          <h3>No support tickets</h3>
          <p>Need help? Create a ticket and our team will get back to you.</p>
        </div>
      ) : (
        <div className="tickets-list">
          {ticketItems.map((ticket) => (
            <div key={ticket.id} className="ticket-item">
              <div className="ticket-header" onClick={() => setOpenId(openId === ticket.id ? null : ticket.id)}>
                <div className="ticket-title-row">
                  <span className="ticket-subject">{ticket.subject}</span>
                  <span className={`status-badge status-${STATUS_COLORS[ticket.status]}`}>{ticket.status.replace("_", " ")}</span>
                </div>
                <div className="ticket-meta">
                  <span>#{ticket.id}</span>
                  <span>{ticket.category}</span>
                  <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                  <span>{openId === ticket.id ? "▲" : "▼"}</span>
                </div>
              </div>

              {openId === ticket.id && (
                <div className="ticket-body">
                  <div className="messages">
                    {ticket.messages.map((msg, i) => (
                      <div key={i} className={`message message-${msg.from}`}>
                        <div className="message-from">{msg.from === "user" ? "You" : "Support Team"}</div>
                        <div className="message-text">{msg.body}</div>
                        <div className="message-time">{new Date(msg.createdAt).toLocaleString()}</div>
                      </div>
                    ))}
                  </div>

                  {!["resolved", "closed"].includes(ticket.status) && (
                    <div className="reply-box">
                      <textarea value={replyBody} onChange={(e) => setReplyBody(e.target.value)} placeholder="Write a reply…" rows={2} />
                      <div className="reply-actions">
                        <button className="btn btn-primary btn-sm" onClick={() => reply(ticket.id)} disabled={!replyBody.trim()}>Send Reply</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => close(ticket.id)}>Close Ticket</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
