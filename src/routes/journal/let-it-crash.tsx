import { createFileRoute } from "@tanstack/react-router"
import { ArticleShell } from "@/components/journal/article"
import { SuperviseArticle, toc } from "@/content/supervise/article"
import { pageHead } from "@/lib/seo"
import { essayAt, site } from "@/lib/site"

const essay = essayAt("/journal/let-it-crash")

export const Route = createFileRoute("/journal/let-it-crash")({
  head: () =>
    pageHead({
      title: `${essay.title} — ${site.name}`,
      description: essay.kicker,
      path: "/journal/let-it-crash",
      type: "article",
      published: essay.published,
      tags: essay.tags,
    }),
  component: () => (
    <ArticleShell essay={essay} toc={toc}>
      <SuperviseArticle />
    </ArticleShell>
  ),
})
