import { useState } from "react"
import { highlight } from "sugar-high"
import { Check, Copy } from "lucide-react"

export function CodeBlock({
  code,
  file,
  caption,
}: {
  code: string
  file?: string
  caption?: string
}) {
  const source = code.trim()
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(source)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  return (
    <figure className="code-block my-10 overflow-hidden rounded-xl border border-bone/10 bg-[#0b0c0e]">
      <div className="flex items-center justify-between border-b border-bone/10 px-4 py-2.5">
        <div className="flex items-center gap-3">
          <span aria-hidden className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-bone/15" />
            <span className="size-2.5 rounded-full bg-bone/15" />
            <span className="size-2.5 rounded-full bg-ember/60" />
          </span>
          {file && (
            <span className="font-mono text-[11px] tracking-wider text-bone/50">
              {file}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={copy}
          aria-label={copied ? "Copied" : "Copy code"}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-[10px] tracking-[0.2em] text-bone/45 uppercase transition-colors hover:bg-bone/5 hover:text-bone"
        >
          {copied ? (
            <Check className="size-3.5 text-ember" />
          ) : (
            <Copy className="size-3.5" />
          )}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto px-5 py-5 font-mono text-[13px] leading-[1.7]">
        <code dangerouslySetInnerHTML={{ __html: highlight(source) }} />
      </pre>
      {caption && (
        <figcaption className="border-t border-bone/10 px-5 py-3 text-sm text-bone/45">
          {caption}
        </figcaption>
      )}
    </figure>
  )
}
