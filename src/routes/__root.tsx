import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router"
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools"
import { TanStackDevtools } from "@tanstack/react-devtools"

import { site } from "@/lib/site"
import appCss from "../styles.css?url"

export const Route = createRootRoute({
  head: () => {
    const title = `${site.name} — ${site.role}`
    const image = `${site.url}/og.jpg`
    return {
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { title },
        { name: "description", content: site.description },
        { name: "author", content: site.name },
        { name: "theme-color", content: "#060708" },
        { property: "og:type", content: "website" },
        { property: "og:site_name", content: site.name },
        { property: "og:title", content: title },
        { property: "og:description", content: site.description },
        { property: "og:url", content: site.url },
        { property: "og:image", content: image },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { property: "og:image:alt", content: title },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:site", content: site.twitter },
        { name: "twitter:creator", content: site.twitter },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: site.description },
        { name: "twitter:image", content: image },
      ],
      links: [
        { rel: "stylesheet", href: appCss },
        { rel: "canonical", href: site.url },
        { rel: "icon", href: "/favicon.ico", sizes: "any" },
        {
          rel: "icon",
          type: "image/png",
          sizes: "32x32",
          href: "/favicon-32.png",
        },
        { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
        { rel: "manifest", href: "/manifest.json" },
        { rel: "preload", as: "image", href: "/images/hero-network.webp" },
      ],
    }
  },
  notFoundComponent: NotFound,
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <TanStackDevtools
          config={{
            position: "bottom-right",
          }}
          plugins={[
            {
              name: "Tanstack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}

function NotFound() {
  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-ink px-6 text-center text-bone">
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 size-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-ember/10 blur-[140px]"
      />
      <span className="relative font-mono text-[11px] tracking-[0.3em] text-bone/40 uppercase">
        Error 404 · Scene missing
      </span>
      <h1 className="relative mt-6 font-display text-[clamp(3.5rem,10vw,8rem)] leading-[0.9] tracking-[-0.02em]">
        This take{" "}
        <span className="text-ember-soft italic">never made the cut.</span>
      </h1>
      <p className="relative mt-6 max-w-md text-bone/60">
        The page you were looking for doesn&apos;t exist, or it&apos;s still in
        the edit.
      </p>
      <a
        href="/"
        className="relative mt-10 rounded-full bg-bone px-7 py-4 text-sm font-medium text-ink transition-colors hover:bg-ember"
      >
        Back to the opening
      </a>
    </main>
  )
}
