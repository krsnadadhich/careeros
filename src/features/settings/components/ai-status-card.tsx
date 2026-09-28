"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { testAiConnectionAction, testLayaConnectionAction } from "../actions";

type Status = "idle" | "reachable" | "unreachable";

function StatusRow({
  label,
  status,
  onTest,
  isPending,
}: {
  label: React.ReactNode;
  status: Status;
  onTest: () => void;
  isPending: boolean;
}) {
  const dotClass =
    status === "reachable" ? "bg-success" : status === "unreachable" ? "bg-destructive" : "bg-text3";

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className={`size-1.5 flex-none rounded-full ${dotClass}`} />
        <span className="text-[13px] text-text2">{label}</span>
      </div>
      <Button size="sm" variant="outline" onClick={onTest} disabled={isPending}>
        {isPending ? "Testing…" : "Test Connection"}
      </Button>
    </div>
  );
}

export function AiStatusCard({ providerName }: { providerName: string }) {
  const [aiStatus, setAiStatus] = useState<Status>("idle");
  const [layaStatus, setLayaStatus] = useState<Status>("idle");
  const [aiPending, startAiTransition] = useTransition();
  const [layaPending, startLayaTransition] = useTransition();

  function onTestAi() {
    startAiTransition(async () => {
      const result = await testAiConnectionAction();
      setAiStatus(result.reachable ? "reachable" : "unreachable");
      if (result.reachable) toast.success(`${result.provider} is reachable.`);
      else toast.error(`${result.provider} did not respond.`);
    });
  }

  function onTestLaya() {
    startLayaTransition(async () => {
      const result = await testLayaConnectionAction();
      setLayaStatus(result.reachable ? "reachable" : "unreachable");
      if (result.reachable) toast.success("Laya is reachable.");
      else toast.error("Laya did not respond — email classification will use the AI provider instead.");
    });
  }

  return (
    <div className="rounded-lg border border-line bg-surface-1 px-5 py-4.5">
      <div className="text-[13px] font-semibold">System Status</div>

      <div className="mt-3 flex flex-col gap-2.5">
        <StatusRow
          label={
            <>
              AI provider: <span className="font-medium text-foreground">{providerName}</span>
            </>
          }
          status={aiStatus}
          onTest={onTestAi}
          isPending={aiPending}
        />
        <StatusRow
          label={<>Classifier: <span className="font-medium text-foreground">laya</span></>}
          status={layaStatus}
          onTest={onTestLaya}
          isPending={layaPending}
        />
      </div>

      <p className="mt-3 text-xs text-text3">
        The AI provider is set by the <code className="text-text2">AI_PROVIDER</code> environment
        variable and can&apos;t be switched live from here — change it and restart the server to
        use a different provider. Laya classifies emails when reachable; sync falls back to the
        AI provider automatically when it isn&apos;t.
      </p>
    </div>
  );
}
