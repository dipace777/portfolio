import { createFileRoute } from "@tanstack/react-router"
import { ArticleShell } from "@/components/journal/article"
import { DurableAgentsArticle, toc } from "@/content/durable-agents/article"
import { pageHead } from "@/lib/seo"
import { essayAt, site } from "@/lib/site"

const essay = essayAt("/journal/durable-agents-with-effect")

export const Route = createFileRoute("/journal/durable-agents-with-effect")({
  head: () =>
    pageHead({
      title: `${essay.title} — ${site.name}`,
      description: essay.kicker,
      path: "/journal/durable-agents-with-effect",
      type: "article",
      published: essay.published,
      tags: essay.tags,
    }),
  component: () => (
    <ArticleShell essay={essay} toc={toc}>
      <DurableAgentsArticle />
    </ArticleShell>
  ),
})
