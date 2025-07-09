"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { Inter } from "next/font/google";

// Map of links to display in the side navigation.
// Depending on the size of the application, this would be stored in a database.
const links = [
  {
    name: "Search",
    href: "/mainpage/search",
  },
  {
    name: "Advanced Search and Games",
    href: "/mainpage/advancedsearchandgames",
  },
  { name: "CSP", href: "/mainpage/csp" },
  { name: "Propositional Logic", href: "/mainpage/propositionallogic" },
  { name: "First Order Logic", href: "/mainpage/firstorderlogic" },
  { name: "Probability", href: "/mainpage/probability" },
  { name: "LLMs", href: "/mainpage/llms" },
  { name: "Bayesian Nets", href: "/mainpage/bayesiannets" },
  { name: "Solvers", href: "/mainpage/solvers" },
  { name: "ML", href: "/mainpage/ml" },
  { name: "Bayesian Learning", href: "/mainpage/bayesianlearning" },
];

export default function NavLinks() {
  const pathname = usePathname();
  return (
    <>
      {links.map((link) => {
        return (
          <Link
            key={link.name}
            href={link.href}
            className={clsx(
              "flex h-[48px] grow items-center justify-center gap-2 rounded-md bg-gray-50 p-3 text-sm font-medium hover:bg-sky-100 hover:text-blue-600 md:flex-none md:justify-start md:p-2 md:px-3",
              {
                "bg-sky-100 text-blue-600": pathname === link.href,
              }
            )}
          >
            <p className="hidden md:block">{link.name}</p>
          </Link>
        );
      })}
    </>
  );
}
