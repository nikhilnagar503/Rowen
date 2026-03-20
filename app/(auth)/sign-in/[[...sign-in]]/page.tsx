import { SignIn } from '@clerk/nextjs';
import Link from 'next/link';
import AuthShell from '../../../../src/features/auth/components/AuthShell';

export default function SignInPage() {
  return (
    <AuthShell
      title="Welcome back"
      description="Sign in to resume your CSVHero workspace and restore your Supabase-synced analysis history."
      footer={
        <>
          Need an account?{' '}
          <Link href="/sign-up" className="text-cyan-300 transition hover:text-cyan-200">
            Create one here
          </Link>
          .
        </>
      }
    >
      <SignIn path="/sign-in" routing="path" signUpUrl="/sign-up" fallbackRedirectUrl="/" />
    </AuthShell>
  );
}
