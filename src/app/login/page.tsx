import { AuthForm } from "@/components/auth/auth-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="mb-8 text-3xl font-bold">Goodboy</h1>
      <AuthForm />
    </main>
  );
}
