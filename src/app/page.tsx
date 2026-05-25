import Link from "next/link";
import { PawIcon, FlameIcon, BoltIcon, TrophyIcon } from "@/components/icons";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-100 dark:bg-primary-900/40">
        <PawIcon size={36} className="text-primary-600 dark:text-primary-400" />
      </div>
      <h1 className="mt-6 text-4xl font-bold font-heading tracking-tight text-gray-900 dark:text-gray-50">
        Pawdojo
      </h1>
      <p className="mt-3 text-center text-lg text-gray-500 dark:text-gray-400">
        Train your dog. Build streaks. Level up.
      </p>

      <div className="mt-8 flex gap-6 text-center">
        <div className="flex flex-col items-center gap-1">
          <FlameIcon size={24} className="text-streak" />
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Streaks</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <BoltIcon size={24} className="text-xp" />
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">XP</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <TrophyIcon size={24} className="text-badge" />
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Badges</span>
        </div>
      </div>

      <Link
        href="/login"
        className="mt-10 w-full max-w-xs rounded-2xl bg-primary-600 px-6 py-4 text-center text-base font-semibold text-white shadow-lg shadow-primary-600/25 transition-all hover:bg-primary-700 hover:shadow-xl active:scale-[0.98]"
      >
        Get Started
      </Link>
    </main>
  );
}
