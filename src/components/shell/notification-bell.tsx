"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NotificationItem {
  id: string;
  icon: string;
  text: string;
  time: string;
}

export function NotificationBell({ notifications }: { notifications: NotificationItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "relative flex size-8 items-center justify-center rounded-md border border-line text-text2 hover:border-line-strong"
        )}
        aria-label="Notifications"
      >
        <Bell className="size-4" />
        {notifications.length > 0 && (
          <span className="absolute top-1 right-1.5 size-1.5 rounded-full bg-danger" />
        )}
      </button>

      {open && (
        <div className="animate-in fade-in absolute top-10 right-0 z-40 w-[300px] overflow-hidden rounded-lg border border-line-strong bg-surface-1 shadow-2xl duration-100">
          <div className="border-b border-line px-3.5 py-2.5 text-[11px] font-semibold tracking-wide text-text3 uppercase">
            Notifications
          </div>
          {notifications.length === 0 ? (
            <div className="px-3.5 py-6 text-center text-[12.5px] text-text3">
              Nothing yet — connect Gmail to start tracking your search.
            </div>
          ) : (
            notifications.map((n) => (
              <div key={n.id} className="flex gap-2.5 border-b border-line px-3.5 py-2.5 text-[12.5px] last:border-b-0">
                <span>{n.icon}</span>
                <div className="flex-1">
                  <div className="text-foreground">{n.text}</div>
                  <div className="mt-0.5 text-[11px] text-text3">{n.time}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
