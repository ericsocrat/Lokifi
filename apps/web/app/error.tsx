"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="standalone">
      <h1>We couldn’t open this page.</h1>
      <p>Your saved records are still in storage. Try loading the page again.</p>
      <button onClick={reset}>Try again</button>
    </main>
  );
}
