import express, { Request, Response } from "express";
import httpProxy from "http-proxy";
import fs from "fs";

const app = express();
const PORT = Number(process.env.PORT) || 8080;

// -----------------------------
// Types
// -----------------------------
type RouteMap = Record<string, string>;

type MatchResult = {
  route: string;
  target: string;
};

// -----------------------------
// Load routes.json
// -----------------------------
let ROUTES: RouteMap = {};

function loadRoutes(): void {
  try {
    const raw = fs.readFileSync("./routes.json", "utf8");
    ROUTES = JSON.parse(raw) as RouteMap;
    console.log("Loaded routes:", ROUTES);
  } catch (err) {
    console.error("Failed to load routes.json:", err);
    ROUTES = {};
  }
}

// Initial load
loadRoutes();

// Auto reload every 5 sec
setInterval(loadRoutes, 5000);

// -----------------------------
// Proxy
// -----------------------------
const proxy = httpProxy.createProxyServer({
  changeOrigin: true,
  ws: true,
  xfwd: true
});

// -----------------------------
// Match target
// -----------------------------
function getTarget(pathname: string): MatchResult | null {
  for (const route of Object.keys(ROUTES)) {
    if (pathname.startsWith(route)) {
      return {
        route,
        target: ROUTES[route]
      };
    }
  }
  return null;
}

// -----------------------------
// HTTP Proxy
// -----------------------------
app.use((req: Request, res: Response) => {
  const match = getTarget(req.url);

  if (!match) {
    res.status(404).send("Invalid path");
    return;
  }

  // Remove path prefix before forwarding
  req.url = req.url.replace(match.route, "") || "/";

  proxy.web(req, res, { target: match.target }, (err) => {
    console.error("Proxy error:", err);
    if (!res.headersSent) {
      res.status(502).send("Bad Gateway");
    }
  });
});

// -----------------------------
// Start server
// -----------------------------
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`Dynamic proxy running on :${PORT}`);
});

// -----------------------------
// WebSocket Proxy
// -----------------------------
server.on("upgrade", (req, socket, head) => {
  const originalUrl = req.url || "";
  const match = getTarget(originalUrl);

  if (!match) {
    socket.destroy();
    return;
  }

  // Remove path prefix before forwarding
  req.url = originalUrl.replace(match.route, "") || "/";

  proxy.ws(req, socket, head, { target: match.target });
});

// -----------------------------
// Error handling
// -----------------------------
proxy.on("error", (err) => {
  console.error("Proxy internal error:", err);
});
