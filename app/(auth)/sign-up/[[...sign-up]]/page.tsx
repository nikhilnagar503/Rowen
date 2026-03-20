import { SignUp } from '@clerk/nextjs';
import Link from 'next/link';
import AuthShell from '../../../../src/features/auth/components/AuthShell';

export default function SignUpPage() {
  return (
    <AuthShell
      title="Create your account"
      description="Set up secure access for CSVHero so your analysis sessions can sync to Supabase across devices."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/sign-in" className="text-cyan-300 transition hover:text-cyan-200">
            Sign in here
          </Link>
          .
        </>
      }
    >
      <SignUp path="/sign-up" routing="path" signInUrl="/sign-in" fallbackRedirectUrl="/" />
    </AuthShell>
  );
}
