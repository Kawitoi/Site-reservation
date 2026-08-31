"use client";

/**
 * Catches errors thrown by the root layout itself (rare). Must render its
 * own <html>/<body> since it replaces the entire root layout when active.
 */
export default function GlobalError() {
  return (
    <html lang="fr">
      <body>
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem", padding: "2rem", textAlign: "center", fontFamily: "sans-serif" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Une erreur est survenue</h1>
          <p style={{ color: "#6b7280", maxWidth: "24rem" }}>
            L&apos;application a rencontré un problème inattendu. Merci de réessayer dans un instant.
          </p>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- global-error replaces the root layout; Next.js's own examples use a plain anchor here since routing internals may be part of what failed. */}
          <a href="/" style={{ color: "#2563eb", textDecoration: "underline" }}>
            Retour à l&apos;accueil
          </a>
        </div>
      </body>
    </html>
  );
}
