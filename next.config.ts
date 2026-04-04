import type { NextConfig } from "next";

// Security headers applied to every response.
// Rationale: this is an anonymous mental health tool targeting vulnerable users.
// A CSP protects against a future XSS vulnerability exfiltrating conversation content.
// See docs/PRD.md §6 (Privacy Architecture) and docs/research-brief.md §4 (Privacy).
// TODO (before Phase 7): Migrate to nonce-based CSP using Next.js middleware.
// Current `'unsafe-inline'` on script-src is a known gap — it's required for
// Next.js App Router hydration scripts unless we implement nonce injection.
// Migration path: https://nextjs.org/docs/app/guides/content-security-policy
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // 'unsafe-inline' for scripts is temporary — see TODO above
      "script-src 'self' 'unsafe-inline'",
      // Tailwind/Next.js inline their runtime styles; 'unsafe-inline' is required here
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      // LLM providers, Supabase, and Vercel telemetry
      "connect-src 'self' https://generativelanguage.googleapis.com https://api.groq.com https://*.supabase.co https://vitals.vercel-insights.com https://va.vercel-scripts.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; "),
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  {
    // HSTS without `preload` — adding `preload` is a permanent commitment and
    // should be done deliberately in Phase 14 once the production domain is set.
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
