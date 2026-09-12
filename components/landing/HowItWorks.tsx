const STEPS = [
  {
    title: "Say what you need",
    body: "Type or speak in plain language — no menus to learn, no rigid commands.",
  },
  {
    title: "The agent plans a path",
    body: "It breaks the request into steps and shows its thinking before doing anything.",
  },
  {
    title: "You stay in control",
    body: "Anything with a real-world effect — sending, booking, deleting — waits for your approval first.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-t border-line">
      <div className="mx-auto max-w-5xl px-5 py-16 sm:px-8 sm:py-20">
        <h2 className="font-serif text-2xl text-ink sm:text-3xl max-w-md">How it works</h2>
        <div className="mt-10 grid gap-8 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <div key={step.title} className="border-t border-line pt-4">
              <p className="text-sm text-ink-faint mb-2">{String(i + 1).padStart(2, "0")}</p>
              <h3 className="text-base font-medium text-ink mb-1.5">{step.title}</h3>
              <p className="text-sm leading-relaxed text-ink-soft">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const AVAILABLE_NOW = [
  "A conversation workspace for research, planning, and organizing your thoughts",
  "A clear view of what could be connected, and why",
  "An activity log of everything the agent has done or attempted",
];

const COMING_LATER = [
  "Gmail, Google Calendar, Drive, and Tasks",
  "WhatsApp, Telegram, GitHub, Vercel, and browser actions",
  "Multi-step workflows that chain several tools together",
];

export function CapabilitiesHonesty() {
  return (
    <section className="border-t border-line bg-panel">
      <div className="mx-auto max-w-5xl px-5 py-16 sm:px-8 sm:py-20">
        <h2 className="font-serif text-2xl text-ink sm:text-3xl max-w-md">
          What&apos;s here now, and what&apos;s next
        </h2>
        <p className="mt-3 max-w-lg text-sm text-ink-soft">
          We&apos;d rather be precise than impressive. Nothing here claims to work with
          every app.
        </p>
        <div className="mt-10 grid gap-10 sm:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-ink mb-3">Available in Phase 1</p>
            <ul className="space-y-2.5">
              {AVAILABLE_NOW.map((item) => (
                <li key={item} className="text-sm leading-relaxed text-ink-soft pl-4 relative">
                  <span className="absolute left-0 top-2 h-1 w-1 rounded-full bg-accent" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-sm font-medium text-ink mb-3">Planned, not yet connected</p>
            <ul className="space-y-2.5">
              {COMING_LATER.map((item) => (
                <li key={item} className="text-sm leading-relaxed text-ink-soft pl-4 relative">
                  <span className="absolute left-0 top-2 h-1 w-1 rounded-full bg-line" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

export function LandingFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <p className="text-sm text-ink-faint">Personal AI Agent — Phase 1 preview.</p>
        <p className="text-sm text-ink-faint">
          Tell me what you need. I&apos;ll help get it done.
        </p>
      </div>
    </footer>
  );
}
