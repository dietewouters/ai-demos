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
    children: [
      { name: "Search", href: "/mainpage/search/session1" },
      { name: "Advanced Search & Games", href: "/mainpage/search/session2" },
    ],
  },
  {
    name: "CSP",
    href: "/mainpage/csp",
    children: [
      { name: "General", href: "/mainpage/csp/general" },
      { name: "Forward checking", href: "/mainpage/csp/fc" },
      { name: "AC-3", href: "/mainpage/csp/ac-3" },
    ],
  },

  { name: "Propositional Logic", href: "/mainpage/propositionallogic" },
  { name: "First Order Logic", href: "/mainpage/firstorderlogic" },
  { name: "Probability", href: "/mainpage/probability" },
  {
    name: "LLMs",
    href: "/mainpage/llms",
    children: [{ name: "General", href: "/mainpage/llms/general" }],
  },
  {
    name: "Bayesian Nets",
    href: "/mainpage/bayesiannets",
    children: [
      { name: "General", href: "/mainpage/bayesiannets/general" },
      { name: "Construction", href: "/mainpage/bayesiannets/construction" },
      {
        name: "Markov Blanket",
        href: "/mainpage/bayesiannets/markovblanket",
      },
      { name: "Independence", href: "/mainpage/bayesiannets/dsep" },
    ],
  },
  { name: "Solvers", href: "/mainpage/solvers" },
  { name: "ML", href: "/mainpage/ml" },
  { name: "Bayesian Learning", href: "/mainpage/bayesianlearning" },
];

type LinkItem = {
  name: string;
  href: string;
  children?: LinkItem[];
};

export default function NavLinks() {
  const pathname = usePathname();

  function SidebarItem({
    item,
    depth = 0,
  }: {
    item: LinkItem;
    depth?: number;
  }) {
    const exactActive = pathname === item.href;
    const descendantActive =
      !exactActive && pathname.startsWith(item.href + "/");

    const showChildren = exactActive || descendantActive;

    const indent = depth * 12;

    return (
      <>
        <Link
          href={item.href}
          className={clsx(
            "flex h-12 items-center gap-2 rounded-md px-3 text-sm font-medium",
            exactActive && "bg-sky-100 text-blue-600",
            descendantActive && "bg-sky-50 text-blue-600",
            !exactActive && !descendantActive && "hover:bg-gray-100",
            depth > 0 && "before:mr-2 before:text-gray-400"
          )}
          style={{ paddingLeft: indent + 16 }}
        >
          {item.name}
        </Link>

        {showChildren &&
          item.children?.map((child) => (
            <SidebarItem key={child.href} item={child} depth={depth + 1} />
          ))}
      </>
    );
  }

  return (
    <>
      {links.map((link) => (
        <SidebarItem key={link.href} item={link} />
      ))}
    </>
  );
}
