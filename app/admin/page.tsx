import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminPageClient } from "@/components/admin/admin-page-client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

const adminEmailSet: Set<string> = new Set(
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean)
);

export default async function AdminPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/");
  }

  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  const isAdmin =
    dbUser?.role === "admin" ||
    (session.user.email ? adminEmailSet.has(session.user.email) : false);

  if (!isAdmin) {
    redirect("/");
  }

  return <AdminPageClient />;
}
