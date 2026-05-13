import express, { Request, Response } from "express";
import httpProxy from "http-proxy";
import fs from "fs";

const app = express();
const PORT = Number(process.env.PORT) || 8080;

type RouteMap = Record<string, string>;
let ROUTES: RouteMap = {};

function loadRoutes(): void {
  try {
    ROUTES = JSON.parse(fs.readFileSync("./routes.json", "utf8")) as RouteMap;
    console.log("Routes loaded");
  } catch (err) {
    console.error("Failed to load routes:", err);
    ROUTES = {};
  }
}

loadRoutes();

const proxy = httpProxy.createProxyServer({
  changeOrigin: true,
  ws: true,
  xfwd: true,
  secure: false // helpful if backend TLS cert/setup is unusual
});

function getTarget(pathname: string): string | null {
  for (const route of Object.keys(ROUTES)) {
    if (pathname.startsWith(route)) {
      return ROUTES[route];
    }
  }
  return null;
}

// HTTP
app.use((req: Request, res: Response) => {
  const target = getTarget(req.url);

  if (!target) {
    res.status(404).send("Invalid path");
    return;
  }

  // DO NOT modify req.url here for websocket-compatible routing
  proxy.web(req, res, { target }, (err) => {
    console.error("HTTP proxy error:", err);
    if (!res.headersSent) res.status(502).send("Bad Gateway");
  });
});

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`Proxy running on ${PORT}`);
});

// WebSocket
server.on("upgrade", (req, socket, head) => {
  const target = getTarget(req.url || "");

  if (!target) {
    socket.destroy();
    return;
  }

  proxy.ws(req, socket, head, { target });
});

proxy.on("error", (err) => {
  console.error("Proxy error:", err);
});
