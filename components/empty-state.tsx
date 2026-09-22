import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  children: ReactNode;
};

export function EmptyState({ title, children }: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card px-6 py-10 text-center">
      <h2 className="text-base font-medium text-foreground">{title}</h2>
      <div className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        {children}
      </div>
    </div>
  );
}
