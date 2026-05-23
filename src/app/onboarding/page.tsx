import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DogForm } from "@/components/onboarding/dog-form";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // If user already has a dog, skip onboarding
  const { data: dogs } = await supabase
    .from("dogs")
    .select("id")
    .eq("user_id", user.id)
    .limit(1);

  if (dogs && dogs.length > 0) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="mb-2 text-3xl font-bold">Tell us about your dog</h1>
      <p className="mb-8 text-gray-500">We&apos;ll personalize your training plan.</p>
      <DogForm userId={user.id} />
    </main>
  );
}
