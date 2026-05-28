import express from "express";
import https from "https";

const app = express();
const PORT: number = parseInt(process.env.PORT || "8080", 10);

const BACKEND_HOST = "gsa.ayanakojivps.shop";

app.use((req, res) => {
  const options: https.RequestOptions = {
    hostname: BACKEND_HOST,
    port: 443,
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      host: BACKEND_HOST
    },
    timeout: 15000
  };

  const backendReq = https.request(options, (backendRes) => {
    res.writeHead(backendRes.statusCode || 502, backendRes.headers);
    backendRes.pipe(res);
  });

  backendReq.on("error", (err) => {
    console.error("Proxy error:", err);

    if (!res.headersSent) {
      res.status(502).send("Bad Gateway");
    }
  });

  backendReq.on("timeout", () => {
    backendReq.destroy();

    if (!res.headersSent) {
      res.status(504).send("Gateway Timeout");
    }
  });

  req.pipe(backendReq);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("Proxy running on", PORT);
});
