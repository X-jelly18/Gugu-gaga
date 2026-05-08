import express, { Request, Response } from "express";
import https from "https";

const app = express();
const PORT = process.env.PORT || 8080;

// Your backend
const BACKEND_HOST = "south.ayanakojivps.shop";

// We must NOT block raw streams
app.use((req: Request, res: Response) => {
  const backendPath = req.url;

  const options: https.RequestOptions = {
    hostname: BACKEND_HOST,
    port: 443,
    path: backendPath,
    method: req.method,
    headers: {
      ...req.headers,
      host: BACKEND_HOST // important: force backend host header
    }
  };

  const backendReq = https.request(options, (backendRes) => {
    // Forward status + headers
    res.writeHead(backendRes.statusCode || 502, backendRes.headers);

    // Stream response back to client
    backendRes.pipe(res);
  });

  backendReq.on("error", (err) => {
    console.error("Backend request error:", err);
    res.status(502).send("Bad Gateway");
  });

  // Stream request body (POST/PUT/etc.)
  if (req.method !== "GET" && req.method !== "HEAD") {
    req.pipe(backendReq);
  } else {
    backendReq.end();
  }
});

app.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`Reverse proxy running on port ${PORT}`);
});
