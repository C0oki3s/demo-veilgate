import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const SOCKET_URL =
  import.meta.env.VITE_API_BASE_URL || "https://demo-api.veilgate.dev";

const ANSI_PATTERN = /\x1B\[[0-?]*[ -/]*[@-~]/g;
let _seq = 0;

function cleanLine(line) {
  return line.replace(ANSI_PATTERN, "").trim();
}

function parseLogLine(raw) {
  const line = cleanLine(raw);
  const id = `ss-${++_seq}`;

  // "2025-05-21T10:30:00.000Z GET /api/products 200 45ms [user=xxx]"
  const reqMatch = line.match(
    /^(\d{4}-\d{2}-\d{2}T[^\s]+)\s+(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s+(\S+)\s+(\d{3})\s+(\d+ms)(.*)?$/
  );
  if (reqMatch) {
    const status = Number(reqMatch[4]);
    return {
      id,
      raw: line,
      timestamp: reqMatch[1],
      method: reqMatch[2],
      path: reqMatch[3],
      status,
      duration: reqMatch[5],
      extra: (reqMatch[6] || "").trim(),
      kind: status >= 500 ? "error" : status >= 400 ? "warn" : "req",
    };
  }

  const isError = /\berror\b/i.test(line) || line.startsWith("Error");
  return { id, raw: line, timestamp: "", method: "", path: "", status: 0, duration: "", extra: "", kind: isError ? "error" : "info" };
}

function statusClass(status) {
  if (status >= 500) return "ss-status-5xx";
  if (status >= 400) return "ss-status-4xx";
  return "ss-status-2xx";
}

function formatTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return isNaN(d) ? ts : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function ShopStormLogPanel() {
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState("connecting");
  const listRef = useRef(null);
  const autoScrollRef = useRef(true);

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ["websocket", "polling"] });

    socket.on("connect", () => setStatus("live"));
    socket.on("disconnect", () => setStatus("reconnecting"));
    socket.on("connect_error", () => setStatus("reconnecting"));

    // Bulk history replayed on first connect
    socket.on("shopstorm:log:history", (lines) => {
      // History arrives oldest-first; reverse so newest is at top
      setLogs([...lines].reverse().map(parseLogLine));
    });

    // Individual new line — prepend so newest is always on top
    socket.on("shopstorm:log", (line) => {
      if (!line?.trim()) return;
      setLogs((prev) => {
        const next = [parseLogLine(line), ...prev];
        return next.length > 500 ? next.slice(0, 500) : next;
      });
    });

    return () => socket.disconnect();
  }, []);

  // Keep list scrolled to top (newest entry) while auto-scroll is active
  useEffect(() => {
    if (autoScrollRef.current && listRef.current) {
      listRef.current.scrollTop = 0;
    }
  }, [logs]);

  function handleScroll(e) {
    autoScrollRef.current = e.currentTarget.scrollTop < 40;
  }

  return (
    <aside className="veilgate-log-panel" aria-label="ShopStorm live logs">
      <div className="veilgate-log-header">
        <div>
          <span className="veilgate-eyebrow">ShopStorm</span>
          <h2>Request Logs</h2>
        </div>
        <span className={`veilgate-live-status status-${status}`}>
          <span />
          {status}
        </span>
      </div>

      <div className="veilgate-log-list" ref={listRef} onScroll={handleScroll}>
        {logs.length === 0 ? (
          <div className="veilgate-empty-log">No log entries yet</div>
        ) : (
          logs.map((entry) => (
            <article className={`veilgate-log-entry ss-entry-${entry.kind}`} key={entry.id}>
              {entry.method ? (
                <>
                  <div className="veilgate-log-entry-top">
                    <span>{formatTime(entry.timestamp)}</span>
                    <strong className={statusClass(entry.status)}>{entry.status}</strong>
                    <em>{entry.duration}</em>
                  </div>
                  <div className="veilgate-request-line">
                    <span>{entry.method}</span>
                    <strong>{entry.path}</strong>
                    {entry.extra && <small>{entry.extra}</small>}
                  </div>
                </>
              ) : (
                <pre>{entry.raw}</pre>
              )}
            </article>
          ))
        )}
      </div>
    </aside>
  );
}
