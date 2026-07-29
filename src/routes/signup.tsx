import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { signup } from "~/server-fns/auth";

export const Route = createFileRoute("/signup")({
  component: Signup,
});

function Signup() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = e.currentTarget;
    const data = {
      email: (form.elements.namedItem("email") as HTMLInputElement).value,
      password: (form.elements.namedItem("password") as HTMLInputElement).value,
      name: (form.elements.namedItem("name") as HTMLInputElement).value,
      organizationName: (form.elements.namedItem("organizationName") as HTMLInputElement).value,
    };

    try {
      await signup({ data });
      router.navigate({ to: "/dashboard" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="w-full max-w-md">
        <h1 className="mb-2 text-3xl font-bold tracking-tight">Create your account</h1>
        <p className="mb-8 text-gray-600">
          Set up your ChainProof account to start managing supply chain compliance.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="organizationName" className="mb-1 block text-sm font-medium">
              Organization name
            </label>
            <input
              id="organizationName"
              name="organizationName"
              type="text"
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Acme Corp"
            />
          </div>

          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-medium">
              Your name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Jane Smith"
            />
          </div>

          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="jane@acmecorp.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="At least 8 characters"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <a href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
            Log in
          </a>
        </p>
      </div>
    </main>
  );
}
