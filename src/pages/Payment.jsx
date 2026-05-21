import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, money } from "../lib/api";

export default function Payment() {
  const navigate = useNavigate();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [card, setCard] = useState({ number: "", expiry: "", cvv: "", name: "" });

  const shippingAddress = JSON.parse(sessionStorage.getItem("ss_shipping") || "null");

  useEffect(() => {
    if (!shippingAddress) { navigate("/checkout"); return; }
    api.cart().then((d) => {
      if (!d.cart.items.length) { navigate("/cart"); return; }
      setCart(d.cart);
    }).catch(() => navigate("/cart")).finally(() => setLoading(false));
  }, []);

  const setC = (k) => (e) => {
    let v = e.target.value;
    if (k === "number") v = v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
    if (k === "expiry") v = v.replace(/\D/g, "").slice(0, 4).replace(/^(\d{2})(\d)/, "$1/$2");
    if (k === "cvv") v = v.replace(/\D/g, "").slice(0, 4);
    setCard((c) => ({ ...c, [k]: v }));
  };

  async function placeOrder(e) {
    e.preventDefault();
    const digits = card.number.replace(/\s/g, "");
    if (digits.length < 13) { setError("Enter a valid card number"); return; }
    if (!card.expiry || !card.cvv || !card.name) { setError("Fill all card details"); return; }

    setPlacing(true); setError("");
    try {
      const { order } = await api.createOrder({
        shippingAddress,
        paymentMethod: { type: "card", last4: digits.slice(-4), name: card.name },
      });
      sessionStorage.setItem("ss_order", order.id);
      sessionStorage.removeItem("ss_shipping");
      navigate("/order-confirmation");
    } catch (err) {
      setError(err.message || "Payment failed. Please try again.");
    } finally {
      setPlacing(false);
    }
  }

  if (loading) return <div className="page-loading">Loading…</div>;

  return (
    <div className="checkout-page">
      <div className="checkout-steps">
        <span className="step done">1. Shipping ✓</span>
        <span className="step-arrow">›</span>
        <span className="step active">2. Payment</span>
        <span className="step-arrow">›</span>
        <span className="step">3. Confirm</span>
      </div>

      <div className="checkout-layout">
        <form onSubmit={placeOrder} className="checkout-form">
          <h2>Payment Details</h2>
          <div className="card-demo-hint">
            💳 This is a demo — enter any 16-digit number (e.g. 4242 4242 4242 4242)
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <div className="field">
            <label>Cardholder Name</label>
            <input type="text" value={card.name} onChange={setC("name")} placeholder="Jane Doe" required autoFocus />
          </div>
          <div className="field">
            <label>Card Number</label>
            <input type="text" value={card.number} onChange={setC("number")} placeholder="4242 4242 4242 4242" className="mono" required />
          </div>
          <div className="field-row">
            <div className="field">
              <label>Expiry</label>
              <input type="text" value={card.expiry} onChange={setC("expiry")} placeholder="MM/YY" className="mono" required />
            </div>
            <div className="field field-sm">
              <label>CVV</label>
              <input type="text" value={card.cvv} onChange={setC("cvv")} placeholder="123" className="mono" required />
            </div>
          </div>

          <div className="secure-badge">🔒 Secure payment — demo only, no real charges</div>

          {cart && (
            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={placing}>
              {placing ? "Processing…" : `Pay ${money(cart.totalCents)}`}
            </button>
          )}
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
