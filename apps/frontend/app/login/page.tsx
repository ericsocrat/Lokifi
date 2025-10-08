"use client";

import { useAuth } from "@/src/components/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LoginPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => { if (user) router.replace("/"); }, [user, router]);

  if (user) return null;

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Login / Register</h1>
      <p className="text-neutral-300 mb-3">Use the modal to authenticate.</p>
      <div className="rounded-lg border border-neutral-800 p-4 bg-neutral-900">
        <p className="text-sm text-neutral-400">Open the auth modal using the top-right &quot;Login&quot; button in the navbar.</p>
      </div>
    </div>
  );
}
