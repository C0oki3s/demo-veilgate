import { useEffect, useMemo, useState } from "react";
import { API_BASE, api, connectLive } from "./lib/api";

const VIEWS = {
  STORE: "store",
  LAB: "lab",
  LOGS: "logs",
  CONFIG: "config",
};

function money(cents) {
  return `$${(Number(cents || 0) / 100).toFixed(2)}`;
}

function logKey(item, index) {
  return `${item.ts || "time"}-${item.source || "src"}-${item.path || "path"}-${index}`;
}

function ProductCard({ product }) {
  return (
    <article className="product-card">
      <p className="product-category">{product.category}</p>
      <h3>{product.name}</h3>
      <p className="muted">{product.description}</p>
      <p className="price">{money(product.price_cents)}</p>
    </article>
  );
}

function LogRow({ item }) {
  const status = item.status || "-";
  const score = item.score ? ` score=${item.score}` : "";

  return (
    <div className="log-row">
      <div className="log-meta">
        <span className="pill">{item.source || "app"}</span>
        <span className="pill">{item.method || "GET"}</span>
        <strong>{item.path || "/"}</strong>
      </div>
      <p className="muted">
        status={status} action={item.action || "observed"}
        {score}
      </p>
      {item.note ? <p className="muted">{item.note}</p> : null}
    </div>
  );
}

function App() {
  const [view, setView] = useState(VIEWS.STORE);
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState(null);
  const [profile, setProfile] = useState("normal");
  const [probeLoading, setProbeLoading] = useState(false);
  const [sourceFilter, setSourceFilter] = useState("");
  const [logs, setLogs] = useState([]);
  const [configYaml, setConfigYaml] = useState("Loading...");
  const [statusMsg, setStatusMsg] = useState("");
  const [error, setError] = useState("");

  const viewTitle = useMemo(() => {
    if (view === VIEWS.STORE) return "Products";
    if (view === VIEWS.LAB) return "VeilGate Lab";
    if (view === VIEWS.LOGS) return "Live Logs";
    return "VeilGate Config";
  }, [view]);

  async function loadProducts(nextQuery = query) {
    try {
      const rows = await api.products(nextQuery.trim());
      setProducts(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load products");
    }
  }

  async function loadStats() {
    try {
      const data = await api.stats();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load stats");
    }
  }

  async function loadConfig() {
    try {
      const data = await api.veilgateConfig();
      setConfigYaml(data.yaml || "No config returned");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load config");
    }
  }

  async function refreshLogSnapshot(filter = sourceFilter) {
    try {
      const data = await api.veilgateLogs(filter);
      setLogs(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load logs");
    }
  }

  async function runProbe() {
    setProbeLoading(true);
    setError("");
    setStatusMsg("");
    try {
      const data = await api.probe(profile);
      const count = Array.isArray(data.requests) ? data.requests.length : 0;
      setStatusMsg(`Probe "${data.profile}" sent ${count} requests through VeilGate`);
      await loadStats();
      await refreshLogSnapshot();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run probe");
    } finally {
      setProbeLoading(false);
    }
  }

  useEffect(() => {
    setError("");
    Promise.all([loadProducts(""), loadStats(), loadConfig(), refreshLogSnapshot("")]).catch(() => {});

    const stream = connectLive((event) => {
      setLogs((prev) => {
        const merged = [event, ...prev];
        return merged.slice(0, 120);
      });
    }, setStatusMsg);

    const interval = setInterval(() => {
      loadStats().catch(() => {});
    }, 15000);

    return () => {
      clearInterval(interval);
      stream.close();
    };
  }, []);

  const filteredLiveLogs = useMemo(() => {
    if (!sourceFilter) return logs;
    return logs.filter((item) => item.source === sourceFilter);
  }, [logs, sourceFilter]);

  return (
    <div className="page">
      <main className="shell">
        <header className="hero">
          <div>
            <p className="eyebrow">VeilGate React Demo</p>
            <h1>Demo Store + Live Shield Lab</h1>
            <p className="muted">
              React frontend separated from API backend, with VeilGate in front of traffic.
            </p>
          </div>
          <p className="muted tiny">
            API: <code>{API_BASE}</code>
          </p>
          <div className="stats-strip">
            <span>Products: {stats?.totalProducts ?? "-"}</span>
            <span>Views: {stats?.totalPageViews ?? "-"}</span>
            <span>Capture: {stats?.captureEnabled ? "on" : "off"}</span>
          </div>
          <nav className="tabs">
            <button className={view === VIEWS.STORE ? "active" : ""} onClick={() => setView(VIEWS.STORE)}>
              Store
            </button>
            <button className={view === VIEWS.LAB ? "active" : ""} onClick={() => setView(VIEWS.LAB)}>
              Lab
            </button>
            <button className={view === VIEWS.LOGS ? "active" : ""} onClick={() => setView(VIEWS.LOGS)}>
              Logs
            </button>
            <button className={view === VIEWS.CONFIG ? "active" : ""} onClick={() => setView(VIEWS.CONFIG)}>
              Config
            </button>
          </nav>
        </header>

        {error ? <p className="notice error">{error}</p> : null}
        {statusMsg ? <p className="notice">{statusMsg}</p> : null}

        <section className="panel">
          <h2>{viewTitle}</h2>

          {view === VIEWS.STORE ? (
            <>
              <p className="muted">Seed products from PostgreSQL.</p>
              <div className="toolbar">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") loadProducts();
                  }}
                />
                <button onClick={() => loadProducts()}>Search</button>
              </div>
              <div className="product-grid">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </>
          ) : null}

          {view === VIEWS.LAB ? (
            <>
              <p className="muted">Generate normal or suspicious probe traffic through VeilGate.</p>
              <div className="toolbar">
                <select value={profile} onChange={(event) => setProfile(event.target.value)}>
                  <option value="normal">Normal Traffic</option>
                  <option value="suspicious">Suspicious Traffic</option>
                </select>
                <button onClick={runProbe} disabled={probeLoading}>
                  {probeLoading ? "Running..." : "Run Probe"}
                </button>
              </div>
            </>
          ) : null}

          {view === VIEWS.LOGS ? (
            <>
              <p className="muted">Real-time event stream plus log snapshot.</p>
              <div className="toolbar">
                <select
                  value={sourceFilter}
                  onChange={async (event) => {
                    const next = event.target.value;
                    setSourceFilter(next);
                    await refreshLogSnapshot(next);
                  }}
                >
                  <option value="">All Sources</option>
                  <option value="veilgate">VeilGate</option>
                  <option value="app">App</option>
                </select>
                <button onClick={() => refreshLogSnapshot()}>Refresh Snapshot</button>
                <button className="secondary" onClick={() => setLogs([])}>
                  Clear
                </button>
              </div>
              <div className="log-view">
                {filteredLiveLogs.map((item, index) => (
                  <LogRow key={logKey(item, index)} item={item} />
                ))}
              </div>
            </>
          ) : null}

          {view === VIEWS.CONFIG ? (
            <>
              <p className="muted">Redacted VeilGate YAML mounted from the backend host.</p>
              <div className="toolbar">
                <button onClick={loadConfig}>Refresh Config</button>
              </div>
              <pre>{configYaml}</pre>
            </>
          ) : null}
        </section>
      </main>
    </div>
  );
}

export default App;
