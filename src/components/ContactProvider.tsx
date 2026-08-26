"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toaster";
import { recordContact } from "@/app/actions/outreach";
import {
  addContacted,
  archiveOne as storageArchiveOne,
  hasContacted as storageHasContacted,
  loadArchive,
  loadContacted,
  loadPrefs,
  recordReachOut,
  restoreOne as storageRestoreOne,
  type ContactedBroker,
} from "@/lib/local";
import { composeMessage, buildWhatsAppLink } from "@/lib/whatsapp";
import type { WaContext } from "@/lib/whatsapp";
import { WaComposer } from "@/components/WaComposer";
import { FlatFoundModal } from "@/components/FlatFoundModal";
import { ContactTray } from "@/components/ContactTray";

export interface ComposerBroker {
  id: number;
  name: string;
  phone: string;
  areas: string[];
}

interface ContactCtxValue {
  contacted: ContactedBroker[];
  archive: ContactedBroker[];
  ready: boolean;
  hasContacted: (id: number) => boolean;
  contactBroker: (broker: ComposerBroker, defaults?: WaContext) => void;
  openComposer: (broker: ComposerBroker, defaults?: WaContext) => void;
  openFlatModal: (id: number) => void;
  refreshContacted: () => void;
  archiveOne: (id: number) => void;
  restoreOne: (id: number) => void;
  trackTap: () => void;
}

const ContactCtx = createContext<ContactCtxValue | null>(null);

export function useContact(): ContactCtxValue {
  const ctx = useContext(ContactCtx);
  if (!ctx) throw new Error("useContact must be used within ContactProvider");
  return ctx;
}

export function ContactProvider({ children }: { children: React.ReactNode }) {
  const toast = useToast();
  const router = useRouter();
  const [contacted, setContacted] = useState<ContactedBroker[]>([]);
  const [archive, setArchive] = useState<ContactedBroker[]>([]);
  const [ready, setReady] = useState(false);
  const [composerFor, setComposerFor] = useState<{
    broker: ComposerBroker;
    defaults: WaContext;
  } | null>(null);
  const [flatForId, setFlatForId] = useState<number | null>(null);
  const [nudgeLevel, setNudgeLevel] = useState<number | null>(null);

  useEffect(() => {
    setContacted(loadContacted());
    setArchive(loadArchive());
    setReady(true);
  }, []);

  const scheduleNudge = useCallback(() => {
    const level = recordReachOut();
    if (level !== null) {
      setTimeout(() => setNudgeLevel(level), 3000);
    }
  }, []);

  const trackTap = useCallback(() => scheduleNudge(), [scheduleNudge]);

  const trackReachOut = useCallback(
    (broker: ComposerBroker, message: string) => {
      window.open(buildWhatsAppLink(broker.phone, message), "_blank", "noopener,noreferrer");
      scheduleNudge();
      setContacted(
        addContacted({
          id: broker.id,
          name: broker.name,
          phone: broker.phone,
          areas: broker.areas.length
            ? broker.areas
            : (() => {
                const p = loadPrefs();
                return p.areas.slice(0, 2);
              })(),
        })
      );
      recordContact(broker.id)
        .then((res) => {
          if (res.counted) router.refresh();
        })
        .catch(() => {});
    },
    [router, scheduleNudge]
  );

  const contactBroker = useCallback(
    (broker: ComposerBroker, defaults: WaContext = {}) => {
      if (!storageHasContacted(broker.id)) {
        setComposerFor({ broker, defaults });
        return;
      }
      trackReachOut(broker, composeMessage(loadPrefs()));
    },
    [trackReachOut]
  );

  const openComposer = useCallback(
    (broker: ComposerBroker, defaults: WaContext = {}) => {
      setComposerFor({ broker, defaults });
    },
    []
  );

  const openFlatModal = useCallback((id: number) => setFlatForId(id), []);

  const refreshContacted = useCallback(() => {
    setContacted(loadContacted());
    setArchive(loadArchive());
  }, []);

  const archiveOne = useCallback((id: number) => {
    const res = storageArchiveOne(id);
    setContacted(res.contacted);
    setArchive(res.archive);
  }, []);

  const restoreOne = useCallback((id: number) => {
    const res = storageRestoreOne(id);
    setContacted(res.contacted);
    setArchive(res.archive);
  }, []);

  const hasContactedFn = useCallback(
    (id: number) => contacted.some((c) => c.id === id),
    [contacted]
  );

  const value = useMemo(
    () => ({
      contacted,
      archive,
      ready,
      hasContacted: hasContactedFn,
      contactBroker,
      openComposer,
      openFlatModal,
      refreshContacted,
      archiveOne,
      restoreOne,
      trackTap,
    }),
    [
      contacted,
      archive,
      ready,
      hasContactedFn,
      contactBroker,
      openComposer,
      openFlatModal,
      refreshContacted,
      archiveOne,
      restoreOne,
      trackTap,
    ]
  );

  return (
    <ContactCtx.Provider value={value}>
      {children}
      {nudgeLevel !== null && (
        <div
          role="status"
          className="fixed bottom-24 left-1/2 z-[75] w-[min(92vw,26rem)] -translate-x-1/2 rounded-[4px] border border-line bg-card p-3 shadow-lg sm:bottom-20"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm">
              Found these useful?{" "}
              <Link
                href="/add"
                className="font-medium underline underline-offset-2"
              >
                Add a broker you know
              </Link>
              , it keeps the directory alive for the next person.
            </p>
            <button
              aria-label="Dismiss"
              className="shrink-0 px-1 text-muted hover:text-danger"
              onClick={() => setNudgeLevel(null)}
            >
              ✕
            </button>
          </div>
        </div>
      )}
      <ContactTray />
      <WaComposer
        broker={composerFor?.broker ?? null}
        defaults={composerFor?.defaults ?? {}}
        areaCounts={composerFor?.defaults?.areaCounts ?? {}}
        onClose={() => setComposerFor(null)}
        onSent={(message) => {
          if (!composerFor) return;
          trackReachOut(composerFor.broker, message);
          toast("Opening WhatsApp…");
          setComposerFor(null);
        }}
      />
      <FlatFoundModal
        brokerId={flatForId}
        onClose={() => setFlatForId(null)}
        onDone={() => setContacted(loadContacted())}
      />
    </ContactCtx.Provider>
  );
}
