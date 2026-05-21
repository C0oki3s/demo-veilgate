import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./styles.css";
import App from "./App";
import { init, handleAll } from "@veilgate/client";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "https://demo-api.veilgate.dev";

// ── PoW challenge overlay (shown while iframe solves the challenge) ────────────
const overlay = document.createElement("div");
overlay.id = "vg-pow-overlay";
overlay.innerHTML = `
  <div class="vg-pow-box">
    <div class="vg-pow-spinner"></div>
    <p class="vg-pow-text">Verifying your request&hellip;</p>
    <small class="vg-pow-sub">Veilgate proof-of-work challenge</small>
  </div>
`;
document.body.appendChild(overlay);

const showOverlay = () => overlay.classList.add("vg-pow-visible");
const hideOverlay = () => overlay.classList.remove("vg-pow-visible");

// ── Boot: init VeilGate, patch fetch/XHR, then mount React ───────────────────
(async () => {
  await init({
    baseURL: API_BASE,
    onChallenge: showOverlay,
    onToken: hideOverlay,
  });

  handleAll({
    baseURL: API_BASE,
    onChallenge: showOverlay,
    onToken: hideOverlay,
  });

  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );
})();
