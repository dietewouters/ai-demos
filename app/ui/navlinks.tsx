"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
// optional (als je lucide-react gebruikt): npm i lucide-react
import { ChevronRight } from "lucide-react";

type LinkItem = {
  name: string;
  href?: string; // <- optioneel: laat weg voor pure groep
  children?: LinkItem[];
};

// -------------------------------
// DATA: maak ouders groep-only door href weg te laten
// -------------------------------
const links: LinkItem[] = [
  {
    name: "Search",
    // href: "/mainpage/search",   // <- weglaten zodat dit GEEN tab is
    children: [
      { name: "Search", href: "/mainpage/search/session1" },
      { name: "Advanced Search", href: "/mainpage/search/session2" },
      { name: "Minimax", href: "/mainpage/search/minimax" },
    ],
  },
  {
    name: "CSP",
    // href: "/mainpage/csp",
    children: [
      { name: "Backtracking", href: "/mainpage/csp/general" },
      { name: "Forward checking", href: "/mainpage/csp/fc" },
      { name: "AC-3", href: "/mainpage/csp/ac-3" },
    ],
  },
  {
    name: "First Order Logic",
    // href: "/mainpage/firstorderlogic",
    children: [
      {
        name: "Most General Unifier",
        href: "/mainpage/firstorderlogic/unification",
      },
      {
        name: "Implicative Normal Form",
        href: "/mainpage/firstorderlogic/implicative",
      },
    ],
  },
  {
    name: "LLMs",
    // href: "/mainpage/llms",
    children: [{ name: "N-grams", href: "/mainpage/llms/general" }],
  },
  {
    name: "Bayesian Nets",
    // href: "/mainpage/bayesiannets",
    children: [
      { name: "Probabilities", href: "/mainpage/bayesiannets/general" },
      { name: "Construction", href: "/mainpage/bayesiannets/construction" },
      { name: "Markov Blanket", href: "/mainpage/bayesiannets/markovblanket" },
      { name: "Independence", href: "/mainpage/bayesiannets/dsep" },
    ],
  },
  {
    name: "Solvers",
    // href: "/mainpage/solvers",
    children: [
      { name: "SAT", href: "/mainpage/solvers/general" },
      { name: "WMC", href: "/mainpage/solvers/wmc" },
    ],
  },
  {
    name: "ML",
    // href: "/mainpage/ml",
    children: [
      { name: "K-Nearest Neighbours", href: "/mainpage/ml/knearestneighbours" },
      { name: "Naïve Bayes", href: "/mainpage/ml/naivebayes" },
      { name: "Neural Networks", href: "/mainpage/ml/neuralnet" },
    ],
  },
  {
    name: "Bayesian Learning",
    // href: "/mainpage/bayesianlearning",
    children: [
      {
        name: "Beta-Function",
        href: "/mainpage/bayesianlearning/beta-function",
      },
      { name: "HMM", href: "/mainpage/bayesianlearning/hmm" },
      {
        name: "Expectation Maximization",
        href: "/mainpage/bayesianlearning/expmax",
      },
    ],
  },
];

// hulpfunctie: heeft dit item (recursief) een actieve descendant?
function hasActiveDescendant(item: LinkItem, pathname: string): boolean {
  if (!item.children) return false;
  return item.children.some((child) => {
    if (child.href) {
      if (pathname === child.href || pathname.startsWith(child.href + "/")) {
        return true;
      }
    }
    return hasActiveDescendant(child, pathname);
  });
}

export default function NavLinks() {
  const pathname = usePathname();

  function SidebarItem({
    item,
    depth = 0,
  }: {
    item: LinkItem;
    depth?: number;
  }) {
    const indent = 16 + depth * 12;
    const isGroup = !!item.children?.length && !item.href;

    const exactActive = !!item.href && pathname === item.href;
    const descendantActive =
      !!item.href && !exactActive && pathname.startsWith(item.href + "/");

    // open een groep als een descendant actief is
    const activeInBranch = useMemo(
      () => hasActiveDescendant(item, pathname),
      [item, pathname]
    );

    const [expanded, setExpanded] = useState<boolean>(activeInBranch);

    // sync open/dicht met routewijziging (bijv. navigatie via links)
    useEffect(() => {
      if (isGroup) setExpanded(activeInBranch);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeInBranch]);

    // button-id voor aria-controls
    const idBase =
      item.name
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9\-]/g, "") +
      "-" +
      depth;

    if (isGroup) {
      return (
        <div>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setExpanded((v) => !v);
              }
            }}
            aria-expanded={expanded}
            aria-controls={`section-${idBase}`}
            className={clsx(
              "w-full flex h-12 items-center gap-2 rounded-md px-3 text-sm font-medium",
              (activeInBranch || expanded) && "bg-sky-50 text-blue-600",
              !activeInBranch && !expanded && "hover:bg-gray-100",
              depth > 0 && "before:mr-2 before:text-gray-400"
            )}
            style={{ paddingLeft: indent }}
          >
            <ChevronRight
              className={clsx("transition-transform", expanded && "rotate-90")}
              size={16}
              aria-hidden="true"
            />
            <span>{item.name}</span>
          </button>

          <div
            id={`section-${idBase}`}
            role="region"
            aria-label={item.name}
            className={clsx(
              "overflow-hidden transition-[max-height] duration-200 ease-in-out",
              expanded ? "max-h-[2000px]" : "max-h-0"
            )}
          >
            {item.children?.map((child) => (
              <SidebarItem
                key={(child.href ?? child.name) + depth}
                item={child}
                depth={depth + 1}
              />
            ))}
          </div>
        </div>
      );
    }

    // blad (echte link)
    return (
      <>
        <Link
          href={item.href!}
          className={clsx(
            "flex h-10 items-center gap-2 rounded-md px-3 text-sm font-medium",
            exactActive && "bg-sky-100 text-blue-600",
            descendantActive && "bg-sky-50 text-blue-600",
            !exactActive && !descendantActive && "hover:bg-gray-100",
            depth > 0 && "before:mr-2 before:text-gray-400"
          )}
          style={{ paddingLeft: indent }}
        >
          {item.name}
        </Link>
      </>
    );
  }

  return (
    <>
      {links.map((link) => (
        <SidebarItem key={link.name} item={link} />
      ))}
    </>
  );
}
