import { cn } from "@/lib/utils";

type Status = "final" | "draft" | "cancelled" | string;

const styles: Record<string, string> = {
  final: "bg-[hsl(var(--status-final-bg))] text-[hsl(var(--status-final-fg))]",
  draft: "bg-[hsl(var(--status-draft-bg))] text-[hsl(var(--status-draft-fg))]",
  cancelled: "bg-[hsl(var(--status-cancelled-bg))] text-[hsl(var(--status-cancelled-fg))]",
};

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  const key = String(status || "").toLowerCase();
  const style = styles[key] || "bg-muted text-muted-foreground";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        style,
        className,
      )}
    >
      {status}
    </span>
  );
}