import Link from "next/link";
import type { LegalDoc } from "@/lib/legalContent";

/** A plain legal page: a title, a date and numbered sections that read top to bottom. */
export function LegalPage({ doc, other }: { doc: LegalDoc; other: { href: string; label: string } }) {
  return (
    <div className="bg-porcelain">
      <div className="mx-auto w-full max-w-[860px] px-6 pt-16 pb-24 md:px-8 md:pt-24 md:pb-36">
        <p className="eyebrow">Legal</p>
        <h1 className="mt-5 text-[36px] leading-[1.08] tracking-[-0.02em] md:text-h1">{doc.title}</h1>
        <p className="mt-4 text-small text-slate">Last updated {doc.updated}</p>
        <p className="mt-8 text-lead text-graphite">{doc.intro}</p>

        <ol className="mt-12 space-y-12">
          {doc.sections.map((s, i) => (
            <li key={s.title}>
              <h2 className="text-h3">
                <span className="num mr-3 text-smoke">{i + 1}.</span>
                {s.title}
              </h2>
              {s.paragraphs.map((p) => (
                <p key={p} className="mt-4 text-body text-graphite">
                  {p}
                </p>
              ))}
              {s.items && (
                <ul className="mt-4 list-disc space-y-2 pl-5 text-body text-graphite marker:text-smoke">
                  {s.items.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>

        <p className="mt-16 border-t border-mist pt-6 text-small text-slate">
          See also the{" "}
          <Link href={other.href} className="rounded-input text-ink underline underline-offset-4">
            {other.label}
          </Link>{" "}
          and the{" "}
          <Link href="/docs" className="rounded-input text-ink underline underline-offset-4">
            documentation
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
