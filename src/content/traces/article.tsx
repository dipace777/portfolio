import { Link } from "@tanstack/react-router"
import { CodeBlock } from "@/components/journal/code-block"
import { Callout, Section } from "@/components/journal/article"
import type { TocItem } from "@/components/journal/article"
import { TraceExplorer } from "@/components/journal/traces/trace-explorer"
import { BudgetLab } from "@/components/journal/traces/budget-lab"
import { SamplingLab } from "@/components/journal/traces/sampling-lab"
import { EvalDrift } from "@/components/journal/traces/eval-drift"
import instrumentationSrc from "./instrumentation.ts?raw"
import answerSrc from "./answer.ts?raw"
import budgetSrc from "./budget.ts?raw"
import evalLaterSrc from "./eval-later.ts?raw"
import tailSamplingSrc from "./tail-sampling.yaml?raw"

export const toc: ReadonlyArray<TocItem> = [
  { id: "vibes-dont-page-anyone", title: "Vibes don't page anyone" },
  { id: "anatomy-of-a-trace", title: "Anatomy of an LLM trace" },
  { id: "speak-gen-ai", title: "Speak gen_ai" },
  { id: "wire-it-once", title: "Wire it once" },
  { id: "failures-that-return-200", title: "Failures that return 200" },
  { id: "token-budgets", title: "Token budgets are SLOs" },
  { id: "sample-the-tail", title: "Sample the tail" },
  { id: "evals-are-telemetry", title: "Evals are telemetry" },
  { id: "prompts-are-pii", title: "Prompts are PII" },
  { id: "checklist", title: "The checklist" },
]

