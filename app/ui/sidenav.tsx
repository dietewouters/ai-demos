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
        <span className="text-lg font-bold tracking-wide text-white">
          Artificial&nbsp;Intelligence
        </span>
      </Link>

      {/* Navigatie‑links */}
      <nav className="flex-1 px-3 py-4">
        <NavLinks />
      </nav>

      <a
        href="mailto:rik.adriaensen@kuleuven.be,lucas.vanpraet@kuleuven.be?subject=Feedback%20on%20the%20demos"
        className="fixed bottom-6 left-1/2 -translate-x-1/2 text-center inline-block px-4 py-2 rounded-full bg-blue-500 text-white font-semibold shadow transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 text-[14px]"
      >
        Send feedback
      </a>
    </aside>
  );
}
