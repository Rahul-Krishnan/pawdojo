import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DogForm } from "@/components/onboarding/dog-form";
import Image from "next/image";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: dogs } = await supabase
    .from("dogs")
    .select("id")
    .eq("user_id", user.id)
    .limit(1);

  const hasExistingDogs = dogs && dogs.length > 0;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <Image src="/images/logo.svg" alt="Paw Dojo" width={80} height={80} priority />
      <h1 className="mt-4 text-2xl font-bold font-heading text-gray-900 dark:text-gray-50">
        {hasExistingDogs ? "Add another dog" : "Tell us about your dog"}
      </h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {hasExistingDogs
          ? "Each dog gets their own training progress."
          : "We\u0027ll personalize your training plan."}
      </p>
      <div className="mt-8 w-full max-w-sm">
        <DogForm />
      </div>
    </main>
  );
}
