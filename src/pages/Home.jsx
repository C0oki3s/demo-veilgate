import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, money } from "../lib/api";
import ProductCard from "../components/ProductCard";

const CATEGORIES = [
  { name: "Electronics", emoji: "💻", desc: "Gadgets & devices" },
  { name: "Clothing", emoji: "👟", desc: "Style essentials" },
  { name: "Books", emoji: "📚", desc: "Knowledge & stories" },
  { name: "Home & Garden", emoji: "🏠", desc: "For your space" },
  { name: "Sports", emoji: "🏋️", desc: "Gear up & go" },
];

export default function Home() {
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    api.featuredProducts()
      .then((d) => setFeatured(Array.isArray(d?.items) ? d.items : []))
      .catch(() => setFeatured([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="home-page">
      {/* Hero */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-badge">⚡ Free shipping on orders over $50</div>
          <h1 className="hero-title">
            Everything you need,<br />
            <span className="hero-gradient">delivered fast</span>
          </h1>
          <p className="hero-sub">
            30 premium products across 5 categories. Electronics, Clothing, Books,
            Home & Garden, Sports — all in one place.
          </p>
          <div className="hero-cta">
            <Link to="/products" className="btn btn-primary btn-lg">Shop Now</Link>
            <Link to="/signup" className="btn btn-ghost btn-lg">Create Account</Link>
          </div>
          <div className="hero-stats">
            <div className="hero-stat"><strong>30+</strong><span>Products</span></div>
            <div className="hero-stat"><strong>10K+</strong><span>Happy Customers</span></div>
            <div className="hero-stat"><strong>4.7★</strong><span>Avg Rating</span></div>
            <div className="hero-stat"><strong>Free</strong><span>Returns</span></div>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-grid">
            {["📱","💻","🎧","⌚","👟","📚","🌀","🏋️"].map((e, i) => (
              <div key={i} className="hero-grid-cell" style={{ animationDelay: `${i * 0.15}s` }}>{e}</div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="section">
        <div className="section-header">
          <h2>Shop by Category</h2>
          <Link to="/products" className="section-link">View all →</Link>
        </div>
        <div className="categories-grid">
          {CATEGORIES.map((cat) => (
            <button key={cat.name} className="category-card" onClick={() => navigate(`/products?category=${encodeURIComponent(cat.name)}`)}>
              <span className="category-emoji">{cat.emoji}</span>
              <strong>{cat.name}</strong>
              <span>{cat.desc}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Featured */}
      <section className="section">
        <div className="section-header">
          <h2>Most Popular</h2>
          <Link to="/products?sort=popular" className="section-link">See all →</Link>
        </div>
        {loading ? (
          <div className="product-grid">
            {Array.from({ length: 4 }, (_, i) => <div key={i} className="product-card skeleton" />)}
          </div>
        ) : (
          <div className="product-grid">
            {featured.slice(0, 8).map((p) => (
              <ProductCard key={p.id} product={p} onCartUpdate={() => setRefresh((r) => r + 1)} />
            ))}
          </div>
        )}
      </section>

      {/* Promo banner */}
      <section className="promo-banner">
        <div className="promo-inner">
          <div>
            <h3>Free returns, always</h3>
            <p>Not happy? Return it within 30 days. No questions asked.</p>
          </div>
          <Link to="/returns" className="btn btn-outline">Learn More</Link>
        </div>
      </section>
    </div>
  );
}
