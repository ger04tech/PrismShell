import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** A group of related controls inside the right panel. */
export function Panel({ title, children, className }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn("flex flex-col gap-4 rounded-xl bg-card p-4 surface", className)}>
      {title && <h2 className="text-[13px] font-semibold">{title}</h2>}
      {children}
    </section>
  );
}
