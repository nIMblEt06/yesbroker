"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { TaxonomyArea } from "@/lib/area-taxonomy";
import { displayPhone } from "@/lib/whatsapp";
import { setHidden, softDeleteBroker, saveBrokerEdit } from "@/app/actions/admin";
import { useToast } from "@/components/Toaster";
import { IconThumb, IconFlag } from "@/components/icons";

export interface AdminBrokerRow {
  id: number;
  phone: string;
  displayName: string | null;
  aliases: string[];
  notes: string;
  addedByCount: number;
  helpfulVotes: number;
  reportCount: number;
  isHidden: boolean;
  hasNameConflict: boolean;
  areas: { slug: string; name: string }[];
}

export function AdminList({
  rows,
  allAreas,
  reportNotes,
}: {
  rows: AdminBrokerRow[];
  allAreas: TaxonomyArea[];
  reportNotes: Record<number, string[]>;
}) {
  if (rows.length === 0) {
    return <p className="mt-8 text-center text-sm text-muted">Nothing here.</p>;
  }
  return (
    <div className="mt-4 space-y-2">
      {rows.map((r) => (
        <AdminRow key={r.id} row={r} allAreas={allAreas} reportNotes={reportNotes[r.id] ?? []} />
      ))}
    </div>
  );
}

function AdminRow({
  row,
  allAreas,
  reportNotes,
}: {
  row: AdminBrokerRow;
  allAreas: TaxonomyArea[];
  reportNotes: string[];
}) {
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);

  function run(fn: () => Promise<void>, msg: string) {
    startTransition(async () => {
      await fn();
      toast(msg);
      router.refresh();
    });
  }

  return (
    <div className="broker-card p-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-semibold">{row.displayName ?? "(unnamed)"}</span>
        <span className="phone-num text-sm text-muted">{displayPhone(row.phone)}</span>
        {row.isHidden && <span className="tag bg-warn-soft text-warn">hidden</span>}
        {row.hasNameConflict && <span className="tag bg-warn-soft text-warn">name conflict</span>}
        <span className="ml-auto flex items-center gap-2 text-xs text-muted">
          +{row.addedByCount}
          <span className="flex items-center gap-0.5"><IconThumb size={11} />{row.helpfulVotes}</span>
          <span className="flex items-center gap-0.5"><IconFlag size={11} />{row.reportCount}</span>
        </span>
      </div>

      <p className="mt-1 text-xs text-muted">
        {row.areas.map((a) => a.name).join(", ") || "no areas"}
        {row.aliases.length ? ` · aka ${row.aliases.join(", ")}` : ""}
      </p>

      {reportNotes.length > 0 && (
        <ul className="mt-1 list-inside list-disc text-xs text-warn">
          {reportNotes.slice(0, 4).map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      )}

      {editing && <EditForm row={row} allAreas={allAreas} onDone={() => setEditing(false)} />}

      <div className="mt-2 flex flex-wrap gap-1.5">
        {!editing && (
          <button className="btn btn-outline btn-sm" onClick={() => setEditing(true)}>
            Edit
          </button>
        )}
        <button
          className="btn btn-outline btn-sm"
          disabled={pending}
          onClick={() => run(() => setHidden(row.id, !row.isHidden), row.isHidden ? "Unhidden" : "Hidden")}
        >
          {row.isHidden ? "Unhide" : "Hide"}
        </button>
        <button
          className="btn btn-outline btn-sm text-danger"
          disabled={pending}
          onClick={() => {
            if (confirm(`Delete ${displayPhone(row.phone)}? It can only be restored via database.`)) {
              run(() => softDeleteBroker(row.id), "Deleted");
            }
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function EditForm({
  row,
  allAreas,
  onDone,
}: {
  row: AdminBrokerRow;
  allAreas: TaxonomyArea[];
  onDone: () => void;
}) {
  const toast = useToast();
  const router = useRouter();
  const [name, setName] = useState(row.displayName ?? "");
  const [notes, setNotes] = useState(row.notes);
  const [slugs, setSlugs] = useState<Set<string>>(new Set(row.areas.map((a) => a.slug)));
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="mt-3 space-y-3 rounded-[4px] border border-line p-3"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const res = await saveBrokerEdit({
            id: row.id,
            displayName: name,
            notes,
            areaSlugs: [...slugs],
          });
          if (res.ok) {
            toast("Saved");
            onDone();
            router.refresh();
          } else {
            toast(res.error ?? "Failed");
          }
        });
      }}
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="field sm:col-span-4" />
      </div>

      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="field resize-none" />

      <details>
        <summary className="cursor-pointer text-sm font-medium text-brand-strong">
          Areas ({slugs.size})
        </summary>
        <div className="mt-2 grid max-h-48 grid-cols-2 gap-1 overflow-y-auto sm:grid-cols-3">
          {allAreas.map((a) => (
            <label key={a.slug} className="flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                checked={slugs.has(a.slug)}
                onChange={() =>
                  setSlugs((s) => {
                    const n = new Set(s);
                    if (n.has(a.slug)) n.delete(a.slug);
                    else n.add(a.slug);
                    return n;
                  })
                }
              />
              {a.name}
            </label>
          ))}
        </div>
      </details>

      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="btn btn-primary btn-sm disabled:opacity-40">
          {pending ? "Saving…" : "Save"}
        </button>
        <button type="button" className="btn btn-outline btn-sm" onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  );
}
