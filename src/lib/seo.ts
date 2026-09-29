import { site } from "./site"

export const pageHead = ({
  title,
  description,
  path,
  type = "website",
  published,
  tags = [],
}: {
  title: string
  description: string
  path: string
  type?: "website" | "article"
  published?: string
  tags?: ReadonlyArray<string>
}) => {
  const url = `${site.url}${path === "/" ? "" : path}`
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:type", content: type },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: url },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      ...(published
        ? [{ property: "article:published_time", content: published }]
        : []),
      ...tags.map((t) => ({ property: "article:tag", content: t })),
    ],
    links: [{ rel: "canonical", href: url }],
  }
}
