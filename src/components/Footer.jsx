import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <span className="brand-icon">⚡</span>
          <span className="brand-name">ShopStorm</span>
          <p className="footer-tagline">The fastest way to shop everything.</p>
        </div>
        <div className="footer-links">
          <div className="footer-col">
            <h4>Shop</h4>
            <Link to="/products">All Products</Link>
            <Link to="/products?category=Electronics">Electronics</Link>
            <Link to="/products?category=Clothing">Clothing</Link>
            <Link to="/products?category=Books">Books</Link>
            <Link to="/products?category=Sports">Sports</Link>
          </div>
          <div className="footer-col">
            <h4>Account</h4>
            <Link to="/orders">My Orders</Link>
            <Link to="/returns">Returns</Link>
            <Link to="/profile">Profile</Link>
          </div>
          <div className="footer-col">
            <h4>Help</h4>
            <Link to="/support">Support Center</Link>
            <Link to="/support">Track Order</Link>
            <Link to="/support">Shipping Info</Link>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p>© 2025 ShopStorm. All rights reserved. · Prices and availability are simulated.</p>
      </div>
    </footer>
  );
}
