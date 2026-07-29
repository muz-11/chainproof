import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <div className="min-h-dvh">
      {/* Nav */}
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-xl font-bold tracking-tight text-indigo-700">ChainProof</span>
          <div className="flex items-center gap-3">
            <a
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Log in
            </a>
            <a
              href="/signup"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Get started
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main>
        <section className="mx-auto max-w-6xl px-6 pb-24 pt-20 text-center">
          <span className="mb-4 inline-block rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-700">
            Supply chain compliance made simple
          </span>
          <h1 className="mx-auto mb-6 max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
            Meet your supply chain transparency obligations with confidence
          </h1>
          <p className="mx-auto mb-10 max-w-xl text-lg text-gray-600">
            ChainProof helps importers, manufacturers, and retailers automate supplier due
            diligence, track questionnaire responses, flag risk indicators, and generate
            compliance reports — all in one place.
          </p>
          <div className="flex items-center justify-center gap-4">
            <a
              href="/signup"
              className="rounded-lg bg-indigo-600 px-6 py-3 text-base font-semibold text-white hover:bg-indigo-700"
            >
              Start free trial
            </a>
            <a
              href="/login"
              className="rounded-lg border border-gray-300 px-6 py-3 text-base font-medium text-gray-700 hover:bg-gray-50"
            >
              Log in
            </a>
          </div>
        </section>

        {/* Features */}
        <section className="border-t border-gray-100 bg-gray-50 py-20">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="mb-12 text-center text-3xl font-bold tracking-tight">
              How it works
            </h2>
            <div className="grid gap-8 sm:grid-cols-3">
              <FeatureCard
                step="1"
                title="Upload suppliers"
                description="Import your supplier list via CSV. ChainProof organizes them by country, spend category, and risk level."
              />
              <FeatureCard
                step="2"
                title="Send questionnaires"
                description="Automatically dispatch due diligence questionnaires to every supplier and track responses."
              />
              <FeatureCard
                step="3"
                title="Generate reports"
                description="Flag risk indicators and auto-draft your annual compliance report in the required format."
              />
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20">
          <div className="mx-auto max-w-2xl px-6 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight">
              Ready to simplify your compliance?
            </h2>
            <p className="mb-8 text-lg text-gray-600">
              Join organizations that trust ChainProof to manage their supply chain
              transparency reporting.
            </p>
            <a
              href="/signup"
              className="inline-block rounded-lg bg-indigo-600 px-8 py-3 text-base font-semibold text-white hover:bg-indigo-700"
            >
              Create your account
            </a>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 text-center text-sm text-gray-400">
        &copy; {new Date().getFullYear()} ChainProof. All rights reserved.
      </footer>
    </div>
  );
}

function FeatureCard({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <span className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
        {step}
      </span>
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}
