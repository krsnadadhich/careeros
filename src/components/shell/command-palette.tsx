"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { NAV_ITEMS } from "@/config/site";

interface PaletteItem {
  kind: "NAV" | "ACTION";
  label: string;
  onSelect: () => void;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);

  function openPalette() {
    setQuery("");
    setOpen(true);
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => {
          if (!o) setQuery("");
          return !o;
        });
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("careeros:open-palette", openPalette);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("careeros:open-palette", openPalette);
    };
  }, []);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  if (!open) return null;

  const items: PaletteItem[] = [
    ...NAV_ITEMS.filter((n) => !n.soon).map((n) => ({
      kind: "NAV" as const,
      label: `Go to ${n.label}`,
      onSelect: () => router.push(n.href),
    })),
    {
      kind: "ACTION",
      label: "Toggle theme",
      onSelect: () => setTheme(resolvedTheme === "dark" ? "light" : "dark"),
    },
  ];

  const filtered = query.trim()
    ? items.filter((i) => i.label.toLowerCase().includes(query.trim().toLowerCase()))
    : items;

  function run(item: PaletteItem) {
    setOpen(false);
    item.onSelect();
  }

  return (
    <div
      onClick={() => setOpen(false)}
      className="fixed inset-0 z-80 flex items-start justify-center bg-black/55 pt-28"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[60vh] w-[560px] flex-col overflow-hidden rounded-xl border border-line-strong bg-surface-1 shadow-2xl"
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search jobs, emails, companies, applications..."
          className="border-b border-line bg-transparent px-4.5 py-4 text-sm text-foreground outline-none placeholder:text-text3"
        />
        <div className="overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="px-4.5 py-6 text-center text-xs text-text3">
              Search will be available once your data is connected.
            </div>
          ) : (
            filtered.map((item) => (
              <button
                key={item.label}
                onClick={() => run(item)}
                className="flex w-full items-center gap-2.5 px-4.5 py-2.5 text-left text-[13px] hover:bg-surface-2"
              >
                <span className="w-13 flex-none font-mono text-[9.5px] text-text3">
                  {item.kind}
                </span>
                <span className="flex-1">{item.label}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
