import type { ChatMessage } from "./tools"

type Part = ChatMessage["parts"][number]
type PlotPart = Extract<Part, { type: "tool-plotMetric" }>

declare function Chart(props: {
  points: Array<{ t: string; v: number }>
  threshold?: number
  live: boolean
}): React.ReactNode
declare function ShipmentCard(props: {
  part: Extract<Part, { type: "tool-trackShipment" }>
}): React.ReactNode
declare function TriageCard(props: {
  part: Extract<Part, { type: "tool-triageIncident" }>
}): React.ReactNode

function PlotPart({ part }: { part: PlotPart }) {
  if (part.state === "output-error") return <p role="alert">{part.errorText}</p>

  const points = (part.input?.points ?? []).filter(
    (p): p is { t: string; v: number } =>
      typeof p?.t === "string" && typeof p.v === "number",
  )
  return (
    <Chart
      points={points}
      threshold={part.input?.threshold}
      live={part.state === "input-streaming"}
    />
  )
}

export function MessageView({ message }: { message: ChatMessage }) {
  return message.parts.map((part, i) => {
    switch (part.type) {
      case "text":
        return <p key={i}>{part.text}</p>
      case "tool-plotMetric":
        return <PlotPart key={part.toolCallId} part={part} />
      case "tool-trackShipment":
        return <ShipmentCard key={part.toolCallId} part={part} />
      case "tool-triageIncident":
        return <TriageCard key={part.toolCallId} part={part} />
      default:
        return null
    }
  })
}
