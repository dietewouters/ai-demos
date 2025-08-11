"use client";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type Snapshot } from "@/components/csp/lib/csp-types";

type Highlight = {
  variable?: string;
  edge?: [string, string];
  neighbor?: string;
  tryingValue?: string | null;
} | null;

type Props = {
  variables: string[];
  initialDomains: Record<string, string[]>;
  snapshot: Snapshot | null;
  /** NIEUW: highlight van de huidige stap (b.v. try-value C=2) */
  highlight?: Highlight;
};

function isEliminated(initial: string[], current: string[], value: string) {
  return initial.includes(value) && !current.includes(value);
}

export default function DomainTable({
  variables,
  initialDomains,
  snapshot,
  highlight,
}: Props) {
  const domains = snapshot?.domains ?? initialDomains;
  const assignment = snapshot?.assignment ?? {};
  const prunedStep = snapshot?.prunedThisStep ?? [];
  const currentVar = snapshot?.focus?.variable;

  const hv = highlight?.variable;
  const trying = highlight?.tryingValue ?? null;

  return (
    <div className="w-full overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Variable</TableHead>
            <TableHead>Domain</TableHead>
            <TableHead className="w-[140px]">Assigned</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {variables.map((v) => {
            const init = initialDomains[v] ?? [];
            const curr = domains[v] ?? [];
            const assigned = assignment[v] ?? null;

            return (
              <TableRow
                key={v}
                className={currentVar === v ? "bg-emerald-50/50" : undefined}
              >
                <TableCell className="font-medium">{v}</TableCell>
                <TableCell className="space-x-1">
                  {init.map((val) => {
                    const eliminated = isEliminated(init, curr, val);
                    const isAssigned = assigned === val;

                    const isTrying = hv === v && trying === val;

                    const prunedNow = prunedStep.some(
                      (p) => p.variable === v && p.value === val
                    );

                    return (
                      <Badge
                        key={val}
                        variant={
                          isAssigned
                            ? "default"
                            : eliminated
                            ? "secondary"
                            : "outline"
                        }
                        className={[
                          "px-2 transition-colors",
                          isAssigned
                            ? "bg-blue-400 hover:bg-blue-400 text-white"
                            : "",
                          eliminated ? "line-through opacity-60" : "",
                          prunedNow ? "ring-2 ring-red-400" : "",
                          isTrying
                            ? "bg-amber-100 text-amber-900 ring-2 ring-amber-400"
                            : "",
                        ].join(" ")}
                        title={
                          isAssigned
                            ? "Chosen"
                            : eliminated
                            ? "Eliminated"
                            : isTrying
                            ? "Currently checking this value"
                            : "Available"
                        }
                      >
                        {val}
                      </Badge>
                    );
                  })}
                </TableCell>
                <TableCell>
                  {assigned ? (
                    <Badge className="bg-blue-400 hover:bg-blue-400 text-white">
                      {assigned}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
