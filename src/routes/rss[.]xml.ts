import { createFileRoute } from "@tanstack/react-router"
import { essays, site } from "@/lib/site"

const escape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

export const Route = createFileRoute("/rss.xml")({
  server: {
    handlers: {
      GET: () => {
        const items = essays
          .filter((e) => e.to && e.published)
          .map((e) => {
            const url = `${site.url}${e.to}`
            return [
              "    <item>",
              `      <title>${escape(e.title)}</title>`,
              `      <link>${url}</link>`,
              `      <guid>${url}</guid>`,
              `      <pubDate>${new Date(`${e.published}T00:00:00Z`).toUTCString()}</pubDate>`,
              `      <description>${escape(e.kicker)}</description>`,
              ...e.tags.map((t) => `      <category>${escape(t)}</category>`),
              "    </item>",
            ].join("\n")
          })
          .join("\n")
        return new Response(
          `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escape(`${site.name} — Journal`)}</title>
    <link>${site.url}/journal</link>
    <atom:link href="${site.url}/rss.xml" rel="self" type="application/rss+xml"/>
    <description>Interactive essays on building AI-native software.</description>
    <language>en</language>
${items}
  </channel>
</rss>
`,
          {
            headers: {
              "content-type": "application/rss+xml; charset=utf-8",
              "cache-control": "public, max-age=3600",
            },
          }
        )
      },
    },
  },
})
