import express from "express";
import httpProxy from "http-proxy";

const app = express();
const PORT = process.env.PORT || 8080;

// Path → backend mapping
const ROUTES = {
  "/maibhhhh": "https://south.ayanakojivps.shop",
  "/s1": "https://south2.ayanakojivps.shop",
  "/s2": "https://south3.ayanakojivps.shop"
};

// create proxy
const proxy = httpProxy.createProxyServer({
  changeOrigin: true,
  ws: true,
  xfwd: true
});

// function to choose backend
function getTarget(pathname) {
  for (const route in ROUTES) {
    if (pathname.startsWith(route)) {
      return ROUTES[route];
    }
  }
  return null;
}

// -----------------------------
// HTTP proxy
// -----------------------------
app.use((req, res) => {
  const target = getTarget(req.url);

  if (!target) {
    return res.status(404).send("Invalid path");
  }

  proxy.web(req, res, { target }, (err) => {
    console.error("Proxy error:", err);
    if (!res.headersSent) {
      res.status(502).send("Bad Gateway");
    }
  });
});

// -----------------------------
// start server
// -----------------------------
const server = app.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`Cloud Run path-based proxy running on :${PORT}`);
});

// -----------------------------
// WebSocket support
// -----------------------------
server.on("upgrade", (req, socket, head) => {
  const target = getTarget(req.url);

  if (!target) {
    socket.destroy();
    return;
  }

  proxy.ws(req, socket, head, { target });
});

// -----------------------------
// Error handling
// -----------------------------
proxy.on("error", (err) => {
  console.error("Proxy internal error:", err);
});
