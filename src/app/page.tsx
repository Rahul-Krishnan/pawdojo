import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <Image
        src="/images/logo-with-title.svg"
        alt="Paw Dojo: Focus. Tricks. Treats."
        width={280}
        height={280}
        priority
        className="rounded-3xl"
      />

      <div className="mt-6 flex gap-6 text-center">
        <div className="flex flex-col items-center gap-1">
          <Image src="/images/focus.svg" alt="" width={48} height={48} />
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Focus</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Image src="/images/xp.svg" alt="" width={48} height={48} />
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">XP</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Image src="/images/award.svg" alt="" width={48} height={48} />
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Awards</span>
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
