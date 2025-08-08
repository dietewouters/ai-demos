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

type Props = {
  variables: string[];
  initialDomains: Record<string, string[]>;
  snapshot: Snapshot | null;
};

function isEliminated(initial: string[], current: string[], value: string) {
  return initial.includes(value) && !current.includes(value);
}

export default function DomainTable({
  variables,
  initialDomains,
  snapshot,
}: Props) {
  const domains = snapshot?.domains ?? initialDomains;
  const assignment = snapshot?.assignment ?? {};
  const prunedStep = snapshot?.prunedThisStep ?? [];
  const currentVar = snapshot?.focus?.variable;

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
                          "px-2",
                          isAssigned
                            ? "bg-emerald-500 hover:bg-emerald-500 text-white"
                            : "",
                          eliminated ? "line-through opacity-60" : "",
                          prunedNow ? "ring-2 ring-red-400" : "",
                        ].join(" ")}
                        title={
                          isAssigned
                            ? "Gekozen"
                            : eliminated
                            ? "Geëlimineerd"
                            : "Beschikbaar"
                        }
                      >
                        {val}
                      </Badge>
                    );
                  })}
                </TableCell>
                <TableCell>
                  {assigned ? (
                    <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white">
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
