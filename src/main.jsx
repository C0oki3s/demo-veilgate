import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./styles.css";
import App from "./App";
import { init, handleAll, getToken } from "@veilgate/client";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "https://demo-api.veilgate.dev";

function mountApp() {
  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );
}

// ── Boot: init VeilGate, patch fetch/XHR, then mount React ───────────────────
(async () => {
  try {
    await init({
      baseURL: API_BASE,
      verificationUI: true,
    });

    handleAll({
      baseURL: API_BASE,
      verificationUI: true,
    });
  } catch (_) {
    // Discovery unavailable — continue with the app and let API calls surface errors.
  }

  mountApp();

  // Warm the PoW token in the background. This avoids blocking first render
  // while still preparing socket.io/API calls that need a VeilGate credential.
  getToken().catch(() => {});
})();
