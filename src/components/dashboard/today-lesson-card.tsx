import Link from "next/link";

export function TodayLessonCard({
  lessonId,
  title,
  skillName,
  pathOrder,
  totalLessons,
}: {
  lessonId: string;
  title: string;
  skillName: string;
  pathOrder: number;
  totalLessons: number;
}) {
  return (
    <Link
      href={`/lesson/${lessonId}`}
      className="block rounded-xl border border-blue-200 bg-blue-50 p-6 transition-colors hover:bg-blue-100"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-blue-500">
        {skillName} · Lesson {pathOrder} of {totalLessons}
      </p>
      <h2 className="mt-2 text-lg font-semibold text-blue-900">{title}</h2>
      <p className="mt-3 text-sm font-medium text-blue-600">
        Start Training →
      </p>
    </Link>
  );
}
