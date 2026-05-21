import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api, money } from "../lib/api";

const STATUS_COLORS = { confirmed: "blue", processing: "yellow", shipped: "cyan", delivered: "green", cancelled: "red" };

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    api.order(id).then((d) => setOrder(d.order)).catch(() => navigate("/orders")).finally(() => setLoading(false));
  }, [id]);

  async function cancel() {
    if (!confirm("Cancel this order?")) return;
    setCancelling(true);
    try {
      const d = await api.cancelOrder(id);
      setOrder(d.order);
    } catch (err) {
      alert(err.message);
    } finally {
      setCancelling(false);
    }
  }

  if (loading) return <div className="page-loading">Loading…</div>;
  if (!order) return null;

  const canCancel = ["confirmed", "processing"].includes(order.status);
  const canReturn = ["delivered", "shipped"].includes(order.status);

  return (
    <div className="order-detail-page">
      <div className="breadcrumb">
        <Link to="/orders">Orders</Link> › {order.id}
      </div>

      <div className="order-detail-header">
        <div>
          <h1>{order.id}</h1>
          <p>Placed on {new Date(order.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
        </div>
        <span className={`status-badge status-lg status-${STATUS_COLORS[order.status]}`}>{order.status}</span>
      </div>

      <div className="order-detail-layout">
        <div className="order-detail-main">
          <div className="card">
            <h3>Items</h3>
            {order.items.map((item) => (
              <div key={item.productId} className="order-item-row">
                <span className="order-item-name">{item.name}</span>
                <span className="order-item-qty">× {item.quantity}</span>
                <span className="order-item-price">{money(item.priceCents * item.quantity)}</span>
              </div>
            ))}
            <div className="summary-divider" />
            <div className="summary-row"><span>Subtotal</span><span>{money(order.subtotalCents)}</span></div>
            <div className="summary-row"><span>Shipping</span><span>{order.shippingCents === 0 ? "Free" : money(order.shippingCents)}</span></div>
            <div className="summary-row"><span>Tax</span><span>{money(order.taxCents)}</span></div>
            <div className="summary-row summary-total"><span>Total</span><span>{money(order.totalCents)}</span></div>
          </div>

          <div className="order-actions">
            {canCancel && (
              <button className="btn btn-danger" onClick={cancel} disabled={cancelling}>
                {cancelling ? "Cancelling…" : "Cancel Order"}
              </button>
            )}
            {canReturn && (
              <Link to={`/returns?orderId=${order.id}`} className="btn btn-outline">Request Return</Link>
            )}
            <Link to="/orders" className="btn btn-ghost">← Back to Orders</Link>
          </div>
        </div>

        <div className="order-detail-aside">
          <div className="info-block">
            <h4>📍 Shipping Address</h4>
            <p>{order.shippingAddress.line1}<br />{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zip}</p>
          </div>
          <div className="info-block">
            <h4>💳 Payment</h4>
            <p>Card ending in {order.paymentMethod?.last4 || "****"}<br />Status: <span className="text-green">{order.paymentStatus}</span></p>
          </div>
          {order.trackingNumber && (
            <div className="info-block">
              <h4>📮 Tracking</h4>
              <p className="mono">{order.trackingNumber}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
