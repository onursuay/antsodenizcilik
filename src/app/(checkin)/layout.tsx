import { createServerSupabase } from "@/lib/supabase/server";
import { requireOperator } from "@/lib/auth/guards";
import { CheckinHeader } from "@/components/layout/checkin-header";

export default async function CheckinLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabase();
  const user = await requireOperator(supabase);

  return (
    <div className="min-h-screen bg-slate-50">
      <CheckinHeader operatorEmail={user.email ?? "Operator"} />
      <main className="mx-auto max-w-lg p-4">{children}</main>
    </div>
  );
}
