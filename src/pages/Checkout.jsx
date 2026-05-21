import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, money } from "../lib/api";
import { getUser } from "../lib/auth";

export default function Checkout() {
  const navigate = useNavigate();
  const user = getUser();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addr, setAddr] = useState({
    line1: user?.address?.line1 || "",
    city: user?.address?.city || "",
    state: user?.address?.state || "",
    zip: user?.address?.zip || "",
    country: user?.address?.country || "US",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    api.cart().then((d) => {
      if (!d.cart.items.length) { navigate("/cart"); return; }
      setCart(d.cart);
    }).catch(() => navigate("/cart")).finally(() => setLoading(false));
  }, []);

  const set = (k) => (e) => setAddr((a) => ({ ...a, [k]: e.target.value }));

  function submit(e) {
    e.preventDefault();
    if (!addr.line1 || !addr.city || !addr.state || !addr.zip) {
      setError("Please fill all address fields");
      return;
    }
    sessionStorage.setItem("ss_shipping", JSON.stringify(addr));
    navigate("/payment");
  }

  if (loading) return <div className="page-loading">Loading…</div>;

  return (
    <div className="checkout-page">
      <div className="checkout-steps">
        <span className="step active">1. Shipping</span>
        <span className="step-arrow">›</span>
        <span className="step">2. Payment</span>
        <span className="step-arrow">›</span>
        <span className="step">3. Confirm</span>
      </div>

      <div className="checkout-layout">
        <form onSubmit={submit} className="checkout-form">
          <h2>Shipping Address</h2>
          {error && <div className="alert alert-error">{error}</div>}

          <div className="field">
            <label>Street Address</label>
            <input type="text" value={addr.line1} onChange={set("line1")} placeholder="123 Main St" required autoFocus />
          </div>
          <div className="field-row">
            <div className="field">
              <label>City</label>
              <input type="text" value={addr.city} onChange={set("city")} placeholder="Austin" required />
            </div>
            <div className="field field-sm">
              <label>State</label>
              <input type="text" value={addr.state} onChange={set("state")} placeholder="TX" maxLength={2} required />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>ZIP Code</label>
              <input type="text" value={addr.zip} onChange={set("zip")} placeholder="78701" required />
            </div>
            <div className="field">
              <label>Country</label>
              <select value={addr.country} onChange={set("country")}>
                <option value="US">United States</option>
                <option value="CA">Canada</option>
                <option value="GB">United Kingdom</option>
                <option value="AU">Australia</option>
              </select>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-full btn-lg">
            Continue to Payment →
          </button>
        </form>

        {cart && (
          <div className="checkout-summary">
            <h3>Order Summary</h3>
            {cart.items.map((item) => (
              <div key={item.productId} className="summary-item">
                <span className="summary-item-emoji">{item.product?.emoji}</span>
                <span className="summary-item-name">{item.product?.name} × {item.quantity}</span>
                <span>{money(item.priceCents * item.quantity)}</span>
              </div>
            ))}
            <div className="summary-divider" />
            <div className="summary-row"><span>Subtotal</span><span>{money(cart.subtotalCents)}</span></div>
            <div className="summary-row"><span>Shipping</span><span>{cart.shippingCents === 0 ? "Free" : money(cart.shippingCents)}</span></div>
            <div className="summary-row"><span>Tax</span><span>{money(cart.taxCents)}</span></div>
            <div className="summary-row summary-total"><span>Total</span><span>{money(cart.totalCents)}</span></div>
          </div>
        )}
      </div>
    </div>
  );
}
