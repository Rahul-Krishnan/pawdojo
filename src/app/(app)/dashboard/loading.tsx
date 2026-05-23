export default function DashboardLoading() {
  return (
    <div className="px-4 pt-6 animate-pulse">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <div className="h-3 w-20 rounded bg-gray-200" />
          <div className="mt-2 h-7 w-32 rounded bg-gray-200" />
        </div>
        <div className="h-10 w-10 rounded-full bg-gray-200" />
      </header>

      <div className="mb-5 flex gap-3">
        <div className="flex-1 h-28 rounded-2xl bg-gray-100" />
        <div className="flex-1 h-28 rounded-2xl bg-gray-100" />
      </div>

      <div className="h-32 rounded-2xl bg-gray-100" />

      <div className="mt-6">
        <div className="h-4 w-28 rounded bg-gray-200 mb-3" />
        <div className="space-y-2">
          <div className="h-16 rounded-xl bg-gray-100" />
          <div className="h-16 rounded-xl bg-gray-100" />
          <div className="h-16 rounded-xl bg-gray-100" />
        </div>
      </div>
    </div>
  );
}
