import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: dog } = await supabase
    .from("dogs")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return (
    <div className="px-4 pt-6">
      <h1 className="mb-6 text-2xl font-bold">Profile</h1>

      {dog && (
        <div className="mb-6 rounded-xl bg-gray-50 p-6">
          <h2 className="text-lg font-semibold">{dog.name}</h2>
          {dog.breed && (
            <p className="text-sm text-gray-500">{dog.breed}</p>
          )}
          {dog.age_months && (
            <p className="text-sm text-gray-500">
              {dog.age_months} months old
            </p>
          )}
        </div>
      )}

      <div className="rounded-xl bg-gray-50 p-6">
        <h2 className="mb-2 text-lg font-semibold">Account</h2>
        <p className="text-sm text-gray-600">{user.email}</p>
        <p className="text-sm text-gray-500">
          Timezone: {profile?.timezone ?? "UTC"}
        </p>
      </div>
    </div>
  );
}
