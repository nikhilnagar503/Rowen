import AuthShell from '../../../src/features/auth/components/AuthShell';
import SignOutCard from '../../../src/features/auth/components/SignOutCard';

export default function SignOutPage() {
  return (
    <AuthShell
      title="Sign out"
      description="Leave your secured workspace safely. You can sign back in at any time to restore your cloud session."
    >
      <SignOutCard />
    </AuthShell>
  );
}
