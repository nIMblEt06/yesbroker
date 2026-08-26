"use client";

import { useState } from "react";
import { useContact } from "@/components/ContactProvider";
import { displayPhone } from "@/lib/whatsapp";
import {
  IconChevronDown,
  IconChat,
  IconHome,
  IconClose,
  IconKey,
  IconCheck,
  IconArrowUpRight,
} from "@/components/icons";

type Tab = "active" | "all";

export function ContactTray() {
  const { contacted, archive, ready, openComposer, openFlatModal, archiveOne, restoreOne } =
    useContact();
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<Tab>("active");

  if (!ready || (contacted.length === 0 && archive.length === 0)) return null;

  const rows = tab === "active" ? contacted : [...contacted, ...archive];
  const activeCount = contacted.length;

  return (
    <div className="fixed bottom-3 left-3 z-50 sm:left-1/2 sm:-translate-x-1/2">
      {expanded && (
        <div className="broker-card mb-2 w-[min(92vw,400px)] overflow-hidden">
          <div className="flex border-b border-line" role="tablist" aria-label="Contacted brokers">
            {(
              [
                { key: "active", label: `Contacted (${activeCount})` },
                { key: "all", label: `All time (${contacted.length + archive.length})` },
              ] as const
            ).map((t) => (
              <button
                key={t.key}
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => setTab(t.key)}
                className={`flex-1 px-3 py-2.5 font-display text-[10px] uppercase tracking-[0.12em] ${
                  tab === t.key ? "bg-brand text-white" : "text-muted hover:text-ink"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="max-h-[42vh] overflow-y-auto p-1.5">
            {rows.length === 0 && (
              <p className="px-3 py-6 text-center text-xs text-muted">Nothing here yet.</p>
            )}
            {rows.map((c) => {
              const isActive = contacted.some((x) => x.id === c.id);
              return (
                <div
                  key={c.id}
                  className={`flex items-center gap-2.5 rounded-[4px] px-2 py-2 hover:bg-brand-soft ${
                    isActive ? "" : "opacity-70"
                  }`}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] bg-brand-soft font-display text-xs text-ink">
                    {(c.name || "?").slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate text-sm font-semibold">
                      {c.name || "Broker"}
                      {c.foundVia && (
                        <span
                          className="inline-flex items-center gap-0.5 rounded-[2px] bg-brand-soft px-1 py-px font-display text-[9px] uppercase tracking-wider text-ink"
                          title="Found a flat via this broker"
                        >
                          <IconCheck size={9} /> flat
                        </span>
                      )}
                      {!isActive && (
                        <span className="font-normal text-xs text-muted">· archived</span>
                      )}
                    </p>
                    <p className="phone-num truncate text-xs text-muted">
                      {displayPhone(c.phone)}
                      {c.areas.length > 0 && ` · ${c.areas.slice(0, 2).join("/")}`}
                    </p>
                  </div>
                  <button
                    className="btn btn-outline btn-sm px-2"
                    aria-label={`Message ${c.name}`}
                    title="Customise & message again"
                    onClick={() =>
                      openComposer({ id: c.id, name: c.name, phone: c.phone, areas: c.areas })
                    }
                  >
                    <IconChat size={14} />
                  </button>
                  <button
                    className="btn btn-outline btn-sm px-2"
                    aria-label={`Found a flat via ${c.name}`}
                    title="Found a flat via this broker"
                    onClick={() => openFlatModal(c.id)}
                  >
                    <IconHome size={14} />
                  </button>
                  {isActive ? (
                    <button
                      className="px-1 text-muted hover:text-danger"
                      aria-label={`Remove ${c.name} from list`}
                      title="Remove, stays in All time"
                      onClick={() => archiveOne(c.id)}
                    >
                      <IconClose size={13} />
                    </button>
                  ) : (
                    <button
                      className="px-1 text-muted hover:text-ink"
                      aria-label={`Restore ${c.name} to list`}
                      title="Restore to Contacted"
                      onClick={() => restoreOne(c.id)}
                    >
                      <IconArrowUpRight size={13} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <button
        className="broker-card flex items-center gap-2 px-3.5 py-2.5"
        aria-expanded={expanded}
        onClick={() => setExpanded((e) => !e)}
      >
        <IconKey size={15} />
        <span className="font-display text-[11px] uppercase tracking-[0.12em]">
          {activeCount} contacted
        </span>
        <IconChevronDown
          size={14}
          className={`transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>
    </div>
  );
}
