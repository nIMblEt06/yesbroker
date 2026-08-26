import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="display-1 text-3xl">About YesBroker</h1>
      <p className="mt-4 text-lg font-medium">
        Finding a flat is hard. Finding a good broker shouldn&apos;t be.
      </p>

      <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-muted">
        <p>If you&apos;re new to Bengaluru, there&apos;s one thing you quickly learn:</p>
        <p className="text-ink">
          The best flats are often found through people, not portals.
        </p>
        <p>But how do you find the right broker when you don&apos;t know anyone?</p>
        <p>
          That&apos;s why we built YesBroker. We&apos;re building a simple, community-powered
          directory of local brokers, so you can find the broker who knows your target area
          and let them do the hunting.
        </p>
      </div>

      <h2 className="display-1 mt-10 text-xl">How it works</h2>
      <ol className="mt-4 space-y-5">
        {[
          {
            n: "01",
            title: "Pick your area",
            body: "Koramangala? HSR? Indiranagar? Pick where you want to live.",
          },
          {
            n: "02",
            title: "Find a broker",
            body: "Browse brokers other people have shared. Call or WhatsApp them directly. No middleman between you and the broker.",
          },
          {
            n: "03",
            title: "Pay it forward",
            body: 'Know a good broker? Add them. Found your flat? Mark "This helped." The more people contribute, the better the list gets.',
          },
        ].map((s) => (
          <li key={s.n} className="broker-card flex gap-4 p-4">
            <span className="font-display text-sm text-muted">{s.n}</span>
            <div>
              <h3 className="font-display text-sm uppercase tracking-wide">{s.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <h2 className="display-1 mt-10 text-xl">Our mission</h2>
      <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-muted">
        <p>
          You shouldn&apos;t need a friend-of-a-friend-of-a-friend to find a decent broker.
        </p>
        <p>
          We want anyone moving to a new neighbourhood to be able to find the person who knows
          that neighbourhood.
        </p>
        <p className="text-ink">
          No broker accounts.
          <br />
          No endless forms.
          <br />
          Just the right broker for the right area.
        </p>
      </div>

      <div className="broker-card mt-10 border-warn/40 p-4">
        <h2 className="font-display text-sm uppercase tracking-wide">One important thing</h2>
        <div className="mt-2 space-y-2 text-sm leading-relaxed text-muted">
          <p>YesBroker is community-powered, so broker contacts aren&apos;t verified by us.</p>
          <p>Do your own checks. Meet the broker. See the flat.</p>
          <p className="text-ink">And never pay anything before you&apos;ve seen the property.</p>
        </div>
      </div>

      <div className="mt-10 border-t border-line pt-6 pb-8">
        <h2 className="font-display text-sm uppercase tracking-wide">Are you a broker?</h2>
        <p className="mt-2 text-sm text-muted">
          Listed incorrectly? Want your number changed?
        </p>
        <a
          href="mailto:hello@yesbroker.xyz"
          className="mt-2 inline-block text-sm font-medium underline-offset-2 hover:underline"
        >
          hello@yesbroker.xyz
        </a>
        <span className="text-sm text-muted"> and we&apos;ll sort it out.</span>
      </div>
    </div>
  );
}