export function TracesArticle() {
  return (
    <>
      <Section id="vibes-dont-page-anyone" title="Vibes don't page anyone">
        <p>
          Most LLM features are monitored by vibes. Someone pastes a prompt into
          a playground, reads the answer, nods, and ships. When a customer
          complains a week later, the investigation is a Slack thread of
          screenshots and a <code>console.log</code> of the prompt that may or
          may not match what ran in production.
        </p>
        <p>
          Meanwhile the rest of the stack has had real answers for a decade.
          Every HTTP request, query and queue hop is a <strong>span</strong> in
          a trace, sampled and indexed and alertable. The LLM call is usually
          the slowest, most expensive and least predictable span in the
          request, and it&apos;s the one we leave out.
        </p>
        <p>
          This essay puts it back. We&apos;ll instrument a retrieval-augmented
          support bot with <strong>OpenTelemetry</strong>, so that model calls,
          tool calls, token spend and eval scores land in the same traces as
          your database queries. Then we&apos;ll use those traces for what
          vibes can&apos;t do: budgets, sampling and regression alerts.
        </p>
        <Callout label="What's real">
          <p>
            Fig.&nbsp;01 runs on this site&apos;s server. The pipeline, the
            OpenTelemetry SDK, the AI SDK&apos;s <code>@ai-sdk/otel</code>{" "}
            integration and every span it produces are real. The model and
            embedder are scripted stand-ins with fixed latencies and token
            counts, so it costs nothing to run. Figs.&nbsp;02–04 are seeded
            simulations; Fig.&nbsp;03 runs OpenTelemetry&apos;s actual{" "}
            <code>TraceIdRatioBasedSampler</code> in your browser. Snippets are
            type-checked against <code>ai@7</code> and{" "}
            <code>@opentelemetry/sdk-trace-base@2</code>.
          </p>
        </Callout>
      </Section>

      <Section id="anatomy-of-a-trace" title="Anatomy of an LLM trace">
        <p>
          Here&apos;s one request to the support bot. A customer asks why an
          order was charged twice. The server embeds the question, searches a
          vector index, calls the model, lets it call a{" "}
          <code>lookupOrder</code> tool, runs a PII guardrail on the answer and
          scores it for groundedness. Pick a scenario and inspect the spans.
        </p>
        <TraceExplorer />
        <p>
          Read the healthy trace top to bottom and the shape of an agent falls
          out. <code>invoke_agent</code> wraps the whole{" "}
          <code>generateText</code> call. Each <code>step</code> is one trip
          around the tool loop. Inside a step, <code>chat</code> is the actual
          provider call and <code>execute_tool</code> is your code. The two{" "}
          <code>chat</code> spans are the model deciding to call the tool, then
          reading the result and answering.
        </p>
        <p>
          Now switch to <em>Slow provider</em>. Nothing failed, but the
          waterfall tells you instantly that retrieval took 130&nbsp;ms and the
          two model calls took almost four seconds. Without spans, that&apos;s an argument about
          whether &ldquo;the database is slow again.&rdquo;
        </p>
      </Section>

      <Section id="speak-gen-ai" title="Speak gen_ai">
        <p>
          Click a <code>chat</code> span and look at the attribute names:{" "}
          <code>gen_ai.operation.name</code>, <code>gen_ai.provider.name</code>
          , <code>gen_ai.request.model</code>,{" "}
          <code>gen_ai.usage.input_tokens</code>,{" "}
          <code>gen_ai.response.finish_reasons</code>. None of those were
          invented for this page. They&apos;re OpenTelemetry&apos;s{" "}
          <strong>GenAI semantic conventions</strong>, and they&apos;re the
          reason this is worth doing through OpenTelemetry rather than a
          bespoke LLM logging tool.
        </p>
        <p>
          Conventions are what make telemetry portable. Honeycomb, Grafana,
          Datadog and the LLM-specific backends all recognise{" "}
          <code>gen_ai.usage.input_tokens</code>, so a &ldquo;tokens by
          model&rdquo; chart is one query in any of them. The conventions even
          cover evaluations: <code>gen_ai.evaluation.name</code> and{" "}
          <code>gen_ai.evaluation.score.value</code> are what the eval span
          above uses. Name things the standard way and every tool you&apos;ll
          ever adopt already understands your data.
        </p>
        <Callout label="Stability">
          <p>
            The GenAI conventions are still marked <em>Development</em> in
            OpenTelemetry. Names have already moved once (
            <code>gen_ai.system</code> became{" "}
            <code>gen_ai.provider.name</code>). Letting the SDK integration emit
            them, instead of hand-writing every key, means a dependency bump
            keeps you current.
          </p>
        </Callout>
      </Section>

      <Section id="wire-it-once" title="Wire it once">
        <p>
          Setup is one file that runs before your server handles traffic. It
          registers a tracer provider that batches spans to an OTLP endpoint
          (your collector, or a vendor directly), and installs an async
          context manager so spans started deep inside the AI SDK find their
          parent.
        </p>
        <CodeBlock code={instrumentationSrc} file="instrumentation.ts" />
        <p>
          In AI SDK v7, telemetry moved out of core. <code>@ai-sdk/otel</code>{" "}
          is the integration, and <code>registerTelemetry</code> attaches it to
          every call in the process. After that, a call only needs a{" "}
          <code>functionId</code>, which becomes <code>gen_ai.agent.name</code>{" "}
          and is how you&apos;ll group these spans later. Wrap your own steps
          in spans with the plain OpenTelemetry API, and the model calls nest
          underneath them automatically:
        </p>
        <CodeBlock code={answerSrc} file="answer.ts" />
        <p>
          That nesting is the entire point. The <code>chat</code> span&apos;s
          parent is your <code>answer</code> span, whose parent is the HTTP
          span your framework created, whose parent may be a span from the
          browser, carried over by a <code>traceparent</code> header. One trace
          ID from the click to the token. Not a separate LLM dashboard you
          correlate by timestamp.
        </p>
      </Section>

      <Section id="failures-that-return-200" title="Failures that return 200">
        <p>
          Switch Fig.&nbsp;01 to <em>Tool timeout</em>. The orders database
          times out after 1.5&nbsp;seconds, the AI SDK records the exception on
          the <code>execute_tool</code> span and marks it{" "}
          <code>ERROR</code>, and then it does exactly what it&apos;s designed
          to do: hands the error to the model, which apologises and answers
          from the knowledge base. The request returns{" "}
          <strong>200</strong>.
        </p>
        <p>
          That&apos;s the defining failure mode of LLM systems. The model is a
          very good error handler, so failures turn into plausible, worse
          answers instead of exceptions. Your HTTP error rate stays flat while
          a dependency is on fire. Alert on span status across the trace, not
          on response codes, and this outage shows up as the spike it is.
        </p>
        <p>
          Look at the eval score for the same trace too: 0.5. The fallback
          answer is honest but only half-grounded. A timeout two layers down
          became a quality regression at the top, and the trace is the only
          artefact that connects the two.
        </p>
      </Section>

      <Section id="token-budgets" title="Token budgets are SLOs">
        <p>
          Switch to <em>Context bloat</em>. Someone raised retrieval from six
          chunks to thirty-two &ldquo;to improve recall.&rdquo; Input tokens
          quadruple, cost quadruples, latency doubles, and the root span
          carries a <code>budget.exceeded</code> event. The answer is
          identical.
        </p>
        <p>
          Tokens are the one resource an LLM pipeline spends on every request,
          so treat them like latency: a budget per route, a distribution, and
          a percentile you alert on. The averages lie here as they do
          everywhere. Play with the knobs below and watch the tail, not the
          middle.
        </p>
        <BudgetLab />
        <p>
          Two things usually surprise people. Retrieval is rarely the biggest
          slice for long conversations; <em>history</em> is, and it grows
          without anyone deciding it should. And trimming retrieval can&apos;t
          save a request whose history alone is over budget. Push history
          turns up with trimming on and the tail stays red. Budgets need a
          policy for every input, not just the one you thought of.
        </p>
        <p>
          Enforce the budget in code, record what you dropped as span events,
          and feed the standard <code>gen_ai.client.token.usage</code>{" "}
          histogram so the percentile is one query away:
        </p>
        <CodeBlock code={budgetSrc} file="budget.ts" />
      </Section>

      <Section id="sample-the-tail" title="Sample the tail">
        <p>
          A busy service can&apos;t afford to store every trace, so you sample.
          The default is <strong>head sampling</strong>: when a trace starts,
          hash its ID and keep, say, 10%. It&apos;s cheap and consistent across
          services, and it decides before anything interesting has happened.
        </p>
        <SamplingLab />
        <p>
          With head sampling at 10%, you keep 10% of everything, including
          about 10% of the errors, the slow requests, the budget blowouts and
          the hallucinations. The traces you&apos;ll actually open during an
          incident are exactly the ones you threw away. Raise the ratio and
          you pay to store thousands of boring successes to catch a few more.
        </p>
        <p>
          <strong>Tail sampling</strong> waits until the trace is complete,
          then decides. Keep everything with an error, everything slow,
          everything over budget, everything that failed an eval, plus a small
          random baseline for comparison. Switch the figure to tail: storage
          drops and every interesting trace survives. In practice this lives
          in the OpenTelemetry Collector:
        </p>
        <CodeBlock code={tailSamplingSrc} file="otel-collector.yaml" />
        <p>
          The rules only work because the LLM data is <em>on the spans</em>.
          You can&apos;t tail-sample on groundedness if groundedness lives in a
          spreadsheet. One operational catch: every span of a trace has to
          reach the same collector instance, so put a load balancer that
          routes by trace ID in front of a collector fleet.
        </p>
      </Section>

      <Section id="evals-are-telemetry" title="Evals are telemetry">
        <p>
          Offline evals, a golden set scored in CI, catch regressions you
          anticipated. Production catches the rest, and only if you score
          real traffic. Cheap checks like groundedness, format validity or
          refusal detection can run inline on every request. Expensive
          LLM-as-judge scores run on a sample, after the response has gone
          out.
        </p>
        <p>
          Either way, write the score onto a span. Then an eval score is just
          another attribute you can group, filter and alert on, and the most
          useful thing to group it by is the prompt version:
        </p>
        <EvalDrift />
        <p>
          At a 10% canary, the new prompt&apos;s drop in groundedness barely
          moves the global average. No alert fires; the regression reaches
          100% of traffic next week. Group by <code>app.prompt.version</code>{" "}
          and the canary line falls through the threshold within fifteen
          minutes of the deploy. Same data, one attribute. Put the version of
          everything (prompt, model, retrieval index) on the span.
        </p>
        <p>
          When the scoring runs later, in a queue or a batch job, start a new
          trace and <em>link</em> it to the original span, instead of pretending
          it&apos;s a child of a request that ended minutes ago. Backends render
          the link, so you can jump from a bad score straight to the request
          that earned it:
        </p>
        <CodeBlock code={evalLaterSrc} file="eval-later.ts" />
      </Section>

      <Section id="prompts-are-pii" title="Prompts are PII">
        <p>
          The fastest way to turn an observability project into a security
          incident is to record full prompts and completions by default.
          Prompts contain whatever users type: names, addresses, order
          numbers, the occasional password. Retrieved chunks contain your
          internal documents. Traces get copied into vendors, retained for
          months and read by people who&apos;d never be granted database
          access.
        </p>
        <p>
          So the pipeline here sets <code>recordInputs: false</code> and{" "}
          <code>recordOutputs: false</code>, and records the shape instead:
          token counts, chunk counts, scores, finish reasons, versions. That
          covers nearly every question you&apos;ll ask of a trace. When you do
          need content, capture it for a sampled slice, redact in the
          collector before it leaves your network, and give it a shorter
          retention than your metrics.
        </p>
        <p>
          The same goes for exceptions. The tool error in Fig.&nbsp;01 had a
          stack trace full of file paths; the route strips{" "}
          <code>exception.stacktrace</code> before returning spans to the
          browser. Know what your spans carry before you ship them anywhere.
        </p>
      </Section>

      <Section id="checklist" title="The checklist">
        <ul>
          <li>LLM calls export through OpenTelemetry, in the same traces as the rest of the request.</li>
          <li>The AI SDK integration emits <code>gen_ai.*</code> attributes; you don&apos;t hand-roll them.</li>
          <li>Every call has a <code>functionId</code>; every span has prompt, model and index versions.</li>
          <li>Alerts use span status across the trace, not HTTP status codes.</li>
          <li>Each route has a token budget, enforced in code and tracked at p95.</li>
          <li>Tail sampling keeps errors, slow, over-budget and failed-eval traces.</li>
          <li>Eval scores are span attributes; late evals link to their origin span.</li>
          <li>Prompt and completion capture is off by default and redacted when on.</li>
        </ul>
        <p>
          None of this is new. It&apos;s the observability playbook we already
          run for databases and queues, applied to the component that most
          needs it. Instrument the model like any other dependency and you get
          evidence to argue with, not vibes. For keeping the pipeline alive
          once you can see it failing, see{" "}
          <Link to="/journal/durable-agents-with-effect">E.01</Link>.
        </p>
      </Section>
    </>
  )
}
