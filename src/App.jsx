import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  FiActivity,
  FiBox,
  FiCpu,
  FiFileText,
  FiFilter,
  FiLayers,
  FiPlay,
  FiRefreshCw,
  FiSearch,
  FiShield,
  FiShoppingBag,
  FiTerminal,
  FiTrash2,
  FiZap,
} from "react-icons/fi";
import { API_BASE, api, connectLive } from "./lib/api";

const VIEWS = {
  STORE: "store",
  LAB: "lab",
  LOGS: "logs",
  CONFIG: "config",
};

const icons = {
  store: FiShoppingBag,
  lab: FiCpu,
  logs: FiFileText,
  config: FiShield,
  search: FiSearch,
  play: FiPlay,
  refresh: FiRefreshCw,
  clear: FiTrash2,
  terminal: FiTerminal,
  pulse: FiActivity,
  filter: FiFilter,
  layers: FiLayers,
  perf: FiZap,
  empty: FiBox,
};

function Icon({ name }) {
  const IconComponent = icons[name];
  return <IconComponent className="icon" aria-hidden="true" />;
}

function money(cents) {
  return `$${(Number(cents || 0) / 100).toFixed(2)}`;
}

function logKey(item, index) {
  return `${item.ts || "time"}-${item.source || "src"}-${item.path || "path"}-${index}`;
}

function ProductCard({ product }) {
  return (
    <article className="product-card">
      <div className="card-topline">
        <span className="glyph">
          <Icon name="store" />
        </span>
        <p className="product-category">{product.category}</p>
      </div>
      <h3>{product.name}</h3>
      <p className="muted">{product.description}</p>
      <p className="price">{money(product.price_cents)}</p>
    </article>
  );
}

function ProductSkeleton() {
  return (
    <article className="product-card skeleton-card" aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
    </article>
  );
}

