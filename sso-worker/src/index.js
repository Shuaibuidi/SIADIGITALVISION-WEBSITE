const encoder = new TextEncoder();
let cachedAccessToken = null;
let cachedAccessTokenExpiry = 0;

const allowedOrigins = new Set([
  "https://sia-digital-vision.web.app",
  "https://shuaibuidi.github.io",
  "https://siadigitalvision.com",
  "https://www.siadigitalvision.com"
]);

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": origin,
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "authorization, content-type",
      "vary": "Origin"
    }
  });
}
function b64url(bytes) {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function encodePart(value) { return b64url(encoder.encode(JSON.stringify(value))); }
function pemBytes(pem) {
  const body = pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "");
  const binary = atob(body);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}
async function importPrivateKey(pem) {
  return crypto.subtle.importKey("pkcs8", pemBytes(pem), {
    name: "RSASSA-PKCS1-v1_5", hash: "SHA-256"
  }, false, ["sign"]);
}
async function signJwt(payload, key, header = { alg: "RS256", typ: "JWT" }) {
  const unsigned = encodePart(header) + "." + encodePart(payload);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, encoder.encode(unsigned));
  return unsigned + "." + b64url(new Uint8Array(signature));
}
async function googleAccessToken(env) {
  const now = Math.floor(Date.now() / 1000);
  if (cachedAccessToken && cachedAccessTokenExpiry > now + 90) return cachedAccessToken;
  const key = await importPrivateKey(env.SERVICE_ACCOUNT_PRIVATE_KEY);
  const assertion = await signJwt({
    iss: env.SERVICE_ACCOUNT_EMAIL,
    sub: env.SERVICE_ACCOUNT_EMAIL,
    aud: "https://oauth2.googleapis.com/token",
    scope: "https://www.googleapis.com/auth/cloud-platform",
    iat: now,
    exp: now + 3600
  }, key);
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion
    })
  });
  const result = await response.json();
  if (!response.ok || !result.access_token) throw new Error("Google service authentication failed.");
  cachedAccessToken = result.access_token;
  cachedAccessTokenExpiry = now + Number(result.expires_in || 3600);
  return cachedAccessToken;
}
async function googleRequest(url, token, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      authorization: "Bearer " + token,
      "content-type": "application/json",
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error("Google service request failed.");
    error.status = response.status;
    throw error;
  }
  return data;
}
function field(doc, name) {
  const f = doc?.fields?.[name];
  if (!f) return undefined;
  if ("stringValue" in f) return f.stringValue;
  if ("booleanValue" in f) return f.booleanValue;
  if ("integerValue" in f) return Number(f.integerValue);
  return undefined;
}
async function getDocument(projectId, path, token) {
  const url = "https://firestore.googleapis.com/v1/projects/" +
    encodeURIComponent(projectId) + "/databases/(default)/documents/" + path;
  return googleRequest(url, token);
}
async function verifyWebsiteUser(idToken, env) {
  const url = "https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=" +
    encodeURIComponent(env.WEBSITE_FIREBASE_API_KEY);
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ idToken })
  });
  const data = await response.json().catch(() => ({}));
  const user = data.users?.[0];
  if (!response.ok || !user || user.disabled || user.emailVerified !== true || !user.email) {
    throw new Error("Your website sign-in must be valid and your email verified.");
  }
  return user;
}
async function issueBusinessToken(email, env, accessToken, signingKey) {
  const lookupUrl = "https://identitytoolkit.googleapis.com/v1/projects/" +
    encodeURIComponent(env.BUSINESS_PROJECT_ID) + "/accounts:lookup";
  const accounts = await googleRequest(lookupUrl, accessToken, {
    method: "POST",
    body: JSON.stringify({ email: [email] })
  });
  const businessUser = accounts.users?.find(u => String(u.email || "").toLowerCase() === email.toLowerCase());
  if (!businessUser || businessUser.disabled) throw new Error("This email does not have an active Smart Business Manager account.");
  const businessId = env.BUSINESS_ID;
  const memberPath = "businesses/" + encodeURIComponent(businessId) +
    "/members/" + encodeURIComponent(businessUser.localId);
  const member = await getDocument(env.BUSINESS_PROJECT_ID, memberPath, accessToken);
  if (field(member, "active") !== true || field(member, "role") !== "admin") {
    throw new Error("This account is not an active Business Manager administrator.");
  }
  const now = Math.floor(Date.now() / 1000);
  return signJwt({
    iss: env.SERVICE_ACCOUNT_EMAIL,
    sub: env.SERVICE_ACCOUNT_EMAIL,
    aud: "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit",
    iat: now,
    exp: now + 3600,
    uid: businessUser.localId,
    businessId,\n    role: "admin"
  }, signingKey);
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    if (!allowedOrigins.has(origin)) return new Response("Origin not allowed.", { status: 403 });
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-origin": origin,
          "access-control-allow-methods": "POST, OPTIONS",
          "access-control-allow-headers": "authorization, content-type",
          "access-control-max-age": "600",
          "vary": "Origin"
        }
      });
    }
    if (request.method !== "POST" || new URL(request.url).pathname !== "/sso/business-token") {
      return json({ error: "Not found." }, 404, origin);
    }
    try {
      const contentLength = Number(request.headers.get("content-length") || 0);
      if (contentLength > 12000) return json({ error: "Request too large." }, 413, origin);
      const body = await request.json();
      const idToken = typeof body.idToken === "string" ? body.idToken : "";
      if (!idToken || idToken.length > 10000) return json({ error: "A valid website sign-in token is required." }, 400, origin);
      const websiteUser = await verifyWebsiteUser(idToken, env);
      const accessToken = await googleAccessToken(env);
      const signingKey = await importPrivateKey(env.SERVICE_ACCOUNT_PRIVATE_KEY);

      const websiteProfile = await getDocument(
        env.WEBSITE_PROJECT_ID, "users/" + encodeURIComponent(websiteUser.localId), accessToken
      );
      if (field(websiteProfile, "role") !== "admin" || field(websiteProfile, "status") !== "approved") {
        return json({ error: "Website administrator approval is required." }, 403, origin);
      }

      const customToken = await issueBusinessToken(
        websiteUser.email, env, accessToken, signingKey
      );
      return json({ customToken }, 200, origin);
    } catch (error) {
      const status = error.status === 403 ? 403 : 401;
      return json({
        error: status === 403 ? "Access to the business account was denied." :
          (error.message || "Secure sign-in could not be completed.")
      }, status, origin);
    }
  }
};
