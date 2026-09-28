import { isGoogleAuthConfigured } from "@/config/env";
import { SITE_NAME } from "@/config/site";
import { GoogleSignInButton } from "@/components/shell/google-sign-in-button";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-lg border border-line bg-surface-1 p-8">
        <div className="mb-6 flex items-center gap-2">
          <div className="size-5 flex-none rounded-[5px] bg-brand" />
          <span className="text-sm font-semibold tracking-tight">{SITE_NAME}</span>
        </div>
        <h1 className="text-lg font-semibold">Sign in</h1>
        <p className="mt-1 text-sm text-text2">
          Your personal AI job-search command center.
        </p>
        <div className="mt-6">
          <GoogleSignInButton disabled={!isGoogleAuthConfigured} />
          {!isGoogleAuthConfigured && (
            <p className="mt-3 text-xs text-text3">
              Google sign-in isn&apos;t configured yet. Add GOOGLE_CLIENT_ID and
              GOOGLE_CLIENT_SECRET to .env to enable it.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
