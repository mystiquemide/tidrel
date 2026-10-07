import { MIN_HEALTH } from "@/lib/settle";
import type { CSSProperties } from "react";
import { Words } from "./Motion";
import { Reveal } from "./Reveal";
import { PillLink } from "./PillLink";
import { AllOrNothingIcon, FloorIcon, LiquidityIcon } from "./SafetyIcons";

/** The three rules that matter most, in a hairline grid like the reference's feature row. */
export function SafetyGrid() {
  const rules = [
    {
      icon: <FloorIcon />,
      title: `A health floor of ${MIN_HEALTH.toFixed(2)}`,
      body: "A draw that would take your loan health below the floor is refused before you sign anything.",
    },
    {
      icon: <LiquidityIcon />,
      title: "Never past what the market can lend",
      body: "Tidrel reads the market's liquidity first and refuses a draw above it.",
    },
    {
      icon: <AllOrNothingIcon />,
      title: "All payments, or none",
      body: "Every counterparty is paid by one contract call. If one payment would fail, nothing is sent.",
    },
  ];

  return (
    <section aria-labelledby="safety-grid" className="bg-porcelain">
      <Reveal className="mx-auto w-full max-w-[1224px] px-6 pb-24 md:px-8 md:pb-36">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="eyebrow rv">Safety</p>
            <h2 id="safety-grid" className="mt-4 text-[30px] leading-[1.1] tracking-[-0.015em] md:text-h2">
              <Words text="Built to refuse the risky draw." start={1} />
            </h2>
          </div>
          <div className="rv self-start md:self-auto" style={{ "--i": 5 } as CSSProperties}>
            <PillLink href="/safety" variant="secondary">
              Read all safety rules
            </PillLink>
          </div>
        </div>
        <ul className="mt-12 grid gap-px overflow-hidden border border-mist bg-mist md:grid-cols-3">
          {rules.map((r, i) => (
            <li key={r.title} style={{ "--i": i + 4 } as CSSProperties} className="rv bg-porcelain p-8 md:p-10">
              {r.icon}
              <h3 className="mt-10 text-h4 font-medium text-ink">{r.title}</h3>
              <p className="mt-3 text-body text-slate">{r.body}</p>
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}
