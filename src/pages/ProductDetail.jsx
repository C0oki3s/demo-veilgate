import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api, money } from "../lib/api";
import { isLoggedIn } from "../lib/auth";
import ProductCard from "../components/ProductCard";

function Stars({ rating }) {
  return (
    <span className="stars-large">
      {"★★★★★".split("").map((s, i) => (
        <span key={i} style={{ opacity: i < Math.round(rating) ? 1 : 0.3 }}>★</span>
      ))}
      <span className="rating-num">{rating}</span>
    </span>
  );
}

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    api.product(id).then((d) => { setProduct(d.product); setRelated(d.related); }).catch(() => navigate("/products")).finally(() => setLoading(false));
  }, [id]);

  async function addToCart() {
    if (!isLoggedIn()) { navigate("/login"); return; }
    setAdding(true); setError("");
    try {
      await api.addToCart(id, qty);
      setAdded(true);
      setTimeout(() => setAdded(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  }

  async function buyNow() {
    if (!isLoggedIn()) { navigate("/login"); return; }
    setAdding(true);
    try {
      await api.addToCart(id, qty);
      navigate("/cart");
    } catch (err) {
      setError(err.message);
      setAdding(false);
    }
  }

  if (loading) return <div className="page-loading">Loading…</div>;
  if (!product) return null;

  return (
    <div className="product-detail-page">
      <div className="breadcrumb">
        <Link to="/">Home</Link> › <Link to="/products">Products</Link> › <Link to={`/products?category=${product.category}`}>{product.category}</Link> › {product.name}
      </div>

      <div className="product-detail-layout">
        <div className="product-detail-image">
          <div className="detail-emoji-wrap">
            <span className="detail-emoji">{product.emoji}</span>
          </div>
        </div>

        <div className="product-detail-info">
          <span className="product-category-badge">{product.category}</span>
          <h1>{product.name}</h1>
          <div className="detail-rating">
            <Stars rating={product.rating} />
            <span className="detail-reviews">{product.reviewCount.toLocaleString()} reviews</span>
          </div>

          <div className="detail-price">{money(product.priceCents)}</div>
          {product.priceCents >= 5000 ? (
            <div className="shipping-badge">✓ Free shipping</div>
          ) : (
            <div className="shipping-badge muted">+ $5.99 shipping (free over $50)</div>
          )}

          <p className="detail-description">{product.description}</p>

          <div className="detail-tags">
            {product.tags.map((tag) => <span key={tag} className="tag">#{tag}</span>)}
          </div>

          <div className="detail-stock">
            {product.stock > 10 ? <span className="in-stock">✓ In Stock ({product.stock} available)</span>
              : product.stock > 0 ? <span className="low-stock">⚠ Only {product.stock} left!</span>
              : <span className="out-stock">✗ Out of Stock</span>}
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <div className="detail-actions">
            <div className="qty-selector">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
              <span>{qty}</span>
              <button onClick={() => setQty((q) => Math.min(99, q + 1))}>+</button>
            </div>
            <button className={`btn btn-lg ${added ? "btn-success" : "btn-primary"}`} onClick={addToCart} disabled={adding || product.stock === 0}>
              {added ? "✓ Added to Cart!" : adding ? "Adding…" : "Add to Cart"}
            </button>
            <button className="btn btn-outline btn-lg" onClick={buyNow} disabled={adding || product.stock === 0}>
              Buy Now
            </button>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="section">
          <div className="section-header">
            <h2>Related Products</h2>
          </div>
          <div className="product-grid product-grid-4">
            {related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}
