import Link from "next/link";
import { StarIcon } from "@/components/icons";

export function SessionCard({
  skillName,
  rating,
  reps,
  durationMin,
  notes,
  loggedAt,
  href,
}: {
  skillName: string;
  rating: number;
  reps?: number | null;
  durationMin?: number | null;
  notes?: string | null;
  loggedAt: string;
  href?: string;
}) {
  const content = (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
          {skillName}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {new Date(loggedAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </p>
      </div>
      <div className="mt-1 flex items-center gap-3">
        <div className="flex gap-0.5">
          {Array.from({ length: 5 }).map((_, index) => (
            <StarIcon
              key={index}
              size={12}
              className={index < rating ? "text-accent-400" : "text-gray-200 dark:text-gray-600"}
            />
          ))}
        </div>
        {(reps || durationMin) && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {[
              reps ? `${reps}+ reps` : null,
              durationMin ? `${durationMin} min` : null,
            ].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>
      {notes && (
        <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400 italic">
          {notes}
        </p>
      )}
    </>
  );

  const className = "block rounded-xl bg-surface-elevated dark:bg-dark-muted border border-gray-100 dark:border-dark-border px-4 py-3 transition-colors hover:bg-surface-muted dark:hover:bg-dark-border";

  if (href) {
    return <Link href={href} className={className}>{content}</Link>;
  }

  return <div className="rounded-xl bg-surface-elevated dark:bg-dark-muted border border-gray-100 dark:border-dark-border px-4 py-3">{content}</div>;
}
