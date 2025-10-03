'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to markets page
    router.replace('/markets');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#17171A] flex items-center justify-center">
      <div className="text-white">Redirecting to Markets...</div>
    </div>
  );
}
