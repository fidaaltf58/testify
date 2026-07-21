const http = require("http");
const fs = require("fs");
const path = require("path");
const { buildProfile } = require("./profile");
const { verifyCredential, getCredentialsFor } = require("./verify-credential");
const { getOutreachFor } = require("./outreach");
const { createAccount } = require("./signup");

const PORT = process.env.PORT || 3000;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // POST /api/signup — creates a brand new Hedera testnet account for real,
  // right now, and returns its ID. This is what "signing up opens a real
  // account" means concretely: no account ID needs to exist beforehand.
  if (url.pathname === "/api/signup" && req.method === "POST") {
    try {
      const result = await createAccount();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // GET /api/profile?accountId=0.0.xxxxxx
  if (url.pathname === "/api/profile") {
    const accountId = url.searchParams.get("accountId") || process.env.HEDERA_ACCOUNT_ID;
    try {
      const profile = await buildProfile(accountId);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(profile));
    } catch (err) {
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // GET /api/credential?tokenId=0.0.xxxxxx&serial=1
  if (url.pathname === "/api/credential") {
    const tokenId = url.searchParams.get("tokenId") || process.env.CREDENTIAL_TOKEN_ID;
    const serial = url.searchParams.get("serial") || "1";
    try {
      const result = await verifyCredential(tokenId, serial);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // GET /api/credentials?accountId=0.0.xxxxxx — every credential this account actually holds
  if (url.pathname === "/api/credentials") {
    const accountId = url.searchParams.get("accountId");
    const tokenId = url.searchParams.get("tokenId") || process.env.CREDENTIAL_TOKEN_ID;
    if (!accountId) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "accountId is required" }));
      return;
    }
    try {
      const credentials = await getCredentialsFor(accountId, tokenId);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ accountId, credentials }));
    } catch (err) {
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // GET /api/outreach?accountId=0.0.xxxxxx
  if (url.pathname === "/api/outreach") {
    const accountId = url.searchParams.get("accountId");
    const topicId = process.env.TOPIC_ID;
    if (!accountId) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "accountId is required" }));
      return;
    }
    try {
      const records = await getOutreachFor(topicId, accountId);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ accountId, records }));
    } catch (err) {
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // Static file serving for everything else — just enough to serve ui.html
  let filePath = url.pathname === "/" ? "/ui.html" : url.pathname;
  filePath = path.join(__dirname, filePath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath);
    const type = ext === ".html" ? "text/html" : ext === ".js" ? "application/javascript" : "text/plain";
    res.writeHead(200, { "Content-Type": type });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Testify running at http://localhost:${PORT}`);
  console.log(`Live profile API at http://localhost:${PORT}/api/profile?accountId=${process.env.HEDERA_ACCOUNT_ID || "0.0.xxxxxx"}`);
});
