# 🛡️ CORS & Security

KitchenAsty includes several security measures out of the box.

## 🌐 CORS

Cross-Origin Resource Sharing is configured via the `CORS_ORIGINS` environment variable:

```dotenv
CORS_ORIGINS=http://localhost:5173,http://localhost:5174
```

The server parses this comma-separated list and allows requests from those origins with `credentials: true`.

In production, set this to your actual domain(s):

```dotenv
CORS_ORIGINS=https://admin.yourrestaurant.com,https://order.yourrestaurant.com
```

## 🪖 Helmet

[Helmet](https://helmetjs.github.io/) sets various HTTP security headers:

- 🔒 `X-Content-Type-Options: nosniff`
- 🖼️ `X-Frame-Options: SAMEORIGIN`
- 🔐 `Strict-Transport-Security` (in production)
- 📜 Content Security Policy headers
- And more

Helmet is enabled by default with standard settings for API responses. The
admin, storefront, and documentation Nginx servers also set
`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
`Referrer-Policy: no-referrer`, and a `Content-Security-Policy` containing
`frame-ancestors 'none'`. The Vite admin and storefront development servers set
the same headers for local browser testing.

The current CSP is intentionally limited to the anti-framing directive so it
does not block existing inline styles or external integrations. It is not a
complete resource allowlist; expand it only after inventorying the required
scripts, styles, API connections, images, and payment-provider frames.

### Social login callbacks

OAuth callbacks now require a short-lived, browser-bound state cookie. After a
successful callback, the server redirects with a single-use authorization code
that expires after 60 seconds; the web client exchanges it through
`POST /api/auth/social/exchange`. JWTs are not placed in redirect URLs, and
callback/exchange responses disable caching and referrers.

The state and authorization-code stores are process-local. Deployments with
multiple server instances must use sticky routing for the complete OAuth flow
or move these stores to shared storage before enabling horizontal scaling.
Social login currently redirects to the storefront; the mobile callback screen
does not yet have a native social-login launcher.

## 🚦 Rate Limiting

API endpoints are rate-limited to prevent abuse:

| Setting | Value |
|---------|-------|
| Window | 15 minutes |
| Max requests per IP | 100 |
| Headers | Standard (`RateLimit-*`) |
| Response on limit | `429 Too Many Requests` |

```json
{
  "success": false,
  "error": "Too many requests, please try again later."
}
```

Rate limiting is disabled in the `test` environment to avoid interfering with automated tests.

## 📋 Request Logging

HTTP request logging uses [Morgan](https://github.com/expressjs/morgan) in `dev` format. Logging is disabled in the `test` environment.

## 🔐 Production Security Tips

- 🔑 Set a strong, unique `JWT_SECRET` (at least 32 characters)
- 🔒 Use HTTPS in production — terminate TLS at your reverse proxy (nginx, Cloudflare, etc.)
- 🌐 Restrict `CORS_ORIGINS` to your actual frontend domains
- 📦 Keep dependencies updated with `npm audit`
- 🚦 Consider increasing rate limits for high-traffic locations or adding per-user limits
- 🧱 Use a web application firewall (WAF) for additional protection
