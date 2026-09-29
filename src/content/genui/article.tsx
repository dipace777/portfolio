import { Link } from "@tanstack/react-router"
import { CodeBlock } from "@/components/journal/code-block"
import { Callout, Section } from "@/components/journal/article"
import type { TocItem } from "@/components/journal/article"
import { GenUIChat } from "@/components/journal/genui/genui-chat"
import { StreamInspector } from "@/components/journal/genui/stream-inspector"
import { BriefingDemo } from "@/components/journal/genui/briefing-demo"
import routeSrc from "@/routes/api/genui.ts?raw"
import chatSrc from "@/lib/genui/chat.ts?raw"
import briefingFnSrc from "@/lib/genui/briefing.ts?raw"
import briefingStreamSrc from "@/lib/genui/briefing-stream.ts?raw"
import toolsSrc from "./tools.ts?raw"
import viewSrc from "./message-view.tsx?raw"
import persistSrc from "./persist.ts?raw"

export const toc: ReadonlyArray<TocItem> = [
  { id: "stop-streaming-paragraphs", title: "Stop streaming paragraphs" },
  { id: "tools-are-props", title: "Tools are props" },
  { id: "one-route-one-stream", title: "One route, one stream" },
  { id: "on-the-wire", title: "What's on the wire" },
  { id: "render-while-it-types", title: "Render while it types" },
  { id: "tools-that-report-back", title: "Tools that report back" },
  { id: "not-everything-is-chat", title: "Not everything is a chat" },
  { id: "survive-a-refresh", title: "Survive a refresh" },
  { id: "production-notes", title: "Production notes" },
  { id: "checklist", title: "The checklist" },
]

const playground = [
  { label: "Track a shipment", text: "Where is shipment NP-4471?" },
  { label: "Plot latency", text: "Plot p95 latency for checkout today" },
  { label: "Triage an alert", text: "Triage the failed logins alert" },
]

