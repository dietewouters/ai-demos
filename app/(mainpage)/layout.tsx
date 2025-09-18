import SideNav from "@/app/ui/sidenav";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* ───────────────── Sidebar ───────────────── */}
      <aside className="fixed inset-y-0 left-0 z-50 w-64 overflow-y-auto bg-white">
        <SideNav />
      </aside>

      {/* ──────────────── Content ────────────────── */}
      <main className="md:ml-64 flex-1 p-6 md:overflow-y-auto md:p-12">
        {children}
      </main>
    </>
  );
}
