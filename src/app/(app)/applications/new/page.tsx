import { LogApplicationForm } from "@/features/applications/components/log-application-form";

export default function NewApplicationPage() {
  return (
    <div className="mx-auto max-w-[600px] px-8 py-6 pb-16">
      <div className="mb-1 text-lg font-semibold">Log Application</div>
      <p className="mb-5 text-xs text-text3">
        For a job you found and applied to outside CareerOS — this won&apos;t submit anything, it
        just starts tracking it here so future emails about it get linked automatically.
      </p>
      <LogApplicationForm />
    </div>
  );
}
