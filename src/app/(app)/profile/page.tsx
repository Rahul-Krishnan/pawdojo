import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Image from "next/image";
import { UserIcon } from "@/components/icons";
import { SettingsPanel } from "@/components/profile/settings-panel";
import { SignOutButton } from "@/components/profile/sign-out-button";
import { EditDogForm } from "@/components/profile/edit-dog-form";
import { TimezoneSelector } from "@/components/profile/timezone-selector";

function formatAge(birthday: string | null): string {
  if (!birthday) return "Good dog";
  const born = new Date(birthday + "T00:00:00");
  const now = new Date();
  const totalMonths =
    (now.getFullYear() - born.getFullYear()) * 12 +
    (now.getMonth() - born.getMonth());
  if (totalMonths < 1) return "< 1 month old";
  if (totalMonths < 12) return `${totalMonths} month${totalMonths === 1 ? "" : "s"} old`;
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  if (months === 0) return `${years} year${years === 1 ? "" : "s"} old`;
  return `${years}y ${months}m old`;
}

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: profile }, { data: dog }] = await Promise.all([
    supabase.from("user_profiles").select("*").eq("id", user.id).single(),
    supabase.from("dogs").select("*").eq("user_id", user.id).single(),
  ]);

  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="mb-5 text-2xl font-bold font-heading text-gray-900 dark:text-gray-50">Profile</h1>

      {dog && (
        <div className="mb-4 rounded-2xl border border-gray-100 dark:border-dark-border bg-surface-elevated dark:bg-dark-elevated p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Image src="/images/logo.png" alt="" width={48} height={48} className="rounded-full" />
              <div>
                <h2 className="text-lg font-bold font-heading text-gray-900 dark:text-gray-50">{dog.name}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {[dog.breed, formatAge(dog.birthday)]
                    .filter((val) => val && val !== "Good dog")
                    .join(" · ") || "Good dog"}
                </p>
              </div>
            </div>
            <EditDogForm
              dogId={dog.id}
              initialName={dog.name}
              initialBreed={dog.breed}
              initialBirthday={dog.birthday}
            />
          </div>
        </div>
      )}

      <div className="mb-6 rounded-2xl border border-gray-100 dark:border-dark-border bg-surface-elevated dark:bg-dark-elevated p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-dark-muted">
              <UserIcon size={24} className="text-gray-500 dark:text-gray-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Account</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Timezone: {profile?.timezone ?? "UTC"}
                </p>
                <TimezoneSelector currentTimezone={profile?.timezone ?? "UTC"} />
              </div>
            </div>
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
