import { createFileRoute } from "@tanstack/react-router"
import { ArticleShell } from "@/components/journal/article"
import { TracesArticle, toc } from "@/content/traces/article"
import { pageHead } from "@/lib/seo"
import { essayAt, site } from "@/lib/site"

const essay = essayAt("/journal/traces-not-vibes")

export const Route = createFileRoute("/journal/traces-not-vibes")({
  head: () =>
    pageHead({
      title: `${essay.title} — ${site.name}`,
      description: essay.kicker,
      path: "/journal/traces-not-vibes",
      type: "article",
      published: essay.published,
      tags: essay.tags,
    }),
  component: () => (
    <ArticleShell essay={essay} toc={toc}>
      <TracesArticle />
    </ArticleShell>
  ),
})
