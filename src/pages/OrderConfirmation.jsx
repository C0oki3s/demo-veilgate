import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, money } from "../lib/api";

const STATUS_COLORS = { confirmed: "blue", processing: "yellow", shipped: "cyan", delivered: "green", cancelled: "red" };

export default function OrderConfirmation() {
  const navigate = useNavigate();
  const orderId = sessionStorage.getItem("ss_order");
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) { navigate("/orders"); return; }
    api.order(orderId).then((d) => setOrder(d.order)).catch(() => navigate("/orders")).finally(() => setLoading(false));
  }, []);

  function estimatedDelivery(createdAt) {
    const d = new Date(createdAt);
    d.setDate(d.getDate() + 5);
    return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  }

  if (loading) return <div className="page-loading">Loading your order…</div>;
  if (!order) return null;

  return (
    <div className="confirmation-page">
      <div className="confirmation-hero">
        <div className="confirm-icon">🎉</div>
        <h1>Order Confirmed!</h1>
        <p>Thank you for your purchase. Your order <strong>{order.id}</strong> has been placed successfully.</p>
      </div>

      <div className="confirmation-layout">
        <div className="order-card">
          <div className="order-card-header">
            <div>
              <div className="order-id">{order.id}</div>
              <div className="order-date">{new Date(order.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div>
            </div>
            <span className={`status-badge status-${STATUS_COLORS[order.status]}`}>{order.status}</span>
          </div>

          <div className="order-items">
            {order.items.map((item) => (
              <div key={item.productId} className="order-item">
                <span className="order-item-name">{item.name}</span>
                <span className="order-item-qty">× {item.quantity}</span>
                <span className="order-item-price">{money(item.priceCents * item.quantity)}</span>
              </div>
            ))}
          </div>

          <div className="order-totals">
            <div className="summary-row"><span>Subtotal</span><span>{money(order.subtotalCents)}</span></div>
            <div className="summary-row"><span>Shipping</span><span>{order.shippingCents === 0 ? "Free" : money(order.shippingCents)}</span></div>
            <div className="summary-row"><span>Tax</span><span>{money(order.taxCents)}</span></div>
            <div className="summary-row summary-total"><span>Total Paid</span><span>{money(order.totalCents)}</span></div>
          </div>
        </div>

        <div className="confirmation-aside">
          <div className="info-block">
            <h4>📦 Estimated Delivery</h4>
            <p>{estimatedDelivery(order.createdAt)}</p>
          </div>
          <div className="info-block">
            <h4>📍 Shipping To</h4>
            <p>{order.shippingAddress.line1}<br />{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zip}</p>
          </div>
          <div className="info-block">
            <h4>💳 Payment</h4>
            <p>Card ending in {order.paymentMethod.last4} · Paid</p>
          </div>

          <div className="confirmation-actions">
            <Link to="/orders" className="btn btn-primary btn-full" onClick={() => sessionStorage.removeItem("ss_order")}>View All Orders</Link>
            <Link to="/products" className="btn btn-ghost btn-full">Continue Shopping</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
