import Link from 'next/link';
import { BarChart3 } from 'lucide-react';
import type { ReactNode } from 'react';

interface AuthShellProps {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}

export default function AuthShell({ title, description, children, footer }: AuthShellProps) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a0e1a] px-6 py-12 text-slate-100">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-24 top-12 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#101726]/85 p-8 shadow-2xl shadow-black/30 backdrop-blur-xl">
        <Link href="/" className="mb-8 inline-flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-500/10">
            <BarChart3 className="h-5 w-5 text-cyan-300" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-wide text-white">
              CSV<span className="text-cyan-400">Hero</span>
            </div>
            <div className="text-xs text-slate-400">Secure workspace access</div>
          </div>
        </Link>

        <div className="mb-6 space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-white">{title}</h1>
          <p className="text-sm leading-6 text-slate-400">{description}</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0b1220] p-4">
          {children}
        </div>

        {footer ? <div className="mt-5 text-sm text-slate-400">{footer}</div> : null}
      </div>
    </div>
  );
}
