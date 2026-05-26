import { AuthForm } from "@/components/auth/auth-form";
import Image from "next/image";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <Image
        src="/images/logo-with-title.svg"
        alt="Paw Dojo"
        width={200}
        height={100}
        priority
      />
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Sign in to start training</p>
      <div className="mt-8 w-full max-w-sm">
        <AuthForm />
      </div>
    </main>
  );
}
