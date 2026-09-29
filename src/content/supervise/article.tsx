import { Link } from "@tanstack/react-router"
import { CodeBlock } from "@/components/journal/code-block"
import { Callout, Section } from "@/components/journal/article"
import type { TocItem } from "@/components/journal/article"
import { SupervisionTree } from "@/components/journal/supervise/supervision-tree"
import { IntensityLab } from "@/components/journal/supervise/intensity-lab"
import { TripwireLab } from "@/components/journal/supervise/tripwire-lab"
import supervisorSrc from "@/lib/supervise/supervisor.ts?raw"
import applicationSrc from "./application.ex?raw"
import researcherSrc from "./researcher.ex?raw"
import treeSrc from "./tree.ts?raw"
import tripwiresSrc from "./tripwires.ts?raw"
import workerSrc from "./worker.ts?raw"

export const toc: ReadonlyArray<TocItem> = [
  {
    id: "the-try-catch-that-ate-the-agent",
    title: "The try/catch that ate the agent",
  },
  { id: "what-let-it-crash-means", title: "What “let it crash” means" },
  { id: "agents-are-processes", title: "Agents are processes" },
  { id: "strategies", title: "Strategies encode dependencies" },
  { id: "a-supervisor-in-typescript", title: "A supervisor in TypeScript" },
  { id: "knowing-when-to-give-up", title: "Knowing when to give up" },
  { id: "crash-on-purpose", title: "Crash on purpose" },
  { id: "restart-to-where", title: "Restart to where?" },
  { id: "what-node-cant-do", title: "What Node can't do" },
  { id: "checklist", title: "The checklist" },
]

