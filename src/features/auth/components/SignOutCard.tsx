'use client';

import { useClerk } from '@clerk/nextjs';
import Link from 'next/link';
import { useState } from 'react';

export default function SignOutCard() {
  const { signOut } = useClerk();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignOut = async () => {
    setIsSubmitting(true);

    try {
      await signOut({ redirectUrl: '/' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm leading-6 text-slate-300">
        Signing out will keep local guest mode available, but cloud-synced Supabase sessions will pause
        until the next sign-in.
      </p>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSignOut}
          disabled={isSubmitting}
          className="rounded-md border border-rose-400/30 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-200 transition hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Signing out...' : 'Confirm sign out'}
        </button>

        <Link
          href="/"
          className="rounded-md border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/[0.08]"
        >
          Cancel
        </Link>
      </div>
    </div>
  );
}
