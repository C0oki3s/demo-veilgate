import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, money } from "../lib/api";

export default function Cart() {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState({});
  const navigate = useNavigate();

  async function fetchCart() {
    const d = await api.cart();
    setCart(d.cart);
  }

  useEffect(() => {
    fetchCart().catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function updateQty(productId, qty) {
    setUpdating((u) => ({ ...u, [productId]: true }));
    try {
      const d = await api.updateCartItem(productId, qty);
      setCart(d.cart);
    } catch (err) { console.error(err); }
    finally { setUpdating((u) => ({ ...u, [productId]: false })); }
  }

  async function remove(productId) {
    const d = await api.removeCartItem(productId);
    setCart(d.cart);
  }

  async function clear() {
    if (!confirm("Clear all items from cart?")) return;
    const d = await api.clearCart();
    setCart(d.cart);
  }

  if (loading) return <div className="page-loading">Loading cart…</div>;

  const items = cart?.items || [];
  const isEmpty = items.length === 0;

  return (
    <div className="cart-page">
      <h1>Shopping Cart {!isEmpty && <span className="count-badge">{items.reduce((s, i) => s + i.quantity, 0)}</span>}</h1>

      {isEmpty ? (
        <div className="empty-state">
          <span>🛒</span>
          <h3>Your cart is empty</h3>
          <p>Browse our products and add something you love.</p>
          <Link to="/products" className="btn btn-primary">Start Shopping</Link>
        </div>
      ) : (
        <div className="cart-layout">
          <div className="cart-items">
            {items.map((item) => (
              <div key={item.productId} className="cart-item">
                <div className="cart-item-emoji">{item.product?.emoji || "📦"}</div>
                <div className="cart-item-info">
                  <Link to={`/products/${item.productId}`} className="cart-item-name">{item.product?.name || item.productId}</Link>
                  <span className="cart-item-cat">{item.product?.category}</span>
                  <span className="cart-item-unit">{money(item.priceCents)} each</span>
                </div>
                <div className="cart-item-qty">
                  <button onClick={() => updateQty(item.productId, item.quantity - 1)} disabled={updating[item.productId]}>−</button>
                  <span>{item.quantity}</span>
                  <button onClick={() => updateQty(item.productId, item.quantity + 1)} disabled={updating[item.productId]}>+</button>
                </div>
                <div className="cart-item-total">{money(item.priceCents * item.quantity)}</div>
                <button className="cart-remove" onClick={() => remove(item.productId)} title="Remove">✕</button>
              </div>
            ))}
            <button className="btn btn-ghost btn-sm" onClick={clear}>Clear Cart</button>
          </div>

          <div className="cart-summary">
            <h3>Order Summary</h3>
            <div className="summary-row"><span>Subtotal</span><span>{money(cart.subtotalCents)}</span></div>
            <div className="summary-row"><span>Shipping</span><span>{cart.shippingCents === 0 ? <span className="free">Free</span> : money(cart.shippingCents)}</span></div>
            <div className="summary-row"><span>Tax (9%)</span><span>{money(cart.taxCents)}</span></div>
            <div className="summary-divider" />
            <div className="summary-row summary-total"><span>Total</span><span>{money(cart.totalCents)}</span></div>
            {cart.shippingCents > 0 && (
              <p className="free-shipping-hint">Add {money(5000 - cart.subtotalCents)} more for free shipping</p>
            )}
            <button className="btn btn-primary btn-full" onClick={() => navigate("/checkout")}>
              Proceed to Checkout →
            </button>
            <Link to="/products" className="btn btn-ghost btn-full">Continue Shopping</Link>
          </div>
        </div>
      )}
    </div>
  );
}
