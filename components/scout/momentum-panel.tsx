import { Sparkline } from "@/components/scout/sparkline";
import type { ArtistSignals } from "@/lib/data/scout";

const COMPONENT_LABELS: Record<string, string> = {
  completion_rate: "completion",
  repeat_ratio: "repeat listeners",
  after_velocity: "after velocity",
  follower_velocity: "follower velocity",
  collection_velocity: "collection velocity",
  reaction_velocity: "reaction velocity",
};

/**
 * The momentum readout: the score, an activity sparkline, and a fully
 * transparent breakdown — every component's normalized value × weight →
 * its points of the score, with raw values on hover.
 */
export function MomentumPanel({ signals }: { signals: ArtistSignals }) {
  const score = signals.momentum?.score ?? 0;
  const windowDays = signals.momentum?.window_days ?? 30;
  const components = signals.momentum?.components ?? {};
  const entries = Object.entries(components);

  const activity = signals.daily.map(
    (d) => d.followers_gained + d.reactions_gained + d.collections_gained + d.after_children_gained + d.completes,
  );

  return (
    <div className="rounded-lg border border-bone-10 bg-ink-raised/40 p-5 sm:p-6">
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="meta meta-caps text-bone-46">momentum</p>
          <p className="mt-1 font-mono text-4xl tabular-nums text-bone">{score.toFixed(1)}</p>
          <p className="meta mt-1 text-bone-32">/ 100 · {windowDays}-day window</p>
        </div>
        <div className="w-40 sm:w-56">
          <Sparkline values={activity} />
          <p className="meta mt-1.5 text-right text-bone-32">daily activity</p>
        </div>
      </div>

      {entries.length > 0 && (
        <div className="mt-6 space-y-2.5 border-t border-bone-10 pt-5">
          <p className="meta meta-caps mb-1 text-bone-46">how it&apos;s built</p>
          {entries.map(([key, c]) => (
            <div key={key} className="flex items-center gap-3">
              <span className="w-36 shrink-0 text-sm text-bone-64">{COMPONENT_LABELS[key] ?? key}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bone-06">
                <div
                  className="h-full rounded-full bg-bone-46"
                  style={{ width: `${Math.min(100, Math.round(c.normalized * 100))}%` }}
                />
              </div>
              <span
                className="meta w-12 shrink-0 text-right tabular-nums"
                title={`raw ${c.raw} · normalized ${c.normalized} · weight ${c.weight}`}
              >
                {(c.contribution * 100).toFixed(1)}
              </span>
            </div>
          ))}
          <p className="meta mt-2 text-bone-32">
            each row: normalized value (bar) × weight → points of the score. hover for raw values.
          </p>
        </div>
      )}
    </div>
  );
}
