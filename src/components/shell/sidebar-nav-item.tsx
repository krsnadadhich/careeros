"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/config/site";

export function SidebarNavItem({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const active = pathname.startsWith(item.href);

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center justify-between rounded-md px-2.5 py-1.5 text-[13px] transition-colors hover:bg-surface-2",
        active ? "bg-surface-2 text-foreground" : "text-text2"
      )}
    >
      <span>{item.label}</span>
      {item.soon && (
        <span className="font-mono text-[10px] text-text3">soon</span>
      )}
    </Link>
  );
}
