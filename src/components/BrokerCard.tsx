"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { BrokerCardData } from "@/lib/queries";
import type { WaContext } from "@/lib/whatsapp";
import { telLink, displayPhone } from "@/lib/whatsapp";
import { voteHelpful, reportBroker } from "@/app/actions/feedback";
import { hasVoted, markVoted } from "@/lib/local";
import { useToast } from "@/components/Toaster";
import { useContact } from "@/components/ContactProvider";
import {
  IconWhatsApp,
  IconPhone,
  IconCopy,
  IconDots,
  IconUpvote,
  IconFlag,
  IconSliders,
  IconUsers,
  IconHome,
} from "@/components/icons";

const REASONS = [
  { value: "wrong_number", label: "Wrong number" },
  { value: "dead_number", label: "Dead number" },
  { value: "spam", label: "Spam" },
  { value: "abusive", label: "Abusive" },
  { value: "other", label: "Other" },
];

interface Props {
  broker: BrokerCardData;
  waCtx?: WaContext;
}

export function BrokerCard({ broker, waCtx }: Props) {
  const toast = useToast();
  const router = useRouter();
  const contact = useContact();
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState("dead_number");
  const [note, setNote] = useState("");
  const [votes, setVotes] = useState(broker.helpfulVotes);
  const [voted, setVoted] = useState(false);
  useEffect(() => {
    setVoted(hasVoted(broker.id));
  }, [broker.id]);
  const [pending, startTransition] = useTransition();

  const name = broker.displayName ?? "Broker";
  const { hasContacted } = useContact();
  const iContacted = hasContacted(broker.id);
  function onHelped() {
    if (voted) return;
    startTransition(async () => {
      const res = await voteHelpful(broker.id);
      markVoted(broker.id);
      setVoted(true);
      if (res.counted) {
        setVotes(res.votes ?? votes + 1);
        toast("Counted. Thanks!");
      } else {
        if (typeof res.votes === "number") setVotes(res.votes);
        toast(res.message);
      }
    });
  }

  function onReport() {
    startTransition(async () => {
      const res = await reportBroker(broker.id, reason, note);
      toast(res.message);
      setReportOpen(false);
      setMenuOpen(false);
      router.refresh();
    });
  }

  function onCopy() {
    navigator.clipboard
      .writeText(displayPhone(broker.phone))
      .then(() => toast("Number copied"))
      .catch(() => toast("Couldn't copy"));
    contact.trackTap();
    setMenuOpen(false);
  }

  function composerPayload() {
    return {
      id: broker.id,
      name,
      phone: broker.phone,
      areas: broker.areas.map((a) => a.name),
    };
  }

  return (
    <article
      className={`broker-card relative flex h-full flex-col p-4 ${menuOpen ? "z-50" : ""}`}
      data-flagged={broker.reportFlagged}
    >
      <div className="flex items-start justify-between gap-3">
        <button
          className="min-w-0 flex-1 text-left"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
        >
          <h3 className="truncate text-base font-semibold">{name}</h3>
          <p className="phone-num mt-0.5 text-sm text-muted">
            {displayPhone(broker.phone)}
          </p>
        </button>
        <div className="flex shrink-0 gap-1.5">
          <button
            onClick={onHelped}
            disabled={voted || pending}
            aria-pressed={voted}
            title={voted ? "You marked this helpful" : "This helped, upvote"}
            className={`flex items-center gap-1 rounded-[2px] px-2 py-1 text-xs font-medium transition-colors ${
              voted ? "bg-brand text-white" : "bg-brand-soft text-ink hover:bg-line"
            }`}
          >
            <IconUpvote size={12} filled={voted} /> {votes}
          </button>
          {broker.contactCount > 0 && (
            <span
              className={`flex items-center gap-1 border px-2 py-1 text-xs font-medium ${
                iContacted
                  ? "border-transparent bg-brand text-white"
                  : "border-line"
              }`}
              title={
                iContacted
                  ? `You reached out · ${broker.contactCount === 1 ? "1 person" : `${broker.contactCount} people`} total`
                  : `${broker.contactCount} ${broker.contactCount === 1 ? "person" : "people"} reached out`
              }
            >
              <IconUsers size={12} /> {broker.contactCount}
            </span>
          )}
          {broker.flatsFound > 0 && (
            <span
              className="flex items-center gap-1 border border-line px-2 py-1 text-xs font-medium"
              title={`${broker.flatsFound} found a flat here`}
            >
              <IconHome size={12} /> {broker.flatsFound}
            </span>
          )}
        </div>
      </div>

      {broker.areas.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {broker.areas.slice(0, 3).map((a) => (
            <span key={a.slug} className="tag">
              {a.name}
            </span>
          ))}
          {broker.areas.length > 3 && (
            <span
              className="tag"
              title={broker.areas.slice(3).map((a) => a.name).join(", ")}
            >
              +{broker.areas.length - 3}
            </span>
          )}
        </div>
      )}

      {expanded && (
        <div className="mt-3 space-y-1.5 border-t border-line pt-3 text-sm">
          {broker.aliases.length > 0 && (
            <p className="text-muted">
              Also known as: <span className="text-ink">{broker.aliases.join(", ")}</span>
            </p>
          )}
          <p className="text-xs text-muted">
            First added {broker.firstAddedAt.toLocaleDateString("en-IN")} · last updated{" "}
            {broker.lastAddedAt.toLocaleDateString("en-IN")}
          </p>
          <button
            className="text-xs font-medium underline-offset-2 hover:underline"
            onClick={() => setExpanded(false)}
          >
            Show less
          </button>
        </div>
      )}

      <div className="relative mt-auto flex items-center gap-2 pt-3.5">
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            contact.contactBroker(composerPayload(), waCtx);
          }}
          className="btn btn-wa btn-sm flex-1"
        >
          <IconWhatsApp size={14} /> WhatsApp
        </a>
        <a
          href={telLink(broker.phone)}
          className="btn btn-outline btn-sm flex-1"
          onClick={() => contact.trackTap()}
        >
          <IconPhone size={13} /> Call
        </a>
        <button
          className="btn btn-outline btn-sm px-2.5"
          aria-label="Customise message"
          title="Customise message"
          onClick={() => contact.openComposer(composerPayload(), waCtx)}
        >
          <IconSliders size={14} />
        </button>
        <button
          className="btn btn-outline btn-sm px-2.5"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => {
            setMenuOpen((m) => !m);
            setReportOpen(false);
          }}
        >
          <IconDots size={14} />
        </button>

        {menuOpen && !reportOpen && (
          <div
            role="menu"
            className="absolute bottom-full right-0 z-20 mb-2 w-44 overflow-hidden rounded-[4px] border border-line bg-card py-1"
          >
            <MenuItem
              onClick={() => {
                setReportOpen(true);
              }}
            >
              <IconFlag size={13} /> Report
            </MenuItem>
            <MenuItem onClick={onCopy}>
              <IconCopy size={13} /> Copy number
            </MenuItem>
          </div>
        )}

        {menuOpen && reportOpen && (
          <div className="absolute bottom-full right-0 z-20 mb-2 w-60 rounded-[4px] border border-line bg-card p-3">
            <p className="mb-2 text-sm font-semibold">Why reporting?</p>
            <div className="space-y-1">
              {REASONS.map((r) => (
                <label key={r.value} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name={`reason-${broker.id}`}
                    checked={reason === r.value}
                    onChange={() => setReason(r.value)}
                  />
                  {r.label}
                </label>
              ))}
            </div>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note"
              className="field mt-2 text-sm"
            />
            <div className="mt-2.5 flex gap-2">
              <button className="btn btn-primary btn-sm flex-1" onClick={onReport} disabled={pending}>
                Send
              </button>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => {
                  setReportOpen(false);
                  setMenuOpen(false);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

function MenuItem({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-brand-soft disabled:opacity-40"
    >
      {children}
    </button>
  );
}
