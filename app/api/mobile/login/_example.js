import express from "express";
import crypto from "crypto";
import session from "express-session";
import fetch from "node-fetch";
import morgan from "morgan";

const app = express();

app.use(morgan("dev"));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: "dev-secret",
  resave: false,
  saveUninitialized: true
}));

const CLIENT_ID = "eApp";
const REDIRECT_URI = "http://localhost:3000/callback";
const AUTH_URL = "https://sms.schoolsoft.se/engelska/react/#/login/student";
const TOKEN_URL = "https://sms.schoolsoft.se/engelska/rest-api/login/token";

function base64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function makePkcePair() {
  const verifier = base64url(crypto.randomBytes(32));
  const challenge = base64url(
    crypto.createHash("sha256").update(verifier).digest()
  );
  return { verifier, challenge };
}

app.use((req, res, next) => {
  console.log("\n--- Incoming request ---");
  console.log("method:", req.method, "url:", req.originalUrl);
  console.log("sessionID:", req.sessionID);
  console.log("session:", req.session);
  next();
});

app.get("/", (req, res) => {
  res.send(`
    <form method="post" action="/login">
      <input name="username" placeholder="Username" />
      <input name="password" type="password" placeholder="Password" />
      <button type="submit">Login</button>
    </form>
  `);
});

app.post("/login", async (req, res, next) => {
  try {
    const { username, password } = req.body;
    console.log("[/login] body:", { username, password: password ? "***" : "" });

    const { verifier, challenge } = makePkcePair();
    const state = crypto.randomBytes(8).toString("hex");

    req.session.pkce = { verifier, username, state };
    console.log("[/login] generated pkce:", { verifier, challenge, state });
    console.log("[/login] session after save:", req.session.pkce);

    const loginUrl =
      `${AUTH_URL}?code_challenge=${encodeURIComponent(challenge)}` +
      `&username=${encodeURIComponent(username)}` +
      `&orgid=18&code_challenge_method=S256` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&client_id=${encodeURIComponent(CLIENT_ID)}` +
      `&response_type=code&state=${encodeURIComponent(state)}`;

    console.log("[/login] loginUrl:", loginUrl);
    res.send(`<a href="${loginUrl}">Open login URL</a>`);
  } catch (err) {
    console.error("[/login] error:", err);
    next(err);
  }
});

app.get("/callback", async (req, res, next) => {
  try {
    console.log("\n[/callback] query:", req.query);
    console.log("[/callback] session pkce:", req.session?.pkce);

    const code = req.query.code;
    const codeVerifier = req.session?.pkce?.verifier;

    if (!code) {
      console.error("[/callback] missing code");
      return res.status(400).send("Missing code");
    }

    if (!codeVerifier) {
      console.error("[/callback] missing codeVerifier in session");
      return res.status(400).send("Missing code verifier in session");
    }

    const tokenUrl =
      `${TOKEN_URL}?clientId=${encodeURIComponent(CLIENT_ID)}` +
      `&grantType=code&code=${encodeURIComponent(code)}` +
      `&codeVerifier=${encodeURIComponent(codeVerifier)}`;

    console.log("[/callback] tokenUrl:", tokenUrl);

    const tokenRes = await fetch(tokenUrl, {
      method: "POST",
      headers: { "accept": "application/json" }
    });

    console.log("[/callback] token status:", tokenRes.status, tokenRes.statusText);
    console.log("[/callback] token headers:", Object.fromEntries(tokenRes.headers.entries()));

    const text = await tokenRes.text();
    console.log("[/callback] token raw body:", text);

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    res.json(data);
  } catch (err) {
    console.error("[/callback] error:", err);
    next(err);
  }
});

app.use((err, req, res, next) => {
  console.error("[error middleware]", err);
  res.status(500).send("Internal server error");
});

app.listen(3000, () => console.log("http://localhost:3000"));