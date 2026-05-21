import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { api, money } from "../lib/api";
import { getToken } from "../lib/auth";

const SOCKET_URL =
  import.meta.env.VITE_API_BASE_URL || "https://demo-api.veilgate.dev";
const SIMULATION_CONCURRENCY = 40;
const PRODUCT_IDS = [
  "prod_c2",
  "prod_e1",
  "prod_e2",
  "prod_b1",
  "prod_h1",
  "prod_s1",
];

function MetricCard({ label, value, icon, color }) {
  return (
    <div className={`metric-card metric-${color}`}>
      <div className="metric-icon">{icon}</div>
      <div className="metric-value">
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      <div className="metric-label">{label}</div>
    </div>
  );
}

const FEED_EVENT_ICONS = {
  order_placed: "🛒",
  cart_abandon: "💨",
  page_view: "👁️",
  signup_purchase: "🆕",
};

export default function Admin() {
  const [simState, setSimState] = useState(null);
  const [metrics, setMetrics] = useState({
    activeUsers: 0,
    totalPageViews: 0,
    ordersPlaced: 0,
    revenueCents: 0,
    cartAbandons: 0,
    newSignups: 0,
    errorCount: 0,
  });
  const [progress, setProgress] = useState({ processed: 0, total: 0, pct: 0 });
  const [feed, setFeed] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const socketRef = useRef(null);
  const feedRef = useRef(null);
  const simulationCancelledRef = useRef(false);

  useEffect(() => {
    api
      .simulationState()
      .then((d) => {
        setSimState(d.simulation);
        if (d.simulation.isRunning) setIsRunning(true);
        setMetrics({ ...metrics, ...d.simulation.metrics });
        setFeed(d.simulation.activityFeed.slice().reverse());
      })
      .catch(() => {});

    const socket = io(SOCKET_URL, { transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      setSocketConnected(true);
      socket.emit("admin:join", { token: getToken() });
    });

    socket.on("admin:joined", (data) => {
      if (data.ok) setStatusMsg("Connected to Traffic Lab");
      else setStatusMsg("Socket auth failed — are you admin?");
    });

    socket.on("disconnect", () => {
      setSocketConnected(false);
      setStatusMsg("Disconnected");
    });

    socket.on("simulation:tick", (data) => {
      setMetrics({ ...data.metrics });
      setProgress(data.progress);
      setIsRunning(true);
      if (data.feed?.length) {
        setFeed((f) => {
          const next = [...data.feed.reverse(), ...f].slice(0, 80);
          return next;
        });
      }
    });

    socket.on("simulation:complete", (data) => {
      setMetrics({ ...data.metrics });
      setProgress((p) => ({ ...p, pct: 100 }));
      setIsRunning(false);
      setStatusMsg(
        `✅ Simulation complete! ${data.metrics.ordersPlaced.toLocaleString()} orders · ${money(data.metrics.revenueCents)} revenue · ${data.durationMs}ms`,
      );
    });

    socket.on("simulation:stopped", (data) => {
      setMetrics({ ...data.metrics });
      setIsRunning(false);
      setStatusMsg(
        `⏹ Simulation stopped at ${data.progress.processed.toLocaleString()} users`,
      );
    });

    socket.on("simulation:error", (data) => {
      setIsRunning(false);
      setStatusMsg(`❌ Error: ${data.message}`);
    });

    return () => socket.disconnect();
  }, []);

  async function startSim(count) {
    simulationCancelledRef.current = false;
    setFeed([]);
    setProgress({ processed: 0, total: count, pct: 0 });
    setMetrics({
      activeUsers: 0,
      totalPageViews: 0,
      ordersPlaced: 0,
      revenueCents: 0,
      cartAbandons: 0,
      newSignups: 0,
      errorCount: 0,
    });
    setStatusMsg(`🚀 Launching ${count.toLocaleString()} users…`);
    setIsRunning(true);
    try {
      await api.startSimulation(count);
      const startedAt = Date.now();
      let nextRequest = 0;
      let processed = 0;
      const createdOrderIds = [];
      const createdTicketIds = [];
      const createdCredentials = [];
      const localMetrics = {
        activeUsers: SIMULATION_CONCURRENCY,
        totalPageViews: 0,
        ordersPlaced: 0,
        revenueCents: 0,
        cartAbandons: 0,
        newSignups: 0,
        errorCount: 0,
      };

      function bump(updates = {}, feedEntry) {
        processed += 1;
        Object.assign(localMetrics, updates);
        localMetrics.activeUsers = simulationCancelledRef.current
          ? 0
          : Math.min(SIMULATION_CONCURRENCY, count - processed);

        setMetrics({ ...localMetrics });
        setProgress({
          processed,
          total: count,
          pct: Math.round((processed / count) * 100),
        });

        if (feedEntry) {
          setFeed((f) => [feedEntry, ...f].slice(0, 80));
        }
      }

      async function runRealEndpointRequest(index) {
        const productId = PRODUCT_IDS[index % PRODUCT_IDS.length];
        const bucket = index % 24;

        if (bucket === 0) {
          await api.products({ limit: 12, page: (index % 3) + 1 });
          bump({ totalPageViews: localMetrics.totalPageViews + 1 });
        } else if (bucket === 1) {
          await api.featuredProducts();
          bump({ totalPageViews: localMetrics.totalPageViews + 1 });
        } else if (bucket === 2) {
          await api.product(productId);
          bump({ totalPageViews: localMetrics.totalPageViews + 1 });
        } else if (bucket === 3) {
          await api.cart();
          bump({ totalPageViews: localMetrics.totalPageViews + 1 });
        } else if (bucket === 4) {
          await api.addToCart(productId, 1);
          bump(
            { totalPageViews: localMetrics.totalPageViews + 1 },
            { ts: new Date().toISOString(), event: "cart_abandon", detail: `Visitor added ${productId} to cart` },
          );
        } else if (bucket === 5) {
          await api.updateCartItem(productId, 1);
          bump({ totalPageViews: localMetrics.totalPageViews + 1 });
        } else if (bucket === 6) {
          await api.removeCartItem(productId);
          bump({
            totalPageViews: localMetrics.totalPageViews + 1,
            cartAbandons: localMetrics.cartAbandons + 1,
          });
        } else if (bucket === 7) {
          await api.clearCart();
          bump({
            totalPageViews: localMetrics.totalPageViews + 1,
            cartAbandons: localMetrics.cartAbandons + 1,
          });
        } else if (bucket === 8) {
          await api.orders();
          bump({ totalPageViews: localMetrics.totalPageViews + 1 });
        } else if (bucket === 9) {
          const order = await api.createOrder({
            shippingAddress: {
              line1: "1 Traffic Lab",
              city: "Austin",
              state: "TX",
              zip: "78701",
              country: "US",
            },
            paymentMethod: { type: "card", last4: "4242" },
          });
          const revenueCents = order.order?.totalCents || 0;
          if (order.order?.id) createdOrderIds.push(order.order.id);
          bump(
            {
              totalPageViews: localMetrics.totalPageViews + 1,
              ordersPlaced: localMetrics.ordersPlaced + 1,
              revenueCents: localMetrics.revenueCents + revenueCents,
            },
            { ts: new Date().toISOString(), event: "order_placed", detail: `Checkout completed for ${money(revenueCents)}` },
          );
        } else if (bucket === 10) {
          const orderId = createdOrderIds[index % Math.max(createdOrderIds.length, 1)];
          if (orderId) await api.order(orderId);
          else await api.orders();
          bump({ totalPageViews: localMetrics.totalPageViews + 1 });
        } else if (bucket === 11) {
          const orderId = createdOrderIds[index % Math.max(createdOrderIds.length, 1)];
          if (orderId) await api.cancelOrder(orderId);
          else await api.updateProfile({ phone: `555-${String(index).padStart(4, "0")}` });
          bump({ totalPageViews: localMetrics.totalPageViews + 1 });
        } else if (bucket === 12) {
          await api.tickets();
          bump({ totalPageViews: localMetrics.totalPageViews + 1 });
        } else if (bucket === 13) {
          const ticket = await api.createTicket({
            subject: `Traffic Lab request ${index}`,
            body: "Generated by frontend traffic simulation.",
            category: "product",
          });
          if (ticket.ticket?.id) createdTicketIds.push(ticket.ticket.id);
          bump(
            { totalPageViews: localMetrics.totalPageViews + 1 },
            { ts: new Date().toISOString(), event: "page_view", detail: "Visitor opened a support ticket" },
          );
        } else if (bucket === 14) {
          const ticketId = createdTicketIds[index % Math.max(createdTicketIds.length, 1)];
          if (ticketId) await api.ticket(ticketId);
          else await api.tickets();
          bump({ totalPageViews: localMetrics.totalPageViews + 1 });
        } else if (bucket === 15) {
          const ticketId = createdTicketIds[index % Math.max(createdTicketIds.length, 1)];
          if (ticketId) await api.replyTicket(ticketId, "Following up from the traffic lab.");
          else await api.createTicket({
            subject: `Traffic Lab follow-up ${index}`,
            body: "Generated by frontend traffic simulation.",
            category: "other",
          });
          bump({ totalPageViews: localMetrics.totalPageViews + 1 });
        } else if (bucket === 16) {
          const ticketId = createdTicketIds[index % Math.max(createdTicketIds.length, 1)];
          if (ticketId) await api.closeTicket(ticketId);
          else await api.updateProfile({ lastName: `Load${index}` });
          bump({ totalPageViews: localMetrics.totalPageViews + 1 });
        } else if (bucket === 17) {
          await api.profile();
          bump({ totalPageViews: localMetrics.totalPageViews + 1 });
        } else if (bucket === 18) {
          await api.updateProfile({ phone: `555-${String(index).padStart(4, "0")}` });
          bump({ totalPageViews: localMetrics.totalPageViews + 1 });
        } else if (bucket === 19) {
          await api.returns();
          bump({ totalPageViews: localMetrics.totalPageViews + 1 });
        } else if (bucket === 20) {
          const suffix = `${Date.now()}_${index}`;
          const email = `traffic_${suffix}@shopstorm.test`;
          const password = "Password1!";
          await api.signup({
            email,
            username: `traffic_${suffix}`,
            password,
            firstName: "Traffic",
            lastName: "User",
          });
          createdCredentials.push({ email, password });
          bump(
            {
              totalPageViews: localMetrics.totalPageViews + 1,
              newSignups: localMetrics.newSignups + 1,
            },
            { ts: new Date().toISOString(), event: "signup_purchase", detail: `New traffic user signed up: ${email}` },
          );
        } else if (bucket === 21) {
          const creds = createdCredentials[index % Math.max(createdCredentials.length, 1)];
          if (creds) await api.login({ email: creds.email, password: creds.password });
          else await api.me();
          bump({ totalPageViews: localMetrics.totalPageViews + 1 });
        } else if (bucket === 22) {
          await api.updateProfile({ firstName: "Traffic", lastName: `Run${index}` });
          bump({ totalPageViews: localMetrics.totalPageViews + 1 });
        } else if (bucket === 23) {
          await api.products({ q: "wireless", limit: 6 });
          bump({ totalPageViews: localMetrics.totalPageViews + 1 });
        } else {
          await api.me();
          bump({ totalPageViews: localMetrics.totalPageViews + 1 });
        }
      }

      async function runWorker() {
        while (!simulationCancelledRef.current && nextRequest < count) {
          const requestIndex = nextRequest;
          nextRequest += 1;
          try {
            await runRealEndpointRequest(requestIndex);
          } catch {
            bump({
              totalPageViews: localMetrics.totalPageViews + 1,
              errorCount: localMetrics.errorCount + 1,
            });
          }
        }
      }

      await Promise.all(
        Array.from(
          { length: Math.min(SIMULATION_CONCURRENCY, count) },
          () => runWorker(),
        ),
      );

      if (!simulationCancelledRef.current) {
        await api.stopSimulation({
          metrics: localMetrics,
          progress: { processed, total: count, pct: 100 },
        });
        setIsRunning(false);
        setStatusMsg(
          `✅ Simulation complete! ${processed.toLocaleString()} frontend API requests · ${localMetrics.ordersPlaced.toLocaleString()} orders · ${money(localMetrics.revenueCents)} revenue · ${Date.now() - startedAt}ms`,
        );
      }
    } catch (err) {
      setIsRunning(false);
      setStatusMsg(`Error: ${err.message}`);
    }
  }

  async function stopSim() {
    simulationCancelledRef.current = true;
    try {
      await api.stopSimulation({ metrics, progress });
    } catch (err) {
      setStatusMsg(`Error: ${err.message}`);
    }
  }

  const pct = progress.pct || 0;

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1>⚡ Traffic Lab</h1>
          <p>
            Simulate real user traffic and watch your store respond in
            real-time.
          </p>
        </div>
        <div className="socket-status">
          <span
            className={`socket-dot ${socketConnected ? "connected" : "disconnected"}`}
          />
          {socketConnected ? "Live" : "Offline"}
        </div>
      </div>

      {statusMsg && <div className="status-banner">{statusMsg}</div>}

      {/* Launch buttons */}
      <div className="launch-section">
        <h2>Launch Traffic Simulation</h2>
        <p>
          Simulate thousands of users browsing, adding to cart, and purchasing —
          watch the metrics update live.
        </p>
        <div className="launch-btns">
          <button
            className="launch-btn launch-5k"
            onClick={() => startSim(4000)}
            disabled={isRunning}
          >
            <span className="launch-num">4K</span>
            <span className="launch-label">Rush Hour</span>
            <span className="launch-sub">~2 seconds</span>
          </button>
          <button
            className="launch-btn launch-10k"
            onClick={() => startSim(10000)}
            disabled={isRunning}
          >
            <span className="launch-num">10K</span>
            <span className="launch-label">Flash Sale</span>
            <span className="launch-sub">~4 seconds</span>
          </button>
          <button
            className="launch-btn launch-30k"
            onClick={() => startSim(30000)}
            disabled={isRunning}
          >
            <span className="launch-num">30K</span>
            <span className="launch-label">Storm Mode</span>
            <span className="launch-sub">~10 seconds</span>
          </button>
        </div>
        {isRunning && (
          <button className="btn btn-danger" onClick={stopSim}>
            ⏹ Stop Simulation
          </button>
        )}
      </div>

      {/* Progress bar */}
      {(isRunning || pct > 0) && (
        <div className="progress-section">
          <div className="progress-label">
            <span>
              Processing {progress.processed.toLocaleString()} /{" "}
              {progress.total.toLocaleString()} users
            </span>
            <span>{pct}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {/* Metrics grid */}
      <div className="metrics-grid">
        <MetricCard
          label="Active Users"
          value={isRunning ? metrics.activeUsers : 0}
          icon="👥"
          color="blue"
        />
        <MetricCard
          label="Page Views"
          value={metrics.totalPageViews}
          icon="👁️"
          color="purple"
        />
        <MetricCard
          label="Orders Placed"
          value={metrics.ordersPlaced}
          icon="🛒"
          color="green"
        />
        <MetricCard
          label="Revenue"
          value={money(metrics.revenueCents)}
          icon="💰"
          color="gold"
        />
        <MetricCard
          label="Cart Abandons"
          value={metrics.cartAbandons}
          icon="💨"
          color="orange"
        />
        <MetricCard
          label="New Signups"
          value={metrics.newSignups}
          icon="🆕"
          color="cyan"
        />
      </div>

      {/* Conversion rate */}
      {metrics.totalPageViews > 0 && (
        <div className="conv-bar">
          <div className="conv-item">
            <span>Page Views</span>
            <strong>{metrics.totalPageViews.toLocaleString()}</strong>
          </div>
          <span className="conv-arrow">→</span>
          <div className="conv-item">
            <span>Cart Additions</span>
            <strong>
              {(metrics.cartAbandons + metrics.ordersPlaced).toLocaleString()}
            </strong>
          </div>
          <span className="conv-arrow">→</span>
          <div className="conv-item">
            <span>Orders</span>
            <strong>{metrics.ordersPlaced.toLocaleString()}</strong>
          </div>
          <span className="conv-arrow">→</span>
          <div className="conv-item conv-rate">
            <span>Conversion</span>
            <strong>
              {metrics.totalPageViews > 0
                ? (
                    (metrics.ordersPlaced / metrics.totalPageViews) *
                    100
                  ).toFixed(1)
                : "0.0"}
              %
            </strong>
          </div>
        </div>
      )}

      {/* Live activity feed */}
      <div className="activity-section">
        <div className="activity-header">
          <h2>Live Activity Feed</h2>
          {isRunning && <span className="live-dot">● LIVE</span>}
        </div>
        <div className="activity-feed" ref={feedRef}>
          {feed.length === 0 ? (
            <div className="feed-empty">
              No activity yet. Start a simulation to see live events.
            </div>
          ) : (
            feed.map((entry, i) => (
              <div key={i} className={`feed-entry feed-${entry.event}`}>
                <span className="feed-icon">
                  {FEED_EVENT_ICONS[entry.event] || "📌"}
                </span>
                <span className="feed-detail">{entry.detail}</span>
                <span className="feed-time">
                  {new Date(entry.ts).toLocaleTimeString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Info cards */}
      <div className="admin-info-grid">
        <div className="info-card">
          <h4>📊 Traffic Profiles</h4>
          <div className="profile-bars">
            <div className="profile-bar">
              <span>Purchasers</span>
              <div className="bar">
                <div style={{ width: "35%" }} className="bar-fill bar-green" />
              </div>
              <span>35%</span>
            </div>
            <div className="profile-bar">
              <span>Cart Abandons</span>
              <div className="bar">
                <div style={{ width: "25%" }} className="bar-fill bar-orange" />
              </div>
              <span>25%</span>
            </div>
            <div className="profile-bar">
              <span>Browsers</span>
              <div className="bar">
                <div style={{ width: "30%" }} className="bar-fill bar-blue" />
              </div>
              <span>30%</span>
            </div>
            <div className="profile-bar">
              <span>New Signups</span>
              <div className="bar">
                <div style={{ width: "10%" }} className="bar-fill bar-purple" />
              </div>
              <span>10%</span>
            </div>
          </div>
        </div>
        <div className="info-card">
          <h4>⚙️ Simulation Config</h4>
          <div className="config-rows">
            <div className="config-row">
              <span>Batch Size</span>
              <strong>100 users</strong>
            </div>
            <div className="config-row">
              <span>Engine</span>
              <strong>setImmediate (non-blocking)</strong>
            </div>
            <div className="config-row">
              <span>Feed Capacity</span>
              <strong>80 live entries</strong>
            </div>
            <div className="config-row">
              <span>Real-time via</span>
              <strong>Socket.io WebSocket</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
