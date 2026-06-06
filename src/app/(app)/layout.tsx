import { redirect } from "next/navigation";
import { BottomNav } from "@/components/layout/bottom-nav";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Defense in depth alongside middleware: verify a session at render time so
  // protected pages never render without auth, even if middleware is bypassed
  // or misconfigured. Fail closed: any error verifying the session redirects
  // to /login rather than surfacing an uncaught 500.
  let user = null;
  try {
    const supabase = await createClient();
    const result = await supabase.auth.getUser();
    user = result.data.user;
  } catch {
    redirect("/login");
  }

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="mx-auto min-h-screen max-w-lg pb-20">
      {children}
      <BottomNav />
    </div>
  );
}
