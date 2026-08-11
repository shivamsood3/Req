"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="eyebrow">REQ</p>
        <div className="auth-heading"><h1>Something went wrong</h1></div>
        <p className="supporting-copy">The page could not be loaded. Please try again.</p>
        <button className="primary-button" type="button" onClick={reset}>Try again</button>
      </section>
    </main>
  );
}
