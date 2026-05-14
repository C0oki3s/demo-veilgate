import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  FiActivity,
  FiBox,
  FiCreditCard,
  FiCpu,
  FiFileText,
  FiFilter,
  FiLayers,
  FiLogIn,
  FiPackage,
  FiPlay,
  FiRefreshCw,
  FiSearch,
  FiShield,
  FiShoppingBag,
  FiShoppingCart,
  FiTerminal,
  FiTrash2,
  FiUserPlus,
  FiZap,
} from "react-icons/fi";
import { Badge } from "./components/ui/badge";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "./components/ui/tabs";
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
  signup: FiUserPlus,
  login: FiLogIn,
  cart: FiShoppingCart,
  checkout: FiCreditCard,
  package: FiPackage,
};

function Icon({ name }) {
  const IconComponent = icons[name];
  return <IconComponent className="icon" aria-hidden="true" />;
}

function money(cents) {
  return `$${(Number(cents || 0) / 100).toFixed(2)}`;
}

function productRating(product) {
  return (4.4 + ((Number(product.id || 1) % 6) * 0.08)).toFixed(1);
}

function logKey(item, index) {
  return `${item.ts || "time"}-${item.source || "src"}-${item.path || "path"}-${index}`;
}

function ProductCard({ product, onAddToCart }) {
  return (
    <Card className="product-card">
      <div className="card-topline">
        <span className="glyph">
          <Icon name="store" />
        </span>
        <Badge variant="outline">{product.category}</Badge>
      </div>
      <CardTitle>{product.name}</CardTitle>
      <CardDescription>{product.description}</CardDescription>
      <div className="product-meta">
        <span>{productRating(product)} rating</span>
        <span>Ships today</span>
      </div>
      <div className="product-actions">
        <p className="price">{money(product.price_cents)}</p>
        <Button size="icon" onClick={() => onAddToCart(product)} aria-label={`Add ${product.name} to cart`}>
          <Icon name="cart" />
        </Button>
      </div>
    </Card>
  );
}

function ProductSkeleton() {
  return (
    <Card className="product-card skeleton-card" aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
    </Card>
  );
}

function EmptyState({ title, detail }) {
  return (
    <Card className="empty-state">
      <span className="glyph">
        <Icon name="empty" />
      </span>
      <CardTitle>{title}</CardTitle>
      <CardDescription>{detail}</CardDescription>
    </Card>
  );
}

function LogRow({ item }) {
  const status = item.status || "-";
  const score = Number(item.score || 0);

  return (
    <div className="log-row">
      <div className="log-meta">
        <Badge variant="muted">{item.source || "app"}</Badge>
        <Badge variant="outline">{item.method || "GET"}</Badge>
        <Badge variant={score >= 70 ? "default" : "outline"}>score {score}</Badge>
        <strong>{item.path || "/"}</strong>
      </div>
      <p className="muted">
        status={status} action={item.action || "observed"}
      </p>
      {item.note ? <p className="muted">{item.note}</p> : null}
    </div>
  );
}

