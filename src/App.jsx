import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
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

const HERO_PRETEXT = [
  "Detect AI pentest agents",
  "Hallucinate fake endpoints",
  "Tarpit autonomous crawlers",
  "Burn LLM budget",
  "Open-source reverse proxy",
  "Drop-in deployment",
  "Built for the AI-pentest age",
];

const HERO_ROTATOR = ["cheaper", "easier", "faster", "trivial"];

function useRotator(words, intervalMs = 2400) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState("in");
  useEffect(() => {
    const enter = setTimeout(() => setPhase("in"), 0);
    const exit = setTimeout(() => setPhase("exit"), intervalMs - 500);
    const swap = setTimeout(() => {
      setIndex((i) => (i + 1) % words.length);
      setPhase("in");
    }, intervalMs);
    return () => {
      clearTimeout(enter);
      clearTimeout(exit);
      clearTimeout(swap);
    };
  }, [index, intervalMs, words.length]);
  return { word: words[index], phase };
}

function useCountUp(value, durationMs = 900) {
  const [display, setDisplay] = useState(typeof value === "number" ? 0 : value);
  const previous = useRef(0);
  useEffect(() => {
    if (typeof value !== "number" || Number.isNaN(value)) {
      setDisplay(value);
      return undefined;
    }
    const start = previous.current;
    const delta = value - start;
    if (delta === 0) {
      setDisplay(value);
      return undefined;
    }
    let raf = 0;
    const t0 = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - t0) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(start + delta * eased));
      if (t < 1) raf = requestAnimationFrame(step);
      else previous.current = value;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, durationMs]);
  return display;
}

function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const root = ref.current;
    if (!root || typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.12 }
    );
    const observeAll = () => {
      root.querySelectorAll("[data-reveal]:not(.is-visible)").forEach((node) => {
        observer.observe(node);
      });
    };
    observeAll();
    const mutObs = typeof MutationObserver !== "undefined" ? new MutationObserver(observeAll) : null;
    if (mutObs) mutObs.observe(root, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      if (mutObs) mutObs.disconnect();
    };
  }, []);
  return ref;
}

function useTilt() {
  const onMouseMove = useCallback((event) => {
    const target = event.currentTarget;
    const rect = target.getBoundingClientRect();
    const mx = ((event.clientX - rect.left) / rect.width) * 100;
    const my = ((event.clientY - rect.top) / rect.height) * 100;
    target.style.setProperty("--mx", `${mx}%`);
    target.style.setProperty("--my", `${my}%`);
  }, []);
  return { onMouseMove };
}

function CountValue({ value }) {
  const numeric = typeof value === "number" ? value : Number(value);
  const isNumber = Number.isFinite(numeric);
  const animated = useCountUp(isNumber ? numeric : value);
  return <strong>{isNumber ? animated.toLocaleString() : value}</strong>;
}

function HeroRotator({ words }) {
  const { word, phase } = useRotator(words);
  return (
    <span className="hero-rotator" aria-live="polite">
      <span key={word} className={`hero-rotator-word${phase === "exit" ? " exit" : ""}`}>{word}</span>
    </span>
  );
}

function HeroPretext({ items }) {
  const loop = [...items, ...items];
  return (
    <div className="hero-pretext" aria-hidden="true">
      <div className="hero-pretext-track">
        {loop.map((item, index) => (
          <span className="hero-pretext-item" key={`${item}-${index}`}>{item}</span>
        ))}
      </div>
    </div>
  );
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
  const tilt = useTilt();
  return (
    <Card className="product-card" data-reveal {...tilt}>
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
    <div className="empty-state" role="status">
      <span className="glyph">
        <Icon name="empty" />
      </span>
      <h3 className="ui-card-title">{title}</h3>
      <p className="ui-card-description">{detail}</p>
    </div>
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
  const pageRef = useReveal();

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
    const filtered = sourceFilter ? logs.filter((item) => item.source === sourceFilter) : logs;
    return [...filtered].sort((a, b) => {
      const ta = a.ts ? new Date(a.ts).getTime() : 0;
      const tb = b.ts ? new Date(b.ts).getTime() : 0;
      return tb - ta;
    });
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

  const cartTotal = cart.reduce((sum, item) => sum + Number(item.subtotal_cents || 0), 0)

  const insightItems = [
    ["Query refine", `${visibleProducts.length}/${products.length || 0}`, "search"],
    ["Signals", String(filteredLiveLogs.length), "layers"],
    ["Cart events", String(cart.length), "cart"],
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
    <div className="page" ref={pageRef}>
      <main className="shell">
        <header className="hero" data-reveal>
          <HeroPretext items={HERO_PRETEXT} />
          <div className="hero-copy">
            <p className="eyebrow">VeilGate · Tarpit + Deception Proxy</p>
            <h1>
              <span className="hero-headline">The cost of attacking you should not be</span>{" "}
              <HeroRotator words={HERO_ROTATOR} />{" "}
              <span className="hero-headline">than the cost of defending.</span>
            </h1>
            <p className="muted">
              VeilGate is an open-source tarpit + deception proxy that detects AI-driven pentest agents and feeds them a fake application — wasting their LLM budget on hallucinated bugs and prompt-injection payloads while your real app stays untouched.
            </p>
            <div className="hero-cta">
              <Button onClick={() => changeView(VIEWS.LAB)}>
                <Icon name="play" />
                Run a probe
              </Button>
              <Button variant="secondary" onClick={() => changeView(VIEWS.CONFIG)}>
                <Icon name="config" />
                Read the policy
              </Button>
              <div className="endpoint">
                <Icon name="terminal" />
                <span>Protected edge</span>
                <code>{API_BASE}</code>
              </div>
            </div>
          </div>
          <div className="commerce-hero-grid">
            <Card className="commerce-hero-card" data-reveal style={{ "--reveal-delay": "60ms" }}>
              <CardHeader>
                <Badge variant="muted">Detection</Badge>
                <CardTitle>Spot the autonomous agent</CardTitle>
                <CardDescription>Identify AI-driven pentesters from request signature, timing, and tooling fingerprints — no allowlist, no captcha, no rules to maintain.</CardDescription>
              </CardHeader>
            </Card>
            <Card className="commerce-hero-card" data-reveal style={{ "--reveal-delay": "140ms" }}>
              <CardHeader>
                <Badge variant="muted">Deception</Badge>
                <CardTitle>Hallucinated attack surface</CardTitle>
                <CardDescription>Serve a fake application that wastes their LLM tokens on bugs that don&apos;t exist and traps them in prompt-injection canaries.</CardDescription>
              </CardHeader>
            </Card>
          </div>
          <div className="stats-strip">
            <Card data-reveal style={{ "--reveal-delay": "60ms" }}>
              <span>Catalog items<CountValue value={stats?.totalProducts ?? "-"} /></span>
            </Card>
            <Card data-reveal style={{ "--reveal-delay": "140ms" }}>
              <span>Observed views<CountValue value={stats?.totalPageViews ?? "-"} /></span>
            </Card>
            <Card data-reveal style={{ "--reveal-delay": "220ms" }}>
              <span>Capture<strong>{stats?.captureEnabled ? "on" : "off"}</strong></span>
            </Card>
          </div>
          <div className="insight-strip">
            {insightItems.map(([label, value, icon], index) => (
              <Card className="insight-card" data-reveal style={{ "--reveal-delay": `${index * 80}ms` }} key={label}>
                <Icon name={icon} />
                <span>{label}</span>
                <CountValue value={value} />
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
