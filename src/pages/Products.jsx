import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import ProductCard from "../components/ProductCard";

const CATEGORIES = ["Electronics", "Clothing", "Books", "Home & Garden", "Sports"];
const SORTS = [
  { value: "", label: "Default" },
  { value: "popular", label: "Most Popular" },
  { value: "rating", label: "Top Rated" },
  { value: "price_asc", label: "Price: Low → High" },
  { value: "price_desc", label: "Price: High → Low" },
];

function normalizeProductsData(d) {
  const items = Array.isArray(d?.items) ? d.items : [];
  const total = Number.isFinite(Number(d?.total)) ? Number(d.total) : items.length;
  const pages = Number.isFinite(Number(d?.pages)) ? Math.max(1, Number(d.pages)) : 1;
  return { ...d, items, total, pages };
}

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState({ items: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);

  const q = searchParams.get("q") || "";
  const category = searchParams.get("category") || "";
  const sort = searchParams.get("sort") || "";
  const page = Number(searchParams.get("page") || 1);

  const [search, setSearch] = useState(q);
  const productData = normalizeProductsData(data);

  function setParam(key, value) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value); else next.delete(key);
    if (key !== "page") next.delete("page");
    setSearchParams(next);
  }

  useEffect(() => {
    setLoading(true);
    api.products({ q, category, sort, page, limit: 12 })
      .then((d) => setData(normalizeProductsData(d)))
      .catch(() => setData(normalizeProductsData()))
      .finally(() => setLoading(false));
  }, [q, category, sort, page, refresh]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setParam("q", search), 400);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <div className="products-page">
      <div className="products-header">
        <h1>Products <span className="count-badge">{productData.total}</span></h1>
        <div className="products-controls">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text" placeholder="Search products…"
              value={search} onChange={(e) => setSearch(e.target.value)}
            />
            {search && <button className="search-clear" onClick={() => { setSearch(""); setParam("q", ""); }}>✕</button>}
          </div>
          <select value={sort} onChange={(e) => setParam("sort", e.target.value)} className="select-input">
            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>

      <div className="products-layout">
        {/* Sidebar */}
        <aside className="products-sidebar">
          <h3>Categories</h3>
          <button className={`filter-btn ${!category ? "active" : ""}`} onClick={() => setParam("category", "")}>
            All Products <span className="filter-count">{productData.total}</span>
          </button>
          {CATEGORIES.map((cat) => (
            <button key={cat} className={`filter-btn ${category === cat ? "active" : ""}`} onClick={() => setParam("category", cat)}>
              {cat}
            </button>
          ))}
        </aside>

        {/* Grid */}
        <div className="products-main">
          {loading ? (
            <div className="product-grid">
              {Array.from({ length: 12 }, (_, i) => <div key={i} className="product-card skeleton" />)}
            </div>
          ) : productData.items.length === 0 ? (
            <div className="empty-state">
              <span>🔍</span>
              <p>No products found. Try a different search or category.</p>
            </div>
          ) : (
            <div className="product-grid">
              {productData.items.map((p) => (
                <ProductCard key={p.id} product={p} onCartUpdate={() => setRefresh((r) => r + 1)} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {productData.pages > 1 && (
            <div className="pagination">
              <button disabled={page <= 1} onClick={() => setParam("page", page - 1)} className="page-btn">← Prev</button>
              <span className="page-info">Page {page} of {productData.pages}</span>
              <button disabled={page >= productData.pages} onClick={() => setParam("page", page + 1)} className="page-btn">Next →</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
