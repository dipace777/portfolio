import { createFileRoute } from "@tanstack/react-router"
import { ArticleShell } from "@/components/journal/article"
import { GenUIArticle, toc } from "@/content/genui/article"
import { pageHead } from "@/lib/seo"
import { essayAt, site } from "@/lib/site"

const essay = essayAt("/journal/streaming-generative-ui-on-tanstack-start")

export const Route = createFileRoute(
  "/journal/streaming-generative-ui-on-tanstack-start",
)({
  head: () =>
    pageHead({
      title: `${essay.title} — ${site.name}`,
      description: essay.kicker,
      path: "/journal/streaming-generative-ui-on-tanstack-start",
      type: "article",
      published: essay.published,
      tags: essay.tags,
    }),
  component: () => (
    <ArticleShell essay={essay} toc={toc}>
      <GenUIArticle />
    </ArticleShell>
  ),
})