function App() {
  const [view, setView] = useState(VIEWS.STORE);
  const [labTab, setLabTab] = useState("traffic");
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
  const [offers, setOffers] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [shopper, setShopper] = useState({ username: "demo-shopper", password: "demo-passphrase-123" });
  const [cart, setCart] = useState([]);
  const [commerceLoading, setCommerceLoading] = useState(false);
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

  async function loadCommerce() {
    try {
      const [offerData, recommendationData] = await Promise.all([api.offers(), api.recommendations()])
      setOffers(Array.isArray(offerData.items) ? offerData.items : [])
      setRecommendations(Array.isArray(recommendationData.items) ? recommendationData.items : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load commerce demo")
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

  async function runCommerceAction(kind, product = null) {
    setCommerceLoading(true)
    setError("")
    setStatusMsg("")
    try {
      if (kind === "signup") {
        await api.signup(shopper.username, shopper.password)
        setStatusMsg(`Created demo shopper "${shopper.username}"`)
      }
      if (kind === "login") {
        await api.login(shopper.username, shopper.password)
        setStatusMsg(`Started shopper session for "${shopper.username}"`)
      }
      if (kind === "cart") {
        const target = product || visibleProducts[0] || products[0]
        if (!target) throw new Error("No catalog item available")
        const item = await api.addToCart(target.id, 1)
        setCart((prev) => [item, ...prev].slice(0, 6))
        setStatusMsg(`Added ${target.name} to the demo cart`)
      }
      if (kind === "checkout") {
        const total = cart.reduce((sum, item) => sum + Number(item.subtotal_cents || 0), 0) || 4999
        const order = await api.checkout(shopper.username, total)
        setStatusMsg(`Checkout accepted: ${order.orderId}`)
      }
      await loadStats()
      await refreshLogSnapshot()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Commerce action failed")
    } finally {
      setCommerceLoading(false)
    }
  }

  useEffect(() => {
    setError("");
    Promise.all([loadProducts(""), loadStats(), loadConfig(), loadCommerce(), refreshLogSnapshot("")]).catch(() => {});

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
    ["Cart events", String(cart.length), "cart"],
  ];

  const cartTotal = cart.reduce((sum, item) => sum + Number(item.subtotal_cents || 0), 0)
  const latestStream = filteredLiveLogs.slice(0, 8)

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
          <div className="commerce-hero-grid">
            <Card className="commerce-hero-card">
              <CardHeader>
                <Badge variant="muted">Today&apos;s edit</Badge>
                <CardTitle>Signal-safe shopping paths</CardTitle>
                <CardDescription>Normal traffic now covers browse, signup, login, cart, recommendations, and checkout.</CardDescription>
              </CardHeader>
            </Card>
            <Card className="commerce-hero-card">
              <CardHeader>
                <Badge variant="muted">Edge observability</Badge>
                <CardTitle>Every action becomes telemetry</CardTitle>
                <CardDescription>Run commerce actions, then inspect request decisions and scores in the stream.</CardDescription>
              </CardHeader>
            </Card>
          </div>
          <div className="stats-strip">
            <Card><span>Catalog items <strong>{stats?.totalProducts ?? "-"}</strong></span></Card>
            <Card><span>Observed views <strong>{stats?.totalPageViews ?? "-"}</strong></span></Card>
            <Card><span>Capture <strong>{stats?.captureEnabled ? "on" : "off"}</strong></span></Card>
          </div>
          <div className="insight-strip">
            {insightItems.map(([label, value, icon]) => (
              <Card className="insight-card" key={label}>
                <Icon name={icon} />
                <span>{label}</span>
                <strong>{value}</strong>
              </Card>
            ))}
          </div>
          <Tabs>
            <TabsList>
              {navItems.map(([key, label, icon]) => (
                <TabsTrigger key={key} active={view === key} onClick={() => changeView(key)}>
                  <Icon name={icon} />
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </header>

        {error ? <p className="notice error" role="alert">{error}</p> : null}
        {statusMsg ? <p className="notice" aria-live="polite">{statusMsg}</p> : null}

        <Card className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Control Surface</p>
              <h2>{viewTitle}</h2>
            </div>
            <Badge variant="outline" className="status-chip">
              <Icon name="pulse" />
              Observe mode
            </Badge>
          </div>

          {view === VIEWS.STORE ? (
            <>
              <p className="muted">Search the protected catalog and see how normal browsing traffic appears at the edge.</p>
              <div className="catalog-full-split">
                <section className="catalog-flow-pane">
                  <div className="search-console">
                    <div className="search-main">
                      <Icon name="search" />
                      <Input
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
                      <Button variant="chip" className={category === "" ? "is-active" : ""} onClick={() => setCategory("")}>
                        <Icon name="filter" />
                        All
                      </Button>
                      {categories.map((item) => (
                        <Button
                          variant="chip"
                          className={category === item ? "is-active" : ""}
                          key={item}
                          onClick={() => setCategory(item)}
                        >
                          {item}
                        </Button>
                      ))}
                      <Button variant="secondary" className="sync-button" onClick={() => loadProducts()} disabled={productsLoading}>
                        <Icon name="refresh" />
                        {productsLoading ? "Syncing" : "Sync"}
                      </Button>
                    </div>
                  </div>
                  <div className="product-grid compact-grid">
                    {productsLoading
                      ? Array.from({ length: 4 }, (_, index) => <ProductSkeleton key={index} />)
                      : visibleProducts.map((product) => (
                          <ProductCard key={product.id} product={product} onAddToCart={() => runCommerceAction("cart", product)} />
                        ))}
                  </div>
                  {!productsLoading && visibleProducts.length === 0 ? (
                    <EmptyState title="No matching items" detail="Refine the query or clear the active filter." />
                  ) : null}

                  <div className="flow-stack">
                    <Card className="commerce-panel account-panel">
                      <CardHeader className="mini-heading">
                        <Icon name="signup" />
                        <div>
                          <CardTitle>Shopper Flow</CardTitle>
                          <CardDescription>Run normal commerce actions while the edge feed stays visible.</CardDescription>
                        </div>
                      </CardHeader>
                      <div className="account-grid">
                        <Input
                          aria-label="Demo username"
                          value={shopper.username}
                          onChange={(event) => setShopper((prev) => ({ ...prev, username: event.target.value }))}
                        />
                        <Input
                          aria-label="Demo password"
                          type="password"
                          value={shopper.password}
                          onChange={(event) => setShopper((prev) => ({ ...prev, password: event.target.value }))}
                        />
                      </div>
                      <div className="commerce-actions">
                        <Button onClick={() => runCommerceAction("signup")} disabled={commerceLoading}>
                          <Icon name="signup" />
                          Signup
                        </Button>
                        <Button onClick={() => runCommerceAction("login")} disabled={commerceLoading}>
                          <Icon name="login" />
                          Login
                        </Button>
                        <Button onClick={() => runCommerceAction("cart")} disabled={commerceLoading}>
                          <Icon name="cart" />
                          Add Item
                        </Button>
                        <Button onClick={() => runCommerceAction("checkout")} disabled={commerceLoading}>
                          <Icon name="checkout" />
                          Checkout
                        </Button>
                      </div>
                    </Card>

                    <Card className="cart-mini-panel">
                      <CardHeader className="mini-heading">
                        <Icon name="cart" />
                        <div>
                          <CardTitle>Cart Snapshot</CardTitle>
                          <CardDescription>{cart.length ? `${cart.length} event(s), ${money(cartTotal)}` : "No cart events yet."}</CardDescription>
                        </div>
                      </CardHeader>
                    </Card>
                  </div>
                </section>

                <section className="catalog-log-pane">
                  <Card className="stream-inspector-card catalog-inspector-card">
                    <CardHeader className="stream-header">
                      <div>
                        <Badge variant="outline">Live logs</Badge>
                        <CardTitle>Catalog flow telemetry</CardTitle>
                        <CardDescription>Browse, signup, login, cart, and checkout events stream here in real time.</CardDescription>
                      </div>
                      <Badge variant="muted">{filteredLiveLogs.length} events</Badge>
                    </CardHeader>
                    <div className="catalog-log-controls">
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
                      <Button variant="secondary" onClick={() => refreshLogSnapshot()} disabled={logsLoading}>
                        <Icon name="refresh" />
                        {logsLoading ? "Refreshing" : "Refresh"}
                      </Button>
                    </div>
                    <div className="stream-feed">
                      {filteredLiveLogs.map((item, index) => (
                        <LogRow key={logKey(item, index)} item={item} />
                      ))}
                      {!logsLoading && filteredLiveLogs.length === 0 ? (
                        <EmptyState title="No stream events yet" detail="Search, add to cart, or run a shopper flow action." />
                      ) : null}
                    </div>
                  </Card>
                </section>
              </div>
            </>
          ) : null}

          {view === VIEWS.LAB ? (
            <>
              <p className="muted">Generate safe and suspicious request patterns to compare VeilGate scoring behavior.</p>
              <div className="lab-full-split">
                <section className="lab-left-pane">
                  <Card className="lab-command-card">
                    <CardHeader>
                      <Badge variant="muted">Probe runner</Badge>
                      <CardTitle>Generate edge traffic</CardTitle>
                      <CardDescription>Run normal shopper paths or suspicious request patterns through VeilGate.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <select value={profile} onChange={(event) => setProfile(event.target.value)}>
                        <option value="normal">Normal Traffic</option>
                        <option value="suspicious">Suspicious Traffic</option>
                      </select>
                      <Button onClick={runProbe} disabled={probeLoading}>
                        <Icon name="play" />
                        {probeLoading ? "Running..." : "Run Probe"}
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="lab-command-card">
                    <CardHeader>
                      <Badge variant="muted">Stream inspector</Badge>
                      <CardTitle>Filter live feed</CardTitle>
                      <CardDescription>Use source filters without leaving the probe workspace.</CardDescription>
                    </CardHeader>
                    <CardContent>
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
                      <Button onClick={() => refreshLogSnapshot()} disabled={logsLoading}>
                        <Icon name="refresh" />
                        {logsLoading ? "Refreshing" : "Refresh Snapshot"}
                      </Button>
                      <Button variant="secondary" onClick={() => setLogs([])}>
                        <Icon name="clear" />
                        Clear Local Feed
                      </Button>
                    </CardContent>
                  </Card>
                </section>

                <section className="lab-right-pane">
                  <Card className="stream-inspector-card">
                    <CardHeader className="stream-header">
                      <div>
                        <Badge variant="outline">SSE connected</Badge>
                        <CardTitle>Full live log feed</CardTitle>
                        <CardDescription>Newest-first events from `/api/live` with source, method, score, path, and action.</CardDescription>
                      </div>
                      <Badge variant="muted">{filteredLiveLogs.length} events</Badge>
                    </CardHeader>
                    <div className="stream-feed">
                      {filteredLiveLogs.map((item, index) => (
                        <LogRow key={logKey(item, index)} item={item} />
                      ))}
                      {!logsLoading && filteredLiveLogs.length === 0 ? (
                        <EmptyState title="No stream events yet" detail="Run a probe to populate the live inspector." />
                      ) : null}
                    </div>
                  </Card>
                </section>
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
                <Button onClick={() => refreshLogSnapshot()} disabled={logsLoading}>
                  <Icon name="refresh" />
                  {logsLoading ? "Refreshing" : "Refresh"}
                </Button>
                <Button variant="secondary" onClick={() => setLogs([])}>
                  <Icon name="clear" />
                  Clear
                </Button>
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
                <Button onClick={loadConfig} disabled={configLoading}>
                  <Icon name="refresh" />
                  {configLoading ? "Refreshing" : "Refresh Policy"}
                </Button>
              </div>
              <pre className={configLoading ? "loading-text" : ""}>{configYaml}</pre>
            </>
          ) : null}
        </Card>
      </main>
    </div>
  );
}

export default App;
