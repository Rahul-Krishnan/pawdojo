import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PawIcon, UserIcon } from "@/components/icons";
import { SettingsPanel } from "@/components/profile/settings-panel";
import { SignOutButton } from "@/components/profile/sign-out-button";

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
    <div className="px-4 pt-6 pb-4">
      <h1 className="mb-5 text-2xl font-bold font-heading text-gray-900">Profile</h1>

      {dog && (
        <div className="mb-4 rounded-2xl border border-gray-100 bg-surface-elevated p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100">
              <PawIcon size={24} className="text-primary-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-heading text-gray-900">{dog.name}</h2>
              <p className="text-sm text-gray-500">
                {[dog.breed, dog.age_months ? `${dog.age_months} months` : null]
                  .filter(Boolean)
                  .join(" · ") || "Good dog"}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 rounded-2xl border border-gray-100 bg-surface-elevated p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
            <UserIcon size={24} className="text-gray-500" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Account</h2>
            <p className="text-sm text-gray-500">{user.email}</p>
            <p className="text-xs text-gray-400">
              Timezone: {profile?.timezone ?? "UTC"}
            </p>
          </div>
        </div>
      </div>

      <SettingsPanel />

      <div className="mt-6">
        <SignOutButton />
      </div>
    </div>
  );
}
