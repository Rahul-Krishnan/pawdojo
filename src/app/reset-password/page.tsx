import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import Image from "next/image";

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <Image
        src="/images/logo-with-title.svg"
        alt="Paw Dojo"
        width={200}
        height={100}
        priority
        className="rounded-3xl"
      />
      <h1 className="mt-4 text-xl font-bold font-heading text-gray-900 dark:text-gray-50">
        Set New Password
      </h1>
      <div className="mt-6 w-full max-w-sm">
        <ResetPasswordForm />
      </div>
    </main>
  );
}
