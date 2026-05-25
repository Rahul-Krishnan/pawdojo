import Link from "next/link";
import Image from "next/image";
import { FlameIcon, BoltIcon, TrophyIcon } from "@/components/icons";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <Image
        src="/images/logo.png"
        alt="Paw Dojo logo"
        width={160}
        height={160}
        priority
      />
      <h1 className="mt-4 text-4xl font-bold font-heading tracking-tight text-gray-900 dark:text-gray-50">
        Paw Dojo
      </h1>
      <p className="mt-2 text-center text-base text-gray-600 dark:text-gray-400">
        Focus. Tricks. Treats.
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
        className="mt-10 w-full max-w-xs rounded-2xl bg-primary-500 px-6 py-4 text-center text-base font-semibold text-white shadow-lg shadow-primary-500/25 transition-all hover:bg-primary-600 hover:shadow-xl active:scale-[0.98]"
      >
        Get Started
      </Link>
    </main>
  );
}
