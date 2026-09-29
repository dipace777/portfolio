import { createFileRoute } from "@tanstack/react-router"
import { essays, site } from "@/lib/site"

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: () => {
        const pages = [
          { path: "/", priority: "1.0" },
          { path: "/journal", priority: "0.8" },
          ...essays.flatMap((e) =>
            e.to ? [{ path: e.to, priority: "0.9", lastmod: e.published }] : []
          ),
        ]
        const urls = pages
          .map(
            (p) =>
              `  <url>\n    <loc>${site.url}${p.path === "/" ? "/" : p.path}</loc>\n${
                "lastmod" in p && p.lastmod
                  ? `    <lastmod>${p.lastmod}</lastmod>\n`
                  : ""
              }    <priority>${p.priority}</priority>\n  </url>`
          )
          .join("\n")
        return new Response(
          `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
          {
            headers: {
              "content-type": "application/xml; charset=utf-8",
              "cache-control": "public, max-age=3600",
            },
          }
        )
      },
    },
  },
})
