import { redirect } from "next/navigation";
import { getSession } from "../../lib/auth/session";
import { NavBar } from "../../components/ui/nav-bar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main-content" className="skip-to-main">
        Skip to main content
      </a>
      <NavBar username={session.user.username} />
      <main id="main-content" className="flex-1 p-4 md:p-6">{children}</main>
    </div>
  );
}
