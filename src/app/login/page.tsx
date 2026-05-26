import { AuthForm } from "@/components/auth/auth-form";
import Image from "next/image";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <Image
        src="/images/logo-with-title.svg"
        alt="Paw Dojo"
        width={280}
        height={140}
        priority
      />
      <div className="mt-6 w-full max-w-sm">
        <AuthForm />
      </div>
    </main>
  );
}
