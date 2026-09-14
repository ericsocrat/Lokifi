import Link from "next/link";
export default function NotFound() {
  return (
    <main className="standalone">
      <p className="eyebrow">LOKIFI</p>
      <h1>This page isn’t here.</h1>
      <p>The portfolio workspace has moved on.</p>
      <Link href="/dashboard" className="button">
        Open your overview
      </Link>
    </main>
  );
}
