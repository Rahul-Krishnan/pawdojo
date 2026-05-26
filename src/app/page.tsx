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

      <Link
        href="/login"
        className="mt-10 w-full max-w-xs rounded-2xl bg-primary-500 px-6 py-4 text-center text-base font-semibold text-white shadow-lg shadow-primary-500/25 transition-all hover:bg-primary-600 hover:shadow-xl active:scale-[0.98]"
      >
        Get Started
      </Link>
    </main>
  );
}
