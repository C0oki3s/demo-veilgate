# Vercel Hosting and VeilGate Frontend Rules

This frontend is hosted on Vercel at `demo.veilgate.dev`. The API is a separate
VeilGate-protected origin at `demo-api.veilgate.dev`.

## Required Routing

Vercel should serve only the React SPA and static assets. It should not proxy
normal API traffic.

Use this `vercel.json`:

```json
{
  "redirects": [
    {
      "source": "/api/:path*",
      "destination": "https://demo-api.veilgate.dev/api/:path*",
      "permanent": false
    }
  ],
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

The `/api/:path*` rule is a guard for stale bundles, bookmarks, or accidental
relative API calls. It redirects those requests to the API domain instead of
letting the SPA fallback return cached `index.html`.

Do not configure `/api/:path*` as a Vercel rewrite/proxy. A proxy rewrite sends
traffic through this slow and incorrect path:

```text
Browser -> Vercel -> Cloudflare -> VeilGate -> ShopStorm API
```

That hides browser context from VeilGate, can cause request storms from Vercel
edge IPs, and makes API calls much slower. Correct API traffic should go:

```text
Browser -> Cloudflare -> VeilGate -> ShopStorm API
```

## Frontend API Base

The frontend REST client must use the API origin directly:

```js
export const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "https://demo-api.veilgate.dev";
```

For Vercel production, either leave `VITE_API_BASE_URL` unset or set it to:

```text
https://demo-api.veilgate.dev
```

Do not set `VITE_API_BASE_URL` to an empty string in production. That makes
requests go to `demo.veilgate.dev/api/*`, which is the frontend host, not the
API host.

## VeilGate SDK Rules

The app uses `@veilgate/client` in `src/main.jsx`:

```js
import { init, handleAll, getToken } from "@veilgate/client";

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
```

Keep `baseURL` pointed at the API origin. This lets the SDK fetch:

```text
https://demo-api.veilgate.dev/__veilgate/.well-known
```

and solve the proof-of-work challenge for the correct cookie/token scope.

The SDK also injects agent decoys by default. Do not pass `agentDecoys: false`
unless intentionally disabling that behavior.

## First Render

React should not wait for proof-of-work token warming before mounting. The app
should mount after `init()` and `handleAll()` are installed, then warm the token
in the background:

```js
mountApp();
getToken().catch(() => {}).finally(hideOverlay);
```

Blocking first render on `await getToken()` makes the website feel slow because
users wait for PoW computation before seeing the UI.

## CORS Expectations

The backend must allow the frontend origin:

```text
https://demo.veilgate.dev
https://demo-veilgate.vercel.app
https://demo-veilgate-*.vercel.app
```

Preflight requests should return `204` with:

```text
Access-Control-Allow-Origin: https://demo.veilgate.dev
Access-Control-Allow-Credentials: true
```

## Quick Verification

Check the frontend:

```bash
curl -s -D - -o /dev/null https://demo.veilgate.dev/
```

Expected:

```text
server: Vercel
content-type: text/html; charset=utf-8
```

Check the API directly:

```bash
curl -s -D - -o /dev/null \
  -H "Origin: https://demo.veilgate.dev" \
  -H "User-Agent: Mozilla/5.0" \
  https://demo-api.veilgate.dev/api/products/featured
```

Expected:

```text
content-type: application/json
access-control-allow-origin: https://demo.veilgate.dev
cf-cache-status: DYNAMIC
```

Check stale frontend `/api` paths redirect instead of serving cached HTML:

```bash
curl -s -D - -o /dev/null https://demo.veilgate.dev/api/products/featured
```

Expected:

```text
30x
location: https://demo-api.veilgate.dev/api/products/featured
```

