import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminPageClient } from "@/components/admin/admin-page-client";
import { auth } from "@/lib/auth";

export default async function AdminPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/");
  }

  return <AdminPageClient />;
}
