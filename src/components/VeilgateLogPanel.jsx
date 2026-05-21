import { useEffect, useRef, useState } from "react";
import { API_BASE } from "../lib/api";

const ANSI_PATTERN = /\x1B\[[0-?]*[ -/]*[@-~]/g;
const LOG_BATCH_SIZE = 250;

function cleanLogLine(line) {
  return line.replace(ANSI_PATTERN, "").trim();
}

function parseLogLine(line) {
  const cleanLine = cleanLogLine(line);
  const timestampMatch = cleanLine.match(/(\d{4}-\d{2}-\d{2}T[^\s]+)/);
  const pathMatch = cleanLine.match(/\spath=([^\s]+)/);
  const methodMatch = cleanLine.match(/\smethod=([A-Z]+)/);
  const decisionMatch = cleanLine.match(/\sdecision=([^\s]+)/);
  const scoreMatch = cleanLine.match(/\sscore=([0-9.-]+)/);
  const signalsMatch = cleanLine.match(/\ssignals=(\[.*\])\s*$/);

  let signals = [];
  if (signalsMatch) {
    try {
      signals = JSON.parse(signalsMatch[1]);
    } catch {
      signals = [];
    }
  }

  return {
    id: `${timestampMatch?.[1] || "log"}-${cleanLine}`,
    raw: cleanLine,
    timestamp: timestampMatch?.[1] || "",
    path: pathMatch?.[1] || "",
    method: methodMatch?.[1] || "",
    decision: decisionMatch?.[1] || "",
    score: scoreMatch?.[1] || "",
    signals,
  };
}

function dedupeLogs(entries) {
  const seen = new Set();
  return entries.filter((entry) => {
    if (seen.has(entry.id)) return false;
    seen.add(entry.id);
    return true;
  });
}

function formatTime(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function VeilgateLogPanel() {
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState("connecting");
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasOlder, setHasOlder] = useState(true);
  const listRef = useRef(null);
  const loadingOlderRef = useRef(false);

  useEffect(() => {
    const stream = new EventSource(`${API_BASE}/api/veilgate/logs/stream`);

    stream.onopen = () => setStatus("live");
    stream.onerror = () => setStatus("reconnecting");
    stream.addEventListener("log", (event) => {
      const line = event.data || "";
      if (!line.trim()) return;
      setLogs((current) => dedupeLogs([parseLogLine(line), ...current]));
    });

    return () => stream.close();
  }, []);

  async function loadOlderLogs() {
    if (loadingOlderRef.current || !hasOlder || logs.length === 0) return;

    const oldest = logs[logs.length - 1];
    if (!oldest?.timestamp) return;

    loadingOlderRef.current = true;
    setLoadingOlder(true);

    try {
      const before = new Date(new Date(oldest.timestamp).getTime() - 1).toISOString();
      const response = await fetch(
        `${API_BASE}/api/veilgate/logs?limit=${LOG_BATCH_SIZE}&before=${encodeURIComponent(before)}`,
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = await response.json();
      const olderLogs = (body.lines || []).map(parseLogLine).reverse();
      setHasOlder(olderLogs.length >= LOG_BATCH_SIZE);
      setLogs((current) => dedupeLogs([...current, ...olderLogs]));
    } catch {
      setHasOlder(false);
    } finally {
      loadingOlderRef.current = false;
      setLoadingOlder(false);
    }
  }

  function handleLogScroll(event) {
    const node = event.currentTarget;
    const remaining = node.scrollHeight - node.scrollTop - node.clientHeight;
    if (remaining < 220) {
      loadOlderLogs();
    }
  }

  return (
    <aside className="veilgate-log-panel" aria-label="Veilgate live logs">
      <div className="veilgate-log-header">
        <div>
          <span className="veilgate-eyebrow">Veilgate</span>
          <h2>Live Logs</h2>
        </div>
        <span className={`veilgate-live-status status-${status}`}>
          <span />
          {status}
        </span>
      </div>

      <div className="veilgate-log-list" ref={listRef} onScroll={handleLogScroll}>
        {logs.length === 0 ? (
          <div className="veilgate-empty-log">No log entries yet</div>
        ) : (
          <>
            {logs.map((entry) => (
              <article className="veilgate-log-entry" key={entry.id}>
                <div className="veilgate-log-entry-top">
                  <span>{formatTime(entry.timestamp)}</span>
                  {entry.score && <strong>score {entry.score}</strong>}
                </div>
                {(entry.method || entry.path || entry.decision) && (
                  <div className="veilgate-request-line">
                    <span>{entry.method}</span>
                    <strong>{entry.path}</strong>
                    <em>{entry.decision}</em>
                  </div>
                )}
                {entry.signals.length > 0 ? (
                  <div className="veilgate-mini-signals">
                    {entry.signals.map((signal, index) => (
                      <span key={`${entry.id}-${index}`}>
                        +{signal.Points || 0} {signal.Name || "signal"}
                      </span>
                    ))}
                  </div>
                ) : (
                  <pre>{entry.raw}</pre>
                )}
              </article>
            ))}
            {loadingOlder && <div className="veilgate-empty-log">Loading older logs</div>}
            {!hasOlder && <div className="veilgate-empty-log">No older logs found</div>}
          </>
        )}
      </div>
    </aside>
  );
}
