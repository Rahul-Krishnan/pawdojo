import { AuthForm } from "@/components/auth/auth-form";
import Image from "next/image";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <Image
        src="/images/logo.svg"
        alt="Paw Dojo logo"
        width={80}
        height={80}
        priority
      />
      <h1 className="mt-3 text-2xl font-bold font-heading text-gray-900 dark:text-gray-50">
        Paw Dojo
      </h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Sign in to start training</p>
      <div className="mt-8 w-full max-w-sm">
        <AuthForm />
      </div>
    </main>
  );
}
