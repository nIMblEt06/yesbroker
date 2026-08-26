"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toaster";
import { reportFlatFound } from "@/app/actions/outreach";
import { markFound } from "@/lib/local";
import { IconClose, IconHome, IconCheck } from "@/components/icons";

interface Props {
  brokerId: number | null;
  onClose: () => void;
  onDone: () => void;
}

export function FlatFoundModal({ brokerId, onClose, onDone }: Props) {
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (brokerId == null) return null;

  function submit() {
    startTransition(async () => {
      const res = await reportFlatFound(brokerId!);
      if (!res.ok) {
        toast(res.error ?? "Couldn't save.");
        return;
      }
      markFound(brokerId!);
      onDone();
      toast(res.counted ? "Noted, congrats on the flat!" : "Already recorded for this broker.");
      router.refresh();
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Found a flat">
      <button
        aria-label="Close"
        className="absolute inset-0 h-full w-full cursor-default bg-black/40"
        onClick={onClose}
      />
      <div className="broker-card relative w-full max-w-sm p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-[4px] bg-brand text-white">
              <IconHome size={17} />
            </span>
            <div>
              <h2 className="font-display text-sm uppercase tracking-wide">Found a flat?</h2>
              <p className="text-xs text-muted">Marks this broker as the one that worked</p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-outline btn-sm px-2" aria-label="Close">
            <IconClose size={15} />
          </button>
        </div>

        <p className="mt-4 text-sm text-muted">
          Your confirmation counts towards this broker; it tells everyone their number
          actually delivers. Only one confirmation per person is recorded.
        </p>

        <div className="mt-5 flex gap-2">
          <button
            disabled={pending}
            onClick={submit}
            className="btn btn-primary flex-1 disabled:opacity-40"
          >
            <IconCheck size={14} /> {pending ? "Saving…" : "Yes, found it here"}
          </button>
          <button onClick={onClose} className="btn btn-outline">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
