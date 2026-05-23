import { AuthForm } from "@/components/auth/auth-form";
import { PawIcon } from "@/components/icons";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-100">
        <PawIcon size={30} className="text-primary-600" />
      </div>
      <h1 className="mt-4 text-2xl font-bold font-heading text-gray-900">
        Goodboy
      </h1>
      <p className="mt-1 text-sm text-gray-500">Sign in to start training</p>
      <div className="mt-8 w-full max-w-sm">
        <AuthForm />
      </div>
    </main>
  );
}
