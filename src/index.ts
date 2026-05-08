import express from "express";
import http from "http";
import httpProxy from "http-proxy";

const app = express();
const PORT = process.env.PORT || 8080;

// Backend target
const BACKEND_HOST = "south.ayanakojivps.shop";

// Proxy instance (HTTP + WebSocket support)
const proxy = httpProxy.createProxyServer({
  target: {
    host: BACKEND_HOST,
    port: 443,
    protocol: "https:"
  },
  changeOrigin: true,
  ws: true,
  secure: true
});

// --------------------
// HTTP proxy handler
// --------------------
app.use((req, res) => {
  proxy.web(req, res, {}, (err) => {
    console.error("HTTP proxy error:", err);
    if (!res.headersSent) {
      res.status(502).send("Bad Gateway");
    }
  });
});

// --------------------
// Server (needed for WS)
// --------------------
const server = http.createServer(app);

// --------------------
// WebSocket support
// --------------------
server.on("upgrade", (req, socket, head) => {
  proxy.ws(req, socket, head, {
    target: `https://${BACKEND_HOST}`
  });
});

// --------------------
// Error handling
// --------------------
proxy.on("error", (err) => {
  console.error("Proxy error:", err);
});

// --------------------
// Start
// --------------------
server.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`Reverse proxy running on port ${PORT}`);
});
