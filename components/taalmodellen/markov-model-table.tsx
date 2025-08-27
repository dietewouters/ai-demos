"use client";
import {
  convertMarkovModelChainToTableEntry,
  MarkovChainModelEntry,
  MarkovModel,
} from "./markov-model";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TokensRenderer } from "./autocomplete-box";
import { useLoadMarkovModel } from "./markov-model-store";
import { MarkovModelSelector } from "./markov-model-selector";

const MarkovModelTable: React.FC<{
  model: MarkovModel;
  maxRows?: number;
  showCount?: boolean;
  showProbability?: boolean;
}> = ({ model, maxRows = 100, showCount = true, showProbability = true }) => {
  const [currentMaxRows, setCurrentMaxRows] = useState<number>(maxRows);
  const tableData = useMemo(
    () => convertMarkovModelChainToTableEntry(model.chain),
    [model]
  );
  const loadMoreRef = useRef<HTMLTableCellElement>(null);

  // Group rows by context if nGram > 1; otherwise, treat all rows as a single group.
  let groups: [string, MarkovChainModelEntry[]][];
  if (model.n > 1) {
    const groupsMap = new Map<string, MarkovChainModelEntry[]>();
    tableData.forEach((row) => {
      const group = groupsMap.get(row.context) || [];
      group.push(row);
      groupsMap.set(row.context, group);
    });
    groups = Array.from(groupsMap.entries());
    // Sort groups descending by total count.
    groups.sort((a, b) => {
      const totalA = a[1].reduce((sum, row) => sum + row.count, 0);
      const totalB = b[1].reduce((sum, row) => sum + row.count, 0);
      return totalB - totalA;
    });
    // Sort each group's rows descending by count.
    groups = groups.map(([context, rows]) => [
      context,
      rows.sort((a, b) => b.count - a.count),
    ]);
  } else {
    groups = [["", tableData.sort((a, b) => b.count - a.count)]];
  }

  // Apply max rows by counting the rows per group until it's over the limit.
  let totalRows = 0;
  let maxRowsReached = false;
  const groupsToShow: [string, MarkovChainModelEntry[]][] = [];
  for (const [context, rows] of groups) {
    const rowsToShow: MarkovChainModelEntry[] = [];
    for (const row of rows) {
      if (totalRows >= currentMaxRows) {
        maxRowsReached = true;
        break;
      }
      rowsToShow.push(row);
      totalRows++;
    }
    groupsToShow.push([context, rowsToShow]);
    if (maxRowsReached) {
      break;
    }
  }
  const totalRowsWithoutLimit = groups.reduce(
    (sum, [, rows]) => sum + rows.length,
    0
  );

  // Keep scrolling if the user scrolls to the bottom of the table.
  useEffect(() => {
    if (!maxRowsReached) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setCurrentMaxRows((c) => c + maxRows);
        }
      },
      { threshold: 0.5 }
    );
    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }
    return () => {
      observer.disconnect();
    };
  }, [maxRowsReached, maxRows]);

  return (
    <div className="rounded-md border max-h-96 overflow-y-scroll">
      <Table>
        <TableHeader>
          <TableRow className="py-1 font-semibold">
            {model.order >= 1 && (
              <TableCell>Previous word{model.order > 1 && "s"}</TableCell>
            )}
            <TableCell>Next word</TableCell>
            {showCount && <TableCell className="text-right">Number</TableCell>}
            {showProbability && (
              <TableCell className="text-right">Probability</TableCell>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {groupsToShow.map(([context, rows], groupIndex) =>
            rows.map((row, rowIndex) => (
              <TableRow
                key={`${groupIndex}-${rowIndex}`}
                className={`py-1 ${
                  groupIndex % 2 === 0 ? "bg-gray-200" : "bg-gray-100"
                }`}
              >
                {model.order >= 1 && (
                  <TableCell>
                    <TokensRenderer tokens={context.split(" ")} />
                  </TableCell>
                )}
                <TableCell>
                  <TokensRenderer tokens={[row.nextWord]} />
                </TableCell>
                {showCount && (
                  <TableCell className="text-right">{row.count}</TableCell>
                )}
                {showProbability && (
                  <TableCell className="text-right">
                    {(row.probability * 100).toFixed(2)}%
                  </TableCell>
                )}
              </TableRow>
            ))
          )}

          {maxRowsReached && (
            <TableRow>
              <TableCell
                colSpan={4}
                className="text-center cursor-pointer "
                onClick={() => setCurrentMaxRows(currentMaxRows + maxRows)}
                ref={loadMoreRef}
              >
                ... Toon meer rijen ({currentMaxRows} /{" "}
                {totalRowsWithoutLimit - currentMaxRows})
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export const MarkovProbabilityTableView: React.FC<{
  model?: MarkovModel;
  modelName?: string;
  n?: number;
  showModelSelector?: boolean;
  showCount?: boolean;
  showProbability?: boolean;
}> = ({
  model,
  modelName,
  n,
  showModelSelector,
  showCount,
  showProbability,
}) => {
  const [currentModel, setCurrentModel] = useLoadMarkovModel(
    model,
    modelName,
    n
  );
  if (!currentModel) {
    return <div>Model not found</div>;
  }

  return (
    <div className="py-4 not-prose">
      {showModelSelector && (
        <MarkovModelSelector
          model={currentModel}
          onChangeAction={setCurrentModel}
        />
      )}
      <MarkovModelTable
        model={currentModel}
        showCount={showCount}
        showProbability={showProbability}
      />
    </div>
  );
};
