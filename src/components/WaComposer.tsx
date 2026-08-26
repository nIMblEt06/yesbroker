"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PROPERTY_LABELS, PROPERTY_TAGS } from "@/lib/budget";
import {
  loadPrefs,
  savePrefs,
  BUDGET_SLIDER_MIN,
  BUDGET_SLIDER_MAX,
  type MsgPrefs,
} from "@/lib/local";
import { composeMessage } from "@/lib/whatsapp";
import type { ComposerBroker } from "@/components/ContactProvider";
import type { WaContext } from "@/lib/whatsapp";
import {
  IconClose,
  IconPin,
  IconHome,
  IconSofa,
  IconWallet,
  IconUsers,
  IconWhatsApp,
  IconChat,
} from "@/components/icons";

interface Props {
  broker: ComposerBroker | null;
  defaults: WaContext;
  areaCounts: Record<string, number>;
  onClose: () => void;
  onSent: (message: string) => void;
}

const FURNISHINGS = [
  { value: "", label: "Any" },
  { value: "semi", label: "Semi furn." },
  { value: "full", label: "Full furn." },
  { value: "none", label: "Unfurn." },
] as const;

export function WaComposer({ broker, defaults, areaCounts, onClose, onSent }: Props) {
  const [prefs, setPrefs] = useState<MsgPrefs>({
    areas: [],
    bhk: [],
    furnishing: "",
    budgetMinK: 15,
    budgetMaxK: 35,
    tenant: "bachelor",
  });

  const loadedRef = useRef(false);

  useEffect(() => {
    if (!broker) {
      loadedRef.current = false;
      return;
    }
    const saved = loadPrefs();
    const options = broker?.areas ?? [];
    const savedOverlap = saved.areas.filter((a) => options.includes(a));
    const filterOverlap = options.filter((a) => (defaults.areaNames ?? []).includes(a));
    setPrefs({
      ...saved,
      areas: savedOverlap.length
        ? savedOverlap
        : (filterOverlap.length ? filterOverlap.slice(0, 2) : options.slice(0, 2)),
    });
    loadedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [broker]);

  useEffect(() => {
    if (!loadedRef.current) return;
    savePrefs(prefs);
  }, [prefs]);

  const areaOptions = useMemo(() => {
    return [...new Set(broker?.areas ?? [])]
      .sort((a, b) => (areaCounts[b] ?? 0) - (areaCounts[a] ?? 0))
      .slice(0, 10);
  }, [broker, areaCounts]);

  const message = useMemo(() => composeMessage(prefs), [prefs]);
  const open = broker != null;
  if (!open) return null;

  function toggleArea(name: string) {
    setPrefs((p) => ({
      ...p,
      areas: p.areas.includes(name)
        ? p.areas.filter((a) => a !== name)
        : [...p.areas, name],
    }));
  }

  function snapBudget(v: number, other: number): number {
    return Math.abs(v - other) >= 10 ? Math.round(v / 5) * 5 : v;
  }

  function send() {
    onSent(message);
  }

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label="Customise WhatsApp message">
      <button
        aria-label="Close"
        className="absolute inset-0 h-full w-full cursor-default bg-black/40"
        onClick={onClose}
      />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-bg shadow-2xl">
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <p className="font-display text-sm uppercase tracking-wide">Message {broker!.name}</p>
            <p className="text-xs text-muted">Everything is optional, pick what applies</p>
          </div>
          <button onClick={onClose} className="btn btn-outline btn-sm px-2" aria-label="Close composer">
            <IconClose size={16} />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <section>
            <GroupHeader icon={<IconPin size={13} />} label="Area" />
            <div className="flex flex-wrap gap-1.5">
              {areaOptions.map((a) => (
                <button
                  key={a}
                  className="chip"
                  data-active={prefs.areas.includes(a)}
                  aria-pressed={prefs.areas.includes(a)}
                  onClick={() => toggleArea(a)}
                >
                  {a}
                </button>
              ))}
              {areaOptions.length === 0 && <span className="text-xs text-muted">No known areas</span>}
            </div>
          </section>

          <section>
            <GroupHeader icon={<IconHome size={13} />} label="Property type" />
            <div className="flex flex-wrap gap-1.5">
              <button className="chip" data-active={prefs.bhk.length === 0} aria-pressed={prefs.bhk.length === 0} onClick={() => setPrefs((p) => ({ ...p, bhk: [] }))}>
                Any
              </button>
              {PROPERTY_TAGS.map((t) => (
                <button
                  key={t}
                  className="chip"
                  data-active={prefs.bhk.includes(t)}
                  aria-pressed={prefs.bhk.includes(t)}
                  onClick={() =>
                    setPrefs((p) => ({
                      ...p,
                      bhk: p.bhk.includes(t) ? p.bhk.filter((x) => x !== t) : [...p.bhk, t],
                    }))
                  }
                >
                  {PROPERTY_LABELS[t]}
                </button>
              ))}
            </div>
          </section>

          <section>
            <GroupHeader icon={<IconSofa size={13} />} label="Furnishing" />
            <div className="flex flex-wrap gap-1.5">
              {FURNISHINGS.map((f) => (
                <button
                  key={f.value}
                  className="chip"
                  data-active={prefs.furnishing === f.value}
                  aria-pressed={prefs.furnishing === f.value}
                  onClick={() => setPrefs((p) => ({ ...p, furnishing: p.furnishing === f.value ? "" : f.value }))}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </section>

          <section>
            <GroupHeader icon={<IconWallet size={13} />} label="Budget (₹k / month)" />
            <p className="mb-2 text-sm font-medium">
              {prefs.budgetMinK === prefs.budgetMaxK
                ? `Around ₹${prefs.budgetMaxK}k`
                : `₹${prefs.budgetMinK}k – ₹${prefs.budgetMaxK}k`}
            </p>
            <label className="flex items-center gap-3 text-xs text-muted">
              Min
              <input
                type="range"
                min={BUDGET_SLIDER_MIN}
                max={BUDGET_SLIDER_MAX}
                step={1}
                value={prefs.budgetMinK}
                onChange={(e) =>
                  setPrefs((p) => {
                    const v = Math.min(snapBudget(Number(e.target.value), p.budgetMaxK), p.budgetMaxK);
                    return { ...p, budgetMinK: v };
                  })
                }
                className="range flex-1"
                aria-label="Minimum budget in thousands"
              />
              <span className="phone-num w-10 text-right text-ink">{prefs.budgetMinK}k</span>
            </label>
            <label className="mt-2 flex items-center gap-3 text-xs text-muted">
              Max
              <input
                type="range"
                min={BUDGET_SLIDER_MIN}
                max={BUDGET_SLIDER_MAX}
                step={1}
                value={prefs.budgetMaxK}
                onChange={(e) =>
                  setPrefs((p) => {
                    const v = Math.max(snapBudget(Number(e.target.value), p.budgetMinK), p.budgetMinK);
                    return { ...p, budgetMaxK: v };
                  })
                }
                className="range flex-1"
                aria-label="Maximum budget in thousands"
              />
              <span className="phone-num w-10 text-right text-ink">{prefs.budgetMaxK}k</span>
            </label>
          </section>

          <section>
            <GroupHeader icon={<IconUsers size={13} />} label="You are" />
            <div className="flex flex-wrap gap-1.5">
              <button
                className="chip"
                data-active={prefs.tenant === "bachelor"}
                aria-pressed={prefs.tenant === "bachelor"}
                onClick={() => setPrefs((p) => ({ ...p, tenant: "bachelor" }))}
              >
                Bachelor
              </button>
              <button
                className="chip"
                data-active={prefs.tenant === "family"}
                aria-pressed={prefs.tenant === "family"}
                onClick={() => setPrefs((p) => ({ ...p, tenant: "family" }))}
              >
                Family
              </button>
            </div>
          </section>

          <section>
            <GroupHeader icon={<IconChat size={13} />} label="Preview" />
            <pre className="whitespace-pre-wrap rounded-[4px] border border-line bg-card p-3 text-sm leading-relaxed text-ink">
              {message}
            </pre>
          </section>
        </div>

        <footer className="border-t border-line bg-card px-5 py-4">
          <button onClick={send} className="btn btn-primary w-full">
            <IconWhatsApp size={15} /> Send on WhatsApp
          </button>
        </footer>
      </aside>
    </div>
  );
}

function GroupHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <p className="mb-2 flex items-center gap-1.5 font-display text-[11px] uppercase tracking-[0.14em] text-muted">
      {icon}
      {label}
    </p>
  );
}
