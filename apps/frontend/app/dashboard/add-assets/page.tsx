'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AddAssetsPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to portfolio page with add modal open
    router.push('/portfolio?action=add');
  }, [router]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-0">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lokifi mx-auto" />
        <p className="mt-4 text-surface-400">Redirecting...</p>
      </div>
    </div>
  );
}