function EmptyState({ title, detail }) {
  return (
    <div className="empty-state">
      <span className="glyph">
        <Icon name="empty" />
      </span>
      <h3>{title}</h3>
      <p className="muted">{detail}</p>
    </div>
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
  const [category, setCategory] = useState("");
  const [productsLoading, setProductsLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(true);
  const [configLoading, setConfigLoading] = useState(true);
  const deferredQuery = useDeferredValue(query);

  const viewTitle = useMemo(() => {
    if (view === VIEWS.STORE) return "Protected Catalog";
    if (view === VIEWS.LAB) return "VeilGate Lab";
    if (view === VIEWS.LOGS) return "Security Stream";
    return "Policy Snapshot";
  }, [view]);

  async function loadProducts(nextQuery = query) {
    setProductsLoading(true);
    try {
      const rows = await api.products(nextQuery.trim());
      setProducts(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load products");
    } finally {
      setProductsLoading(false);
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
    setConfigLoading(true);
    try {
      const data = await api.veilgateConfig();
      setConfigYaml(data.yaml || "No config returned");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load config");
    } finally {
      setConfigLoading(false);
    }
  }

  async function refreshLogSnapshot(filter = sourceFilter) {
    setLogsLoading(true);
    try {
      const data = await api.veilgateLogs(filter);
      setLogs(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load logs");
    } finally {
      setLogsLoading(false);
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

  const categories = useMemo(() => {
    return [...new Set(products.map((product) => product.category).filter(Boolean))].sort();
  }, [products]);

  const visibleProducts = useMemo(() => {
    const term = deferredQuery.trim().toLowerCase();
    return products.filter((product) => {
      const inCategory = category ? product.category === category : true;
      if (!term) return inCategory;
      const searchable = [product.name, product.description, product.category].join(" ").toLowerCase();
      return inCategory && searchable.includes(term);
    });
  }, [category, deferredQuery, products]);

  const navItems = [
    [VIEWS.STORE, "Catalog", "store"],
    [VIEWS.LAB, "Lab", "lab"],
    [VIEWS.LOGS, "Stream", "logs"],
    [VIEWS.CONFIG, "Policy", "config"],
  ];

  const insightItems = [
    ["Query refine", `${visibleProducts.length}/${products.length || 0}`, "search"],
    ["Signals", String(filteredLiveLogs.length), "layers"],
    ["Motion safe", "on", "perf"],
  ];

  function changeView(nextView) {
    if (nextView === view) return;
    const update = () => setView(nextView);
    if (document.startViewTransition) {
      document.startViewTransition(update);
      return;
    }
    update();
  }

  return (
    <div className="page">
      <main className="shell">
        <header className="hero">
          <div className="hero-copy">
            <p className="eyebrow">VeilGate Demo Workspace</p>
            <h1>Protected Commerce Traffic, Explained Live</h1>
            <p className="muted">
              Browse a realistic catalog, generate clean or suspicious traffic, and watch VeilGate score every request.
            </p>
          </div>
          <div className="endpoint">
            <Icon name="terminal" />
            <span>Protected edge</span>
            <code>{API_BASE}</code>
          </div>
          <div className="stats-strip">
            <span>Catalog items <strong>{stats?.totalProducts ?? "-"}</strong></span>
            <span>Observed views <strong>{stats?.totalPageViews ?? "-"}</strong></span>
            <span>Capture <strong>{stats?.captureEnabled ? "on" : "off"}</strong></span>
          </div>
          <div className="insight-strip">
            {insightItems.map(([label, value, icon]) => (
              <div className="insight-card" key={label}>
                <Icon name={icon} />
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          <nav className="tabs">
            {navItems.map(([key, label, icon]) => (
              <button key={key} className={view === key ? "active" : ""} onClick={() => changeView(key)}>
                <Icon name={icon} />
                {label}
              </button>
            ))}
          </nav>
        </header>

        {error ? <p className="notice error" role="alert">{error}</p> : null}
        {statusMsg ? <p className="notice" aria-live="polite">{statusMsg}</p> : null}

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Control Surface</p>
              <h2>{viewTitle}</h2>
            </div>
            <span className="status-chip">
              <Icon name="pulse" />
              Observe mode
            </span>
          </div>

          {view === VIEWS.STORE ? (
            <>
              <p className="muted">Search the protected catalog and see how normal browsing traffic appears at the edge.</p>
              <div className="search-console">
                <div className="search-main">
                  <Icon name="search" />
                  <input
                    type="search"
                    placeholder="Search items, categories, descriptions..."
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") loadProducts();
                    }}
                  />
                  <span className="result-count">{visibleProducts.length} results</span>
                </div>
                <div className="filter-row">
                  <button className={category === "" ? "chip active" : "chip"} onClick={() => setCategory("")}>
                    <Icon name="filter" />
                    All
                  </button>
                  {categories.map((item) => (
                    <button
                      className={category === item ? "chip active" : "chip"}
                      key={item}
                      onClick={() => setCategory(item)}
                    >
                      {item}
                    </button>
                  ))}
                  <button className="secondary sync-button" onClick={() => loadProducts()} disabled={productsLoading}>
                    <Icon name="refresh" />
                    {productsLoading ? "Syncing" : "Sync"}
                  </button>
                </div>
              </div>
              <div className="product-grid">
                {productsLoading
                  ? Array.from({ length: 6 }, (_, index) => <ProductSkeleton key={index} />)
                  : visibleProducts.map((product) => <ProductCard key={product.id} product={product} />)}
              </div>
              {!productsLoading && visibleProducts.length === 0 ? (
                <EmptyState title="No matching items" detail="Refine the query or clear the active filter." />
              ) : null}
            </>
          ) : null}

          {view === VIEWS.LAB ? (
            <>
              <p className="muted">Generate safe and suspicious request patterns to compare VeilGate scoring behavior.</p>
              <div className="toolbar">
                <select value={profile} onChange={(event) => setProfile(event.target.value)}>
                  <option value="normal">Normal Traffic</option>
                  <option value="suspicious">Suspicious Traffic</option>
                </select>
                <button onClick={runProbe} disabled={probeLoading}>
                  <Icon name="play" />
                  {probeLoading ? "Running..." : "Run Probe"}
                </button>
              </div>
            </>
          ) : null}

          {view === VIEWS.LOGS ? (
            <>
              <p className="muted">Live request decisions, scores, and signals from the protected edge.</p>
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
                <button onClick={() => refreshLogSnapshot()} disabled={logsLoading}>
                  <Icon name="refresh" />
                  {logsLoading ? "Refreshing" : "Refresh"}
                </button>
                <button className="secondary" onClick={() => setLogs([])}>
                  <Icon name="clear" />
                  Clear
                </button>
              </div>
              <div className="log-view">
                {filteredLiveLogs.map((item, index) => (
                  <LogRow key={logKey(item, index)} item={item} />
                ))}
              </div>
              {!logsLoading && filteredLiveLogs.length === 0 ? (
                <EmptyState title="No security events" detail="Run a probe or refresh the stream snapshot." />
              ) : null}
            </>
          ) : null}

          {view === VIEWS.CONFIG ? (
            <>
              <p className="muted">A redacted policy snapshot showing the active protection posture without exposing secrets.</p>
              <div className="toolbar">
                <button onClick={loadConfig} disabled={configLoading}>
                  <Icon name="refresh" />
                  {configLoading ? "Refreshing" : "Refresh Policy"}
                </button>
              </div>
              <pre className={configLoading ? "loading-text" : ""}>{configYaml}</pre>
            </>
          ) : null}
        </section>
      </main>
    </div>
  );
}

export default App;
