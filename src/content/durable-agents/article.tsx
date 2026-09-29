import { CodeBlock } from "@/components/journal/code-block"
import { Callout, Section } from "@/components/journal/article"
import type { TocItem } from "@/components/journal/article"
import { CompoundOdds } from "@/components/journal/demos/compound-odds"
import { BackoffLab } from "@/components/journal/demos/backoff-lab"
import { FailureLab } from "@/components/journal/demos/failure-lab"
import { CrashLab } from "@/components/journal/demos/crash-lab"
import errorsSrc from "./errors.ts?raw"
import retrySrc from "./retry.ts?raw"
import resilientSrc from "./resilient.ts?raw"
import journalSrc from "./journal.ts?raw"
import agentSrc from "./agent.ts?raw"

export const toc: ReadonlyArray<TocItem> = [
  { id: "the-demo-worked", title: "The demo worked" },
  { id: "failure-is-the-weather", title: "Failure is the weather" },
  { id: "name-every-failure", title: "Name every failure" },
  { id: "retry-with-intent", title: "Retry with intent" },
  { id: "time-is-a-budget", title: "Time is a budget" },
  { id: "plan-b", title: "Always have a plan B" },
  { id: "survive-the-crash", title: "Survive the crash" },
  { id: "exactly-once", title: "Exactly-once is a lie" },
  { id: "see-everything", title: "See everything" },
  { id: "checklist", title: "The checklist" },
]

