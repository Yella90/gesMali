import type { NextConfig } from "next";

const enTetesSecurite = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,

  // Le moteur PDF (pdfkit) charge ses polices standard (Helvetica...) par un chemin
  // calcule a l'execution : le tracage du build ne les voit pas et elles manquent
  // sur Vercel ("Cannot find module .../pdfkit/js/standard-fonts/Helvetica.cjs").
  outputFileTracingIncludes: {
    "/*": [
      "./node_modules/pdfkit/js/standard-fonts/**/*", // npm (Vercel)
      "./node_modules/.pnpm/pdfkit@*/node_modules/pdfkit/js/standard-fonts/**/*", // pnpm (local)
    ],
  },

  async headers() {
    return [
      { source: "/:path*", headers: enTetesSecurite },
      // Espace parent : le code secret est dans l'URL, il ne doit fuiter ni
      // vers d'autres sites (Referer) ni dans un cache partage ou un moteur de recherche
      {
        source: "/parent/:path*",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Cache-Control", value: "private, no-store" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
      {
        source: "/api/parent/:path*",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default nextConfig;
