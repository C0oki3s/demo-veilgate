import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const SOCKET_URL =
  import.meta.env.VITE_API_BASE_URL || "https://demo-api.veilgate.dev";

const ANSI_PATTERN = /\x1B\[[0-?]*[ -/]*[@-~]/g;

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
    try { signals = JSON.parse(signalsMatch[1]); } catch { signals = []; }
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
  return entries.filter((e) => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });
}

function formatTime(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function VeilgateLogPanel() {
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState("connecting");
  const listRef = useRef(null);

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ["polling", "websocket"] });

    socket.on("connect", () => setStatus("live"));
    socket.on("disconnect", () => setStatus("reconnecting"));
    socket.on("connect_error", () => setStatus("reconnecting"));

    // Bulk history on first connect
    socket.on("veilgate:log:history", (lines) => {
      setLogs(dedupeLogs([...lines].reverse().map(parseLogLine)));
    });

    // Individual new lines — prepend so newest is on top
    socket.on("veilgate:log", (line) => {
      if (!line?.trim()) return;
      setLogs((prev) => dedupeLogs([parseLogLine(line), ...prev]).slice(0, 500));
    });

    return () => socket.disconnect();
  }, []);

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

      <div className="veilgate-log-list" ref={listRef}>
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
          </>
        )}
      </div>
    </aside>
  );
}
