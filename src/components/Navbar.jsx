import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { getUser, clearAuth, isLoggedIn, isAdmin } from "../lib/auth";
import { api } from "../lib/api";

export default function Navbar() {
  const [cartCount, setCartCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUser();
  const loggedIn = isLoggedIn();

  useEffect(() => {
    if (loggedIn) {
      api.cart().then((d) => {
        const count = d.cart.items.reduce((s, i) => s + i.quantity, 0);
        setCartCount(count);
      }).catch(() => {});
    } else {
      setCartCount(0);
    }
  }, [location.pathname, loggedIn]);

  function logout() {
    clearAuth();
    navigate("/login");
  }

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          <span className="brand-icon">⚡</span>
          <span className="brand-name">ShopStorm</span>
        </Link>

        <div className="navbar-links">
          <Link to="/products" className="nav-link">Products</Link>
          <Link to="/products?category=Electronics" className="nav-link">Electronics</Link>
          <Link to="/products?category=Clothing" className="nav-link">Clothing</Link>
          <Link to="/support" className="nav-link">Support</Link>
        </div>

        <div className="navbar-actions">
          {loggedIn ? (
            <>
              <Link to="/cart" className="nav-cart-btn">
                <span>🛒</span>
                {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
              </Link>
              <div className="nav-user-menu">
                <button className="nav-user-btn" onClick={() => setMenuOpen((v) => !v)}>
                  <span className="user-avatar">{user?.firstName?.[0] || user?.username?.[0] || "U"}</span>
                  <span className="user-name">{user?.firstName || user?.username}</span>
                  <span>▾</span>
                </button>
                {menuOpen && (
                  <div className="user-dropdown" onClick={() => setMenuOpen(false)}>
                    <Link to="/profile" className="dropdown-item">Profile</Link>
                    <Link to="/orders" className="dropdown-item">My Orders</Link>
                    <Link to="/returns" className="dropdown-item">Returns</Link>
                    {isAdmin() && <Link to="/admin" className="dropdown-item dropdown-item-accent">Traffic Lab</Link>}
                    {isAdmin() && <Link to="/admin/slow-traffic" className="dropdown-item dropdown-item-accent">Slow Traffic</Link>}
                    <button onClick={logout} className="dropdown-item dropdown-item-danger">Sign Out</button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">Sign In</Link>
              <Link to="/signup" className="btn btn-primary btn-sm">Get Started</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