export function GenUIArticle() {
  return (
    <>
      <Section id="stop-streaming-paragraphs" title="Stop streaming paragraphs">
        <p>
          Most AI features ship as a text box that streams a wall of markdown.
          Ask where your parcel is and you get three paragraphs describing a
          parcel. The app that asked already has a map, a progress bar and a
          timeline component. The model just can&apos;t reach them.
        </p>
        <p>
          <strong>Generative UI</strong> flips that. The model doesn&apos;t
          write the interface; it picks one of <em>your</em> components and
          fills in its props. Stream those props as they&apos;re produced and
          the component starts rendering while the model is still thinking: a
          chart whose line draws itself as the numbers are written, a card that
          appears the moment the model names the tool.
        </p>
        <p>
          Try it. Everything below is the real pipeline: a TanStack Start server
          route, the AI SDK streaming protocol, <code>useChat</code>, and
          components that switch on typed message parts.
        </p>
        <GenUIChat
          label="Fig. 01"
          title="Components, not paragraphs"
          hint="Pick a prompt"
          prompts={playground}
        />
        <Callout label="What's scripted">
          <p>
            The model behind these figures is a deterministic stand-in that
            speaks the exact AI SDK <code>LanguageModelV4</code> protocol: the
            same stream parts, the same timing shape, zero API cost. The route,
            the validation, the tool execution, the streaming and the rendering
            are all real. Swap one import for <code>anthropic(…)</code> or{" "}
            <code>openai(…)</code> and nothing else changes. Snippets are
            type-checked against <code>ai@7</code> and{" "}
            <code>@tanstack/react-start@1.168</code>.
          </p>
        </Callout>
      </Section>

      <Section id="tools-are-props" title="Tools are props">
        <p>
          The whole trick is one reframing: <strong>a tool&apos;s input schema
          is a component&apos;s props</strong>. When the model &ldquo;calls{" "}
          <code>plotMetric</code>&rdquo;, it&apos;s really saying &ldquo;render
          the chart, with these points.&rdquo; The zod schema is the contract
          between a probabilistic writer and a deterministic renderer.
        </p>
        <CodeBlock code={toolsSrc} file="lib/tools.ts" />
        <p>
          Three kinds of tool fall out of this. <code>trackShipment</code> does
          work on the server and the UI renders its <em>output</em>.{" "}
          <code>plotMetric</code> is the opposite: all the interesting data is
          in the <em>input</em> the model writes, and execute barely matters.{" "}
          <code>triageIncident</code> is an async generator that reports
          progress while it runs. Each needs a different rendering strategy, and
          we&apos;ll take them one at a time.
        </p>
        <p>
          The last line matters most. <code>InferUITools</code> turns the tool
          map into a message type where every part is a discriminated union
          over <code>tool-plotMetric</code>, <code>tool-trackShipment</code> and
          so on, each carrying its own input and output types. Change a schema
          and the compiler shows you every component that needs updating.
        </p>
      </Section>

      <Section id="one-route-one-stream" title="One route, one stream">
        <p>
          On TanStack Start the endpoint is a server route: a file under{" "}
          <code>routes/</code> with a <code>server.handlers</code> block. No
          separate API server, no framework adapter. This is the actual file
          serving every figure on this page:
        </p>
        <CodeBlock code={routeSrc} file="routes/api/genui.ts" />
        <CodeBlock code={chatSrc} file="lib/genui/chat.ts" />
        <p>
          Four lines do most of the work. <code>safeValidateUIMessages</code>{" "}
          checks the history against the tool schemas, because a chat endpoint
          accepts the entire conversation from the client and the client is
          hostile. <code>convertToModelMessages</code> turns UI parts back into
          the provider&apos;s format. <code>stopWhen: isStepCount(3)</code>{" "}
          lets the model call a tool, read the result and write a summary,
          instead of stopping at the call. And{" "}
          <code>abortSignal: request.signal</code> means that when the user
          hits Stop, the socket closes and generation stops too, along with the
          bill.
        </p>
      </Section>

      <Section id="on-the-wire" title="What's on the wire">
        <p>
          <code>toUIMessageStreamResponse()</code> returns server-sent events:
          one small JSON chunk per line. It&apos;s worth seeing the raw thing
          once, because every rendering decision you make later is a decision
          about these chunks.
        </p>
        <StreamInspector />
        <p>
          Text arrives as <code>text-delta</code>. A tool call arrives as{" "}
          <code>tool-input-start</code>, a run of{" "}
          <code>tool-input-delta</code> chunks carrying fragments of JSON,{" "}
          <code>tool-input-available</code> once the input parses and
          validates, then <code>tool-output-available</code> after execute
          resolves. The second <code>start-step</code> is the model coming back
          to summarise.
        </p>
        <p>
          <code>useChat</code> folds that chunk stream into message parts, and
          each tool part walks a small state machine:{" "}
          <code>input-streaming</code> → <code>input-available</code> →{" "}
          <code>output-available</code>, or <code>output-error</code>. That
          state is your render switch. You never parse SSE by hand; it&apos;s
          only visible here so you can see where the time goes.
        </p>
      </Section>

      <Section id="render-while-it-types" title="Render while it types">
        <p>
          Look at the inspector again with <em>plot latency</em> selected.
          Almost the whole response is <code>tool-input-delta</code>. Generating
          twenty-four data points is the slow part, and the tool call
          doesn&apos;t exist until the last brace. If you render only on{" "}
          <code>output-available</code>, the user stares at a spinner for the
          entire generation.
        </p>
        <p>
          During <code>input-streaming</code>, the AI SDK repairs the partial
          JSON on every delta and hands you a <em>deep-partial</em>{" "}
          <code>input</code>. So render it. The left pane below is the chart;
          the right pane is <code>part.input</code> exactly as the component
          receives it.
        </p>
        <GenUIChat
          label="Fig. 03"
          title="Partial JSON, live"
          hint="Watch part.input fill in"
          prompts={[{ label: "Plot p95 latency", text: "Plot p95 latency for checkout today" }]}
          raw
        />
        <p>
          Deep-partial means <em>anything</em> can be missing, including half
          of the last array element. <code>{"{ t: \"14:00\" }"}</code> without
          its <code>v</code> is a perfectly valid moment in the stream. The
          renderer has to filter what&apos;s incomplete, not trust it:
        </p>
        <CodeBlock code={viewSrc} file="components/message-view.tsx" />
        <p>
          Two more rules make partial rendering feel intentional rather than
          glitchy. Keep layout stable: the chart above reserves its axes up
          front, so new points extend a line instead of reflowing the page. And
          never fire side effects from partial input. It&apos;s a preview of
          what the model <em>might</em> commit to, not a command.
        </p>
      </Section>

      <Section id="tools-that-report-back" title="Tools that report back">
        <p>
          <code>plotMetric</code> is slow in the input. Incident triage is slow
          in the <em>execute</em>: scan two million events, correlate, decide.
          A plain async execute leaves the UI with nothing to show until the
          very end.
        </p>
        <p>
          Make execute an <strong>async generator</strong> instead. Every{" "}
          <code>yield</code> is sent as a <em>preliminary</em> output, so the
          same component renders live progress, and the model only ever sees
          the final value.
        </p>
        <GenUIChat
          label="Fig. 04"
          title="Preliminary outputs"
          hint="A generator tool, streaming progress"
          prompts={[{ label: "Triage the alert", text: "Triage the failed logins alert" }]}
        />
        <Callout label="The gotcha">
          <p>
            The final output of a generator tool is its last <code>yield</code>
            , not its <code>return</code> value. I wrote{" "}
            <code>return verdict</code> first; the model received the
            &ldquo;correlating&rdquo; snapshot and summarised an investigation
            that never finished. A test caught it. Yield the final value.
          </p>
        </Callout>
        <p>
          On the client, <code>part.preliminary</code> tells you whether
          you&apos;re looking at a snapshot or the answer. The figure uses it
          for the pulsing <em>live</em> badge. Keep the snapshots
          self-contained, with the full list of findings so far rather than
          only the newest one. Then any single snapshot renders correctly on
          its own, and a dropped chunk costs nothing.
        </p>
      </Section>

      <Section id="not-everything-is-chat" title="Not everything is a chat">
        <p>
          A chat thread is one shape of generative UI. The more common shape in
          real products is a page that fills itself in: a dashboard, a report,
          a morning briefing. No transcript, no input box, just components
          arriving.
        </p>
        <p>
          TanStack Start server functions can be async generators. Pair that
          with <code>Output.array</code>, which validates each element against
          a schema and emits it the moment it&apos;s complete, and you get a
          typed stream of objects with no route, no SSE parsing and no chat
          state:
        </p>
        <CodeBlock code={briefingStreamSrc} file="lib/genui/briefing-stream.ts" />
        <CodeBlock code={briefingFnSrc} file="lib/genui/briefing.ts" />
        <BriefingDemo />
        <p>
          On the client that&apos;s <code>for await (const card of await
          streamBriefing())</code>. Each <code>card</code> is typed as{" "}
          <code>BriefingCard</code>, inferred from the zod schema through the
          server function boundary. Unlike partial input, elements arrive
          whole, so each card animates in once, fully formed. Choose this when
          the unit of UI is a list item; choose tool input streaming when the
          unit is a single rich component.
        </p>
      </Section>

      <Section id="survive-a-refresh" title="Survive a refresh">
        <p>
          Here&apos;s what TanStack Start gives you that a client-only chat
          can&apos;t. A finished generative UI is just data: an array of
          messages whose tool parts are in <code>output-available</code>.
          Persist it, load it in a route loader, and the <em>same</em>{" "}
          components render on the server. A shared link to a conversation
          arrives as HTML with the charts already drawn, before any JavaScript
          runs.
        </p>
        <CodeBlock code={persistSrc} file="lib/thread.ts" />
        <p>
          <code>originalMessages</code> plus <code>onEnd</code> hands you the
          full, updated conversation when the stream closes. Save it there, not
          on the client, which can close the tab mid-stream.
        </p>
        <p>
          Loading has a sharp edge. Return <code>Array&lt;UIMessage&gt;</code>{" "}
          straight from a server function and Start&apos;s serialization check
          rejects it: dynamic tool parts carry an <code>unknown</code> input,
          and <code>unknown</code> can&apos;t be proven serializable. The
          compiler is right to be suspicious. Stored messages are old input
          from a client you don&apos;t trust, written against schemas that may
          have changed since. So validate them against today&apos;s tools on
          the server, cross the boundary as a string, and hand the result to{" "}
          <code>useChat({"{ messages }"})</code>.
        </p>
      </Section>

      <Section id="production-notes" title="Production notes">
        <p>
          <strong>The component set is an allowlist.</strong> Never let the
          model emit markup, JSX or component names you look up dynamically.
          It picks from the tools you registered, and a <code>default:</code>{" "}
          branch renders nothing. That&apos;s the difference between generative
          UI and an injection vector.
        </p>
        <p>
          <strong>Cap everything the client sends.</strong> The route above
          rejects bodies over 32&nbsp;KB and sends only the last twelve
          messages to the model. A public chat endpoint without limits is a
          free, unmetered proxy to your API key.
        </p>
        <p>
          <strong>Throttle re-renders.</strong> A fast model can emit a hundred
          deltas a second, and each one re-renders the thread. Pass{" "}
          <code>throttle</code> (in milliseconds) to <code>useChat</code> and memoise
          finished messages so only the streaming one updates.
        </p>
        <p>
          <strong>Design the error state.</strong> <code>output-error</code> is
          a first-class part state, not an exception. Render it inside the
          component&apos;s frame, and use <code>onError</code> on the stream
          response to turn stack traces into something safe to show.
        </p>
        <p>
          <strong>Announce politely.</strong> Put the thread in an{" "}
          <code>aria-live=&quot;polite&quot;</code> region, and label the
          streaming state rather than announcing each token. A screen reader
          reading every delta aloud is unusable.
        </p>
        <p>
          <strong>Mind the clock.</strong> Serverless functions have duration
          limits, and a three-step tool run can outlive them. For work longer
          than a request, make the agent durable (see{" "}
          <Link to="/journal/durable-agents-with-effect">E.01</Link>) and stream
          its progress instead.
        </p>
      </Section>

      <Section id="checklist" title="The checklist">
        <ul>
          <li>Every tool&apos;s input schema is designed as component props.</li>
          <li>The message type comes from <code>InferUITools</code>, not hand-written.</li>
          <li>Incoming messages are validated, size-capped and truncated.</li>
          <li><code>request.signal</code> is passed to <code>streamText</code>.</li>
          <li>Components render <code>input-streaming</code> and filter partial items.</li>
          <li>Slow tools are generators that yield their final value.</li>
          <li>List-shaped UIs use <code>Output.array</code> through a server function.</li>
          <li>Finished threads are saved in <code>onEnd</code> and render on the server.</li>
          <li>Unknown parts render nothing. The model never writes markup.</li>
        </ul>
        <p>
          The model is good at choosing and filling in. Your components are
          good at being fast, accessible and on-brand. Generative UI works when
          each side does only its own job, and the stream in between is
          typed.
        </p>
      </Section>
    </>
  )
}
