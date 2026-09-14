"use client";
import Link from "next/link";
export function Logo() {
  return (
    <Link className="logo" href="/">
      <span className="logo-mark">
        L<span />
      </span>
      lokifi<span className="logo-dot">.</span>
    </Link>
  );
}
