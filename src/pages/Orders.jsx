import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, money } from "../lib/api";

const STATUS_COLORS = { confirmed: "blue", processing: "yellow", shipped: "cyan", delivered: "green", cancelled: "red" };

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const orderItems = Array.isArray(orders) ? orders : [];

  useEffect(() => {
    api.orders()
      .then((d) => setOrders(Array.isArray(d?.orders) ? d.orders : []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-loading">Loading orders…</div>;

  return (
    <div className="orders-page">
      <h1>My Orders</h1>
      {orderItems.length === 0 ? (
        <div className="empty-state">
          <span>📦</span>
          <h3>No orders yet</h3>
          <p>When you place an order, it will appear here.</p>
          <Link to="/products" className="btn btn-primary">Start Shopping</Link>
        </div>
      ) : (
        <div className="orders-list">
          {orderItems.map((order) => (
            <div key={order.id} className="order-row">
              <div className="order-row-left">
                <div className="order-row-id">{order.id}</div>
                <div className="order-row-date">{new Date(order.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</div>
                <div className="order-row-items">{order.items.map((i) => i.name).join(", ")}</div>
              </div>
              <div className="order-row-right">
                <span className={`status-badge status-${STATUS_COLORS[order.status]}`}>{order.status}</span>
                <span className="order-row-total">{money(order.totalCents)}</span>
                <Link to={`/orders/${order.id}`} className="btn btn-sm btn-ghost">View →</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
