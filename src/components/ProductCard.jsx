import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, money } from "../lib/api";
import { isLoggedIn } from "../lib/auth";

function Stars({ rating }) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  return (
    <span className="stars" title={`${rating}/5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < full ? "star filled" : i === full && half ? "star half" : "star"}>★</span>
      ))}
    </span>
  );
}

export default function ProductCard({ product, onCartUpdate }) {
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const navigate = useNavigate();

  async function handleAdd(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoggedIn()) { navigate("/login"); return; }
    setAdding(true);
    try {
      await api.addToCart(product.id, 1);
      setAdded(true);
      onCartUpdate?.();
      setTimeout(() => setAdded(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="product-card" onClick={() => navigate(`/products/${product.id}`)}>
      <div className="product-emoji-wrap">
        <span className="product-emoji">{product.emoji}</span>
        <span className="product-category-badge">{product.category}</span>
      </div>
      <div className="product-info">
        <h3 className="product-name">{product.name}</h3>
        <p className="product-desc">{product.description.slice(0, 80)}…</p>
        <div className="product-meta">
          <Stars rating={product.rating} />
          <span className="product-reviews">({product.reviewCount.toLocaleString()})</span>
        </div>
        <div className="product-footer">
          <span className="product-price">{money(product.priceCents)}</span>
          <button
            className={`btn btn-sm ${added ? "btn-success" : "btn-primary"}`}
            onClick={handleAdd}
            disabled={adding || added}
          >
            {added ? "✓ Added" : adding ? "…" : "Add to Cart"}
          </button>
        </div>
      </div>
    </div>
  );
}
