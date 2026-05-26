import { AuthForm } from "@/components/auth/auth-form";
import Image from "next/image";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="dark:bg-accent-200/20 dark:rounded-3xl dark:p-6">
        <Image
          src="/images/logo-with-title.svg"
          alt="Paw Dojo"
          width={280}
          height={140}
          priority
        />
      </div>
      <div className="mt-6 w-full max-w-sm">
        <AuthForm />
      </div>
    </main>
  );
}
