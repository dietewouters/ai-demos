import Link from "next/link";
import NavLinks from "@/app/ui/navlinks";

export default function SideNav() {
  return (
    <aside
      className="fixed inset-y-0 left-0 z-40 w-64 overflow-y-auto
                 bg-white/80 backdrop-blur-sm border-r border-gray-200 shadow-sm
                 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent
                 dark:bg-slate-900/70 dark:border-slate-700 dark:scrollbar-thumb-slate-600"
    >
      {/* Logo / titel */}
      <Link
        href="/mainpage"
        className="flex h-16 items-center justify-start px-4 bg-blue-600"
      >
        <span className="text-lg font-semibold tracking-wide text-white">
          Artificiële&nbsp;intelligentie
        </span>
      </Link>

      {/* Navigatie‑links */}
      <nav className="flex-1 px-3 py-4">
        <NavLinks />
      </nav>
    </aside>
  );
}
