import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminPageClient } from "@/components/admin/admin-page-client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

function isAdminEmail(email: string): boolean {
  const adminEmails = process.env.ADMIN_EMAILS;
  if (!adminEmails) {
    return false;
  }
  return adminEmails
    .split(",")
    .map((e) => e.trim())
    .includes(email);
}

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
    (session.user.email ? isAdminEmail(session.user.email) : false);

  if (!isAdmin) {
    redirect("/");
  }

  return <AdminPageClient />;
}
