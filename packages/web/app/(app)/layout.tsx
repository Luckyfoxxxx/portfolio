import { redirect } from "next/navigation";
import { getSession } from "../../lib/auth/session.js";
import { NavBar } from "../../components/ui/nav-bar.js";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen flex-col">
      <NavBar username={session.user.username} />
      <main className="flex-1 p-4 md:p-6">{children}</main>
    </div>
  );
}