export function SuperviseArticle() {
  return (
    <>
      <Section
        id="the-try-catch-that-ate-the-agent"
        title="The try/catch that ate the agent"
      >
        <p>
          Every agent codebase I&apos;ve reviewed has the same function. It
          wraps a model call, a tool call and a memory update in one enormous{" "}
          <code>try</code>, and the <code>catch</code> logs a warning and
          carries on. It feels responsible. It is how most agents end up in
          states nobody designed.
        </p>
        <p>
          Consider what &ldquo;carries on&rdquo; means. The tool returned an
          HTML error page instead of JSON, the parse failed, the catch swallowed
          it, and the half-updated context went into the next model call. Now
          the model is reasoning about a 502 page. It calls the same tool again.
          And again. No exception, no alert, a growing bill, and a user watching
          a spinner.
        </p>
        <p>
          Telecom engineers hit this wall in the 1980s, with switches that had
          to stay up for years while running code with bugs in it. Their answer,
          built into Erlang and inherited by Elixir, sounds reckless and turns
          out to be the opposite: <strong>let it crash</strong>. This essay is
          about what that means precisely, and how much of it you can carry into
          a TypeScript agent stack today.
        </p>
        <Callout label="What runs here">
          <p>
            Every figure is driven by a small TypeScript port of OTP
            supervisors, running in your browser: three strategies, three
            restart types, restart intensity and escalation, with tests. The
            Elixir snippets are illustrative; they follow standard OTP idioms
            but aren&apos;t compiled on this site.
          </p>
        </Callout>
      </Section>

      <Section id="what-let-it-crash-means" title="What “let it crash” means">
        <p>
          It doesn&apos;t mean ignore errors. It means separate the code that
          does the work from the code that decides what to do when the work
          fails, and make the second kind small, generic and boring.
        </p>
        <p>
          A worker handles the cases it understands and <em>asserts</em>{" "}
          everything else. If the model&apos;s reply doesn&apos;t parse, the
          worker doesn&apos;t invent a recovery. It dies, and its state dies
          with it. A <strong>supervisor</strong>, whose only job is watching
          workers, notices and starts a fresh one from a known-good state. The
          corrupted context is gone because the process holding it is gone.
        </p>
        <p>
          The insight is statistical. Most production failures are transient: a
          rate limit, a dropped connection, a malformed reply, a bad
          interleaving. Retrying the exact same state often reproduces the
          problem. Restarting from clean state usually doesn&apos;t. Joe
          Armstrong&apos;s thesis on Erlang called this building reliable
          systems <em>in the presence of software errors</em>. Not by removing
          them, which nobody can, but by containing them.
        </p>
      </Section>

      <Section id="agents-are-processes" title="Agents are processes">
        <p>
          The mapping from OTP to agents is almost suspiciously clean. An Erlang{" "}
          <em>process</em> is a lightweight, isolated unit with its own state
          and a mailbox. It shares no memory with anyone. That&apos;s what an
          agent should be: a planner, a researcher and a tool runner, each
          owning its own context and talking through messages.
        </p>
        <p>
          Isolation is what makes crashing safe. If the researcher shares a
          mutable context object with the writer, killing the researcher leaves
          the writer holding whatever half-written state it had. If each agent
          owns its context and communicates by message, a crash takes out
          exactly one agent&apos;s state and nothing else. Most multi-agent
          frameworks get this wrong by default, with one big shared
          &ldquo;memory&rdquo; that every agent mutates.
        </p>
      </Section>

      <Section id="strategies" title="Strategies encode dependencies">
        <p>
          Supervisors form a tree. Each one watches its children and decides,
          when one dies, who else has to restart with it. That decision is the{" "}
          <strong>strategy</strong>, and it&apos;s really a declaration of which
          components depend on each other&apos;s state.
        </p>
        <SupervisionTree />
        <p>
          Crash <code>search</code>: only search restarts. Tools are
          independent, so the supervisor uses <code>:one_for_one</code>. Crash
          the <code>planner</code>: all three research agents restart, because
          the researcher and writer are executing a plan that no longer exists
          in anyone&apos;s memory. That&apos;s <code>:one_for_all</code>. Click
          the <code>app</code> strategy until it reads{" "}
          <code>:rest_for_one</code> and crash the session store: everything
          started <em>after</em> it restarts, because they all read from it,
          while nothing before it is touched.
        </p>
        <p>In Elixir, the whole tree is a few lines of configuration:</p>
        <CodeBlock code={applicationSrc} file="lib/agents/application.ex" />
        <p>
          The code sandbox is <code>:transient</code>: restarted if it crashes,
          left alone if it finishes normally. The other options are{" "}
          <code>:permanent</code>, always restart, and <code>:temporary</code>,
          never restart, which suits one-shot jobs whose failure the caller
          handles.
        </p>
      </Section>

      <Section
        id="a-supervisor-in-typescript"
        title="A supervisor in TypeScript"
      >
        <p>
          None of this requires the BEAM to be useful. The core of a supervisor
          is small enough to read in one sitting. This is the implementation
          behind every figure on this page:
        </p>
        <CodeBlock code={supervisorSrc} file="lib/supervise/supervisor.ts" />
        <p>
          A child is anything with an <code>id</code> and a{" "}
          <code>start(signal)</code> that returns a promise: resolve for a
          normal exit, reject for a crash. A supervisor is itself a child spec,
          so trees nest for free, and a supervisor that gives up simply rejects,
          which its parent sees as one more crash. Building the tree from the
          figure looks like the Elixir, minus the syntax:
        </p>
        <CodeBlock code={treeSrc} file="tree.ts" />
      </Section>

      <Section id="knowing-when-to-give-up" title="Knowing when to give up">
        <p>
          A supervisor that restarts forever is just a very fast infinite loop.
          OTP bounds it with <strong>restart intensity</strong>: at most{" "}
          <code>max_restarts</code> within <code>max_seconds</code>, by default
          three in five. Exceed it and the supervisor kills all its children,
          then dies, handing the problem to its own parent.
        </p>
        <IntensityLab />
        <p>
          The two failure modes look identical in a log line and behave nothing
          alike. <em>Flaky</em> is a rate limit: every so often a request fails,
          and a restart genuinely fixes it. The supervisor absorbs every crash
          and nobody notices. <em>Broken</em> is an expired API key: every
          restart crashes in 120&nbsp;milliseconds. Retrying can&apos;t help, so
          the supervisor stops trying, escalates, and within about a second the
          whole application is down.
        </p>
        <p>
          That&apos;s the correct outcome. The restart hierarchy tries
          progressively bigger resets, first the worker, then its subtree, then
          the application, and when none of them work, it fails loudly instead
          of burning tokens in a loop. Turn <code>max_restarts</code> up to ten
          in broken mode and watch how little it changes: a bug isn&apos;t fixed
          by patience.
        </p>
      </Section>

      <Section id="crash-on-purpose" title="Crash on purpose">
        <p>
          Here&apos;s the part that matters most for agents. Traditional
          programs crash on their own when something&apos;s wrong: a null
          dereference, a failed match. Agents mostly don&apos;t. A confused
          model doesn&apos;t throw; it keeps producing plausible tool calls. So
          the most important failures never become crashes, and supervision
          can&apos;t help with a failure it never sees.
        </p>
        <p>
          The fix is <strong>tripwires</strong>: cheap invariants that turn
          silent misbehaviour into a crash. Same tool call three times in a row.
          Step budget exhausted. Token budget exceeded. Output fails its schema.
          Below, a pricing tool returns an HTML error page exactly once, and the
          agent&apos;s context is poisoned by it.
        </p>
        <TripwireLab />
        <p>
          Without the tripwire, the agent loops on <em>compare prices</em> until
          the demo cuts it off, and not a single error is raised. With it, the
          third identical call crashes the agent, the supervisor restarts it
          from the last checkpoint with a clean context, and it finishes. The
          poisoned context didn&apos;t need to be repaired. It needed to be
          thrown away.
        </p>
        <p>
          With the AI SDK, tripwires fit in <code>prepareStep</code>, which runs
          before every step with the steps so far. Throwing there rejects the
          whole <code>generateText</code> call:
        </p>
        <CodeBlock code={tripwiresSrc} file="tripwires.ts" />
        <p>
          In Elixir the same instinct is idiomatic. Pattern matches <em>are</em>{" "}
          assertions: <code>{"{:ok, reply} ="}</code> crashes on anything but
          success, and <code>Jason.decode!</code> crashes on malformed JSON.
          There&apos;s no recovery code to write, because the supervisor is the
          recovery code.
        </p>
        <CodeBlock code={researcherSrc} file="lib/agents/researcher.ex" />
      </Section>

      <Section id="restart-to-where" title="Restart to where?">
        <p>
          A restart wipes memory. That&apos;s the feature, and also the catch:
          anything the agent must not lose has to live outside it. Toggle
          checkpoints off in Fig.&nbsp;03 and the restarted agent searches
          flights and hotels all over again, paying for both twice.
        </p>
        <p>
          The rule is to{" "}
          <strong>
            checkpoint the last known-good state, not the latest state
          </strong>
          . Save after a step succeeds and its output validates, never mid-step.
          Then <code>init</code> is just &ldquo;load the checkpoint,&rdquo; and
          it has to be fast and idempotent, because it will run far more often
          than you expect:
        </p>
        <CodeBlock code={workerSrc} file="researcher.ts" />
        <p>
          That&apos;s the same step journal as{" "}
          <Link to="/journal/durable-agents-with-effect">E.01</Link>, seen from
          the other side. Durable steps make restarts cheap; supervisors make
          restarts happen. Either one alone leaves a gap.
        </p>
      </Section>

      <Section id="what-node-cant-do" title="What Node can't do">
        <p>
          Honesty matters here, because the port is not the platform. The BEAM
          schedules processes preemptively, so one runaway process can&apos;t
          starve the rest. Every process has its own heap and garbage collector.
          And a supervisor can kill any process at any moment, unconditionally.
        </p>
        <p>
          JavaScript can&apos;t do the last one. The TypeScript supervisor stops
          a child by aborting its signal, which is <em>cooperative</em>: a child
          that ignores the signal, or blocks the event loop in a synchronous
          loop, can&apos;t be stopped from inside the process. For agents
          that&apos;s mostly fine, because they spend their lives awaiting
          network calls, and every await is a checkpoint for the signal. For
          untrusted or CPU-heavy work, such as a code sandbox, put it in a
          worker thread or a separate process that can be terminated for real.
        </p>
        <p>
          If your agents are the core of the product, with many long-lived
          sessions, many concurrent tool calls and a requirement to stay up
          through anything, that&apos;s an argument for running them on the BEAM
          itself. If they&apos;re one feature in a TypeScript app, the ideas
          travel fine: isolation, a supervisor, strategies, intensity,
          tripwires, checkpoints.
        </p>
      </Section>

      <Section id="checklist" title="The checklist">
        <ul>
          <li>Workers assert and crash; they don&apos;t improvise recovery.</li>
          <li>Each agent owns its context. Nothing mutable is shared.</li>
          <li>
            A supervisor restarts workers; its strategy mirrors real
            dependencies.
          </li>
          <li>Restart intensity is bounded, and giving up escalates loudly.</li>
          <li>
            Tripwires turn loops, runaway steps and bad output into crashes.
          </li>
          <li>
            Checkpoints hold the last known-good state; init just loads one.
          </li>
          <li>
            Anything that can hang for real runs where it can be killed for
            real.
          </li>
        </ul>
        <p>
          The model will make mistakes you can&apos;t predict, on inputs you
          can&apos;t enumerate. You can&apos;t prevent that with defensive code.
          You can make sure each mistake costs one restart instead of one
          customer. Let it crash, and design for what happens next.
        </p>
      </Section>
    </>
  )
}
