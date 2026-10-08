import Link from "next/link";
import { DOC_SECTIONS, type Block } from "@/lib/docsContent";
import { PillLink } from "./PillLink";

const linkClass = "rounded-input text-violet underline underline-offset-4 hover:text-violet-deep";

function Linked({ href, children }: { href: string; children: React.ReactNode }) {
  return href.startsWith("/") ? (
    <Link href={href} className={linkClass}>
      {children}
    </Link>
  ) : (
    <a href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>
      {children}
    </a>
  );
}

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case "p":
      return <p className="mt-4 max-w-[68ch] text-body text-graphite">{block.text}</p>;
    case "h3":
      return <h3 className="mt-8 text-h4 font-medium text-ink">{block.text}</h3>;
    case "ul":
      return (
        <ul className="mt-4 max-w-[68ch] list-disc space-y-2 pl-5 text-body text-graphite marker:text-smoke">
          {block.items.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol className="mt-4 max-w-[68ch] list-decimal space-y-2 pl-5 text-body text-graphite marker:text-smoke">
          {block.items.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ol>
      );
    case "note":
      return (
        <aside className="mt-6 max-w-[68ch] rounded-cell bg-violet-tint p-5">
          <p className="text-body font-medium text-ink">{block.title}</p>
          <p className="mt-1 text-body text-graphite">{block.text}</p>
        </aside>
      );
    case "code":
      return (
        <figure className="mt-4 max-w-[68ch]">
          {block.label && <figcaption className="eyebrow mb-2">{block.label}</figcaption>}
          <pre className="overflow-x-auto rounded-cell bg-ink p-4 text-small leading-relaxed text-porcelain">
            <code className="font-mono">{block.text}</code>
          </pre>
        </figure>
      );
    case "table":
      return (
        <div className="mt-4 overflow-x-auto rounded-cell border border-mist">
          <table className="w-full min-w-[520px] border-collapse text-left text-small">
            <thead className="bg-cloud">
              <tr>
                {block.head.map((h) => (
                  <th key={h} scope="col" className="px-4 py-3 font-medium text-ink">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row) => (
                <tr key={row[0]} className="border-t border-mist align-top">
                  {row.map((c, i) => (
                    <td
                      key={i}
                      className={`px-4 py-3 text-graphite ${i === 0 ? "font-medium text-ink" : ""} ${
                        c.startsWith("0x") ? "break-all font-mono text-caption" : ""
                      }`}
                    >
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "links":
      return (
        <ul className="mt-5 flex flex-wrap gap-3">
          {block.items.map((l) => (
            <li key={l.href}>
              <PillLink href={l.href} variant="secondary" size="sm">
                {l.label}
              </PillLink>
            </li>
          ))}
        </ul>
      );
  }
}

/** The product documentation: a sticky contents list beside one long, linkable page. */
export function DocsView() {
  return (
    <div className="bg-porcelain">
      <div className="mx-auto w-full max-w-[1224px] px-6 pt-16 pb-24 md:px-8 md:pt-20 md:pb-36">
        <p className="eyebrow">Documentation</p>
        <h1 className="mt-5 max-w-[22ch] text-[36px] leading-[1.08] tracking-[-0.02em] md:text-h1">
          Settle trades in USDC on Arc, step by step.
        </h1>
        <p className="mt-6 max-w-2xl text-lead text-slate">
          How Tidrel works, how to use the desk, what the contract does and how to check every settlement on-chain.
        </p>

        <div className="mt-12 grid gap-12 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-16">
          <nav aria-label="Documentation contents" className="lg:sticky lg:top-24 lg:self-start">
            <details className="rounded-cell border border-mist p-4 lg:hidden">
              <summary className="cursor-pointer text-body font-medium text-ink">On this page</summary>
              <ul className="mt-3 space-y-1">
                {DOC_SECTIONS.map((s) => (
                  <li key={s.id}>
                    <a href={`#${s.id}`} className="block rounded-input py-1.5 text-body text-graphite hover:text-violet">
                      {s.title}
                    </a>
                  </li>
                ))}
              </ul>
            </details>
            <div className="hidden lg:block">
              <p className="eyebrow">On this page</p>
              <ul className="mt-4 space-y-1 border-l border-mist">
                {DOC_SECTIONS.map((s) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      className="-ml-px block rounded-input border-l border-transparent py-1.5 pl-4 text-small text-slate hover:border-violet hover:text-ink"
                    >
                      {s.title}
                    </a>
                  </li>
                ))}
              </ul>
              <ul className="mt-8 space-y-1 text-small">
                <li>
                  <Linked href="/terms">Terms of use</Linked>
                </li>
                <li>
                  <Linked href="/privacy">Privacy policy</Linked>
                </li>
              </ul>
            </div>
          </nav>

          <article className="min-w-0">
            {DOC_SECTIONS.map((s, i) => (
              <section
                key={s.id}
                id={s.id}
                aria-labelledby={`${s.id}-title`}
                className={`scroll-mt-24 ${i === 0 ? "" : "mt-16 border-t border-mist pt-12"}`}
              >
                <h2 id={`${s.id}-title`} className="text-h2 tracking-[-0.015em]">
                  {s.title}
                </h2>
                <p className="mt-3 max-w-[68ch] text-lead text-slate">{s.summary}</p>
                {s.blocks.map((b, j) => (
                  <BlockView key={j} block={b} />
                ))}
              </section>
            ))}
          </article>
        </div>
      </div>
    </div>
  );
}