export function DurableAgentsArticle() {
  return (
    <>
      <Section id="the-demo-worked" title="The demo worked">
        <p>
          It always does. You wire a model to three tools, ask it a question,
          and it plans, searches, drafts and posts a tidy summary to Slack. Then
          you ship it, and the agent meets the real world: rate limits at 9
          a.m., a provider incident at lunch, a deploy that kills the pod
          halfway through a twelve-minute run, and a model that decides today is
          the day it returns JSON with a trailing comma.
        </p>
        <p>
          None of these are bugs in your prompt. They&apos;re distributed
          systems problems wearing an AI costume. An agent is a long-running,
          multi-step program whose every step talks to something slow, expensive
          and unreliable. We&apos;ve known how to build those for decades. We
          just keep forgetting when the word <em>agent</em> is involved.
        </p>
        <p>
          This essay builds a durable agent with <strong>Effect v4</strong> from
          the ground up: typed failures, retry policies that respect the
          provider, timeouts that actually cancel work, fallbacks, and a step
          journal that lets a run survive a crash without re-billing a single
          token. Every figure runs real Effect code in your browser.
        </p>
        <Callout label="Version note">
          <p>
            Effect v4 is a release candidate at the time of writing. Every
            snippet here is type-checked against <code>effect@4.0.0-rc</code>.
            On v3 the ideas map one-to-one, but a few names differ:{" "}
            <code>Context.Service</code> was <code>Context.Tag</code>, and{" "}
            <code>Effect.catch</code> was <code>Effect.catchAll</code>.
          </p>
        </Callout>
      </Section>

      <Section id="failure-is-the-weather" title="Failure is the weather">
        <p>
          Start with arithmetic. If each call in a run succeeds 99% of the time,
          a single call looks fine. But a research agent doesn&apos;t make a
          single call. It plans, calls tools, reads results, re-plans, drafts,
          critiques and revises. Forty calls is a modest run.
        </p>
        <CompoundOdds />
        <p>
          At 99% per call and forty calls, a third of your runs fail somewhere.
          A better model doesn&apos;t fix this, because the failures live in the
          plumbing. What fixes it is making each failure{" "}
          <strong>recoverable</strong>, so a transient blip costs a few hundred
          milliseconds instead of the whole run.
        </p>
        <p>In production, the weather comes in five kinds:</p>
        <ul>
          <li>
            <strong>Rate limits.</strong> A <code>429</code> with a{" "}
            <code>retry-after</code> header you should respect.
          </li>
          <li>
            <strong>Hangs.</strong> A stream that stops sending bytes but never
            closes. No error, just silence.
          </li>
          <li>
            <strong>Outages.</strong> The provider&apos;s status page turns
            orange, and every retry adds to the pile.
          </li>
          <li>
            <strong>Bad output.</strong> Valid HTTP, invalid shape: truncated
            JSON, a missing field, a hallucinated enum.
          </li>
          <li>
            <strong>Crashes.</strong> Your own process dies from a deploy, an
            OOM kill or a reclaimed spot instance, and the run&apos;s in-memory
            state dies with it.
          </li>
        </ul>
        <p>
          The first four are about a single call. The fifth is about the whole
          run, and it&apos;s the one most agent frameworks quietly ignore.
        </p>
      </Section>

      <Section id="name-every-failure" title="Name every failure">
        <p>
          The trouble with <code>try/catch</code> is that <code>catch (e)</code>{" "}
          hands you <code>unknown</code>. You can&apos;t write a sensible
          recovery policy for an error you can&apos;t name, so most code does
          the only safe thing: log it and rethrow.
        </p>
        <p>
          Effect puts failures in the type. An{" "}
          <code>Effect&lt;A, E, R&gt;</code> succeeds with an <code>A</code>,
          can fail with an <code>E</code>, and needs services <code>R</code>.
          Model each failure as a tagged class and the compiler knows every way
          a call can go wrong.
        </p>
        <CodeBlock file="errors.ts" code={errorsSrc} />
        <p>A few things worth noticing:</p>
        <ul>
          <li>
            <code>Effect.fn(&quot;llm.complete&quot;)</code> gives the function
            a name, a tracing span and a stack frame that points at your code,
            not the runtime&apos;s.
          </li>
          <li>
            <code>tryPromise</code> hands you an <code>AbortSignal</code>. When
            the effect is interrupted, by a timeout or a crash, the signal fires
            and <code>fetch</code> actually cancels. Hold onto that; it matters
            in a minute.
          </li>
          <li>
            The body is decoded with <code>Schema</code>. A 200 with the wrong
            shape becomes a <code>MalformedOutput</code> right here, not a{" "}
            <code>TypeError</code> three functions later.
          </li>
          <li>
            <code>yield* new RateLimited(...)</code> fails the effect. Tagged
            errors are yieldable, so failing reads like returning.
          </li>
        </ul>
        <p>
          Hover <code>makeProvider</code> in your editor and the type tells the
          whole story:{" "}
          <code>
            Effect&lt;Completion, ProviderDown | RateLimited |
            MalformedOutput&gt;
          </code>
          . Now we can write a policy.
        </p>
      </Section>

      <Section id="retry-with-intent" title="Retry with intent">
        <p>
          Retrying is easy. Retrying <em>well</em> means answering three
          questions: which failures, how long to wait, and when to give up.
        </p>
        <p>
          <strong>Which failures.</strong> Rate limits, timeouts and malformed
          output are transient: the next attempt has a real chance. An outage
          usually isn&apos;t. A provider in the middle of an incident rarely
          recovers in the next two seconds, and your retries slow its recovery.
          So <code>ProviderDown</code> isn&apos;t retried at all; it goes
          straight to the fallback.
        </p>
        <p>
          <strong>How long.</strong> Exponential backoff, doubling from 250 ms
          and capped at 8 seconds. When the provider sends{" "}
          <code>retry-after</code>, wait at least that long.{" "}
          <code>Schedule.modifyDelay</code> sees the error that triggered each
          retry, so the policy can read the header straight off it.
        </p>
        <p>
          <strong>When to give up.</strong> <code>Schedule.max</code> combines
          the backoff with <code>Schedule.recurs(4)</code> and continues only
          while both want to. Four retries, then the error moves on.
        </p>
        <CodeBlock file="retry.ts" code={retrySrc} />
        <p>
          Then there&apos;s jitter. It looks like a detail until you watch what
          happens without it. When a provider blips, every client fails in the
          same instant. With pure exponential backoff, every client also retries
          in the same instant, and again, and again: a synchronized stampede
          that lands on the provider exactly as it&apos;s trying to recover.
          Turn jitter off below and watch the load bars.
        </p>
        <BackoffLab />
        <p>
          <code>Schedule.jittered</code> scales each delay by a random factor
          between 0.8 and 1.2. It&apos;s a small nudge, but it turns a wall of
          simultaneous requests into a spread-out trickle.
        </p>
      </Section>

      <Section id="time-is-a-budget" title="Time is a budget">
        <p>
          A hang is the worst failure because it isn&apos;t one. There&apos;s no
          error to catch and no log line, just a promise that never settles. The
          agent holds a connection, a worker slot and the user&apos;s patience,
          forever.
        </p>
        <p>
          Every call needs a deadline. <code>Effect.timeout</code> fails with a{" "}
          <code>TimeoutError</code> when a call runs long, but the important
          part is what happens to the call itself: Effect{" "}
          <strong>interrupts</strong> it. Interruption runs finalizers and fires
          the <code>AbortSignal</code> we passed to <code>fetch</code>, so the
          socket closes and the provider stops generating tokens you&apos;d be
          billed for. <code>Promise.race</code> can&apos;t do that. It stops
          waiting, but the request keeps running in the background.
        </p>
        <Callout label="Deadlines nest">
          <p>
            Put the timeout <em>inside</em> the retry, and each attempt gets its
            own 20 seconds. Put it outside, and the whole retry sequence shares
            one deadline. You usually want both: a per-attempt timeout on the
            call, and an overall budget on the step.
          </p>
        </Callout>
      </Section>

      <Section id="plan-b" title="Always have a plan B">
        <p>Here&apos;s the whole call, composed:</p>
        <CodeBlock file="resilient.ts" code={resilientSrc} />
        <p>
          Read it top to bottom as a policy: try the primary with a deadline,
          retry what&apos;s retryable, and if it still fails, for any reason,
          ask the fallback. The span wraps it all, so every attempt shows up in
          one trace.
        </p>
        <p>
          Now break it. The figure below runs this exact pipeline against two
          fake providers whose failures you choose. Time is compressed so you
          don&apos;t sit through twenty-second timeouts: the deadline is 1.2
          seconds here.
        </p>
        <FailureLab />
        <p>
          Try the hang with <code>await fetch</code>. Nothing happens, and
          nothing ever will, because the naive version has no concept of{" "}
          <em>too slow</em>. Switch to the Effect pipeline and the attempt is
          cut at the deadline, interrupted and retried. The outage skips retries
          entirely and goes straight to the fallback.
        </p>
      </Section>

      <Section id="survive-the-crash" title="Survive the crash">
        <p>
          Everything so far protects a single call. But the expensive failure in
          agent systems isn&apos;t a failed call; it&apos;s a failed run. Twelve
          minutes in, forty cents of tokens spent, the pod is evicted for a
          deploy. A naive agent keeps its progress in memory, so it starts over:
          it re-plans, re-searches, re-drafts and re-bills.
        </p>
        <p>
          The fix is the idea behind Temporal, Restate and every workflow
          engine: <strong>journal each step&apos;s result</strong> to durable
          storage, and on restart, replay the journal instead of redoing the
          work. Completed steps return their saved result instantly, and the run
          picks up exactly where it died.
        </p>
        <p>
          You don&apos;t need a workflow engine to get the core of this. In
          Effect it&apos;s one service and a helper:
        </p>
        <CodeBlock file="journal.ts" code={journalSrc} />
        <p>
          <code>step</code> checks the journal first. If a result exists, it
          returns it without running anything; otherwise it runs the effect and
          saves the result. <code>Journal</code> is a service, so storage is
          swappable: Redis here, Postgres in production, a <code>Map</code> in
          tests. The agent never knows.
        </p>
        <p>Here&apos;s the agent, written as if nothing could go wrong:</p>
        <CodeBlock file="agent.ts" code={agentSrc} />
        <p>
          That&apos;s the payoff of pushing reliability to the edges. The agent
          reads like a straight line: plan, search, draft, publish. Retries,
          timeouts and fallbacks live in <code>complete</code>; durability lives
          in <code>step</code>. The same <code>runId</code> on restart means the
          same journal keys, so a restarted run replays instead of redoing.
        </p>
        <CrashLab />
        <p>
          Run it, crash it during <code>draft</code>, and resume.{" "}
          <code>plan</code> and <code>search</code> replay in zero milliseconds
          for zero tokens. Now turn the journal off and do the same thing: every
          token is billed twice.
        </p>
        <Callout label="The one rule of replay">
          <p>
            Code <em>between</em> steps must be deterministic. A{" "}
            <code>Date.now()</code> or <code>Math.random()</code> outside a step
            can send a replay down a different path than the original run. If
            it&apos;s nondeterministic, make it a step.
          </p>
          <p>
            And encode journal values with a <code>Schema</code> in production,
            so a deploy that changes a step&apos;s output shape fails loudly
            instead of replaying garbage.
          </p>
        </Callout>
      </Section>

      <Section id="exactly-once" title="Exactly-once is a lie">
        <p>
          Now the nasty one. Turn the journal back on, switch off the
          idempotency key, and crash during <code>publish</code>.
        </p>
        <p>
          The Slack message goes out twice, journal and all. Look at the order
          of operations inside <code>step</code>: run the effect, <em>then</em>{" "}
          save the result. If the process dies between the side effect and the
          save, the journal has no record of it, so on resume the step runs
          again. No amount of journaling closes that gap. The side effect and
          the journal write happen in two different systems, and no transaction
          spans both.
        </p>
        <p>
          You can&apos;t get exactly-once <em>execution</em>. You can get
          exactly-once <em>effect</em>: at-least-once delivery plus an
          idempotent receiver. That&apos;s what the idempotency key is.
          It&apos;s derived from the run and the step (
          <code>run_7f3a:publish</code>), so it&apos;s identical on every retry
          and every resume. The receiver remembers keys it has seen and drops
          duplicates. Payment APIs have worked this way for years; for tools
          that don&apos;t accept a key, put a dedupe table in front of them.
        </p>
        <Callout label="Rule of thumb">
          <p>
            Anything a step does that the outside world can see (sending,
            charging, writing, deleting) needs a key derived from{" "}
            <code>runId</code> and the step name. Reads and LLM calls
            don&apos;t; the journal already makes them cheap to replay.
          </p>
        </Callout>
      </Section>

      <Section id="see-everything" title="See everything">
        <p>
          Durability without visibility is a black box that happens to be
          reliable. Because <code>Effect.fn</code>, <code>withSpan</code> and{" "}
          <code>step</code> all open spans, every run produces a trace for free:{" "}
          <code>agent.research</code> → <code>step.draft</code> →{" "}
          <code>llm.resilient</code> → <code>llm.complete</code> ×3, with each
          retry, timeout and fallback visible as its own child span.
        </p>
        <p>
          Plug in an OpenTelemetry exporter and those spans land in Honeycomb,
          Grafana or Datadog next to the rest of your stack. When a run takes
          four minutes instead of one, you&apos;ll see that it was the third
          attempt at <code>draft</code>, against the fallback, after a rate
          limit. That&apos;s its own essay, and it&apos;s next.
        </p>
      </Section>

      <Section id="checklist" title="The checklist">
        <ol>
          <li>
            Model every failure as a tagged error. If you can&apos;t name it,
            you can&apos;t recover from it.
          </li>
          <li>
            Retry only transient failures, with capped, jittered, exponential
            backoff that honors <code>retry-after</code>.
          </li>
          <li>
            Give every call a deadline, and make sure the timeout cancels the
            work, not just the wait.
          </li>
          <li>
            Fall back to a second provider during an outage instead of hammering
            the first one.
          </li>
          <li>
            Journal every step so a crashed run resumes instead of restarting.
          </li>
          <li>Keep the code between steps deterministic.</li>
          <li>
            Give every externally visible side effect an idempotency key derived
            from the run and the step.
          </li>
          <li>
            Trace all of it, so when something does go wrong you can see which
            step, which attempt and why.
          </li>
        </ol>
        <p>
          None of this is exotic. It&apos;s the unglamorous engineering that
          separates a demo from a system, and with Effect it&apos;s a few dozen
          lines at the edges while your agent&apos;s logic stays a straight
          line. Build it once and your agent stops dying silently. It retries,
          falls back, waits, resumes, and tells you exactly what it did.
        </p>
      </Section>
    </>
  )
}
