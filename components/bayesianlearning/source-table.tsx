import * as React from "react";

export type DataPoint = { f?: 0 | 1; t1?: 0 | 1; t2?: 0 | 1 };
export type ExpandedDataPoint = {
  source_row: number;
  f: 0 | 1;
  t1: 0 | 1;
  t2: 0 | 1;
  missing_f: boolean;
  missing_t1: boolean;
  missing_t2: boolean;
  weight: number;
};

type Props = {
  data: DataPoint[];
  expandedData: ExpandedDataPoint[];
  currentStep: string;
  selectedRow: number | null;
  onRowClick: (rowIndex: number) => void;
  getRowHighlight?: (row: ExpandedDataPoint) => string;
  getCellHighlight?: (
    row: ExpandedDataPoint,
    col: "source" | "f" | "t1" | "t2" | "weight"
  ) => string;
  startSteps?: string[];
};

export default function TrainingDataTable({
  data,
  expandedData,
  currentStep,
  selectedRow,
  onRowClick,
  getRowHighlight,
  getCellHighlight,
  startSteps = ["idle", "start", "init"],
}: Props) {
  const isInitial = startSteps.includes(currentStep);
  const initialRows: ExpandedDataPoint[] = React.useMemo(
    () =>
      data.map((p, i) => ({
        source_row: i + 1,
        f: (p.f ?? 0) as 0 | 1,
        t1: (p.t1 ?? 0) as 0 | 1,
        t2: (p.t2 ?? 0) as 0 | 1,
        missing_f: p.f === undefined,
        missing_t1: p.t1 === undefined,
        missing_t2: p.t2 === undefined,
        weight: 0,
      })),
    [data]
  );
  const rowsToRender = isInitial ? initialRows : expandedData;
  const isGroupStart = (i: number) =>
    i === 0 || rowsToRender[i - 1].source_row !== rowsToRender[i].source_row;
  const isGroupEnd = (i: number) =>
    i === rowsToRender.length - 1 ||
    rowsToRender[i + 1].source_row !== rowsToRender[i].source_row;
  const tdBase = "border border-gray-300 px-3 py-2 text-center font-mono";
  const edgeColor = "border-neutral-700";

  return (
    <section className="mb-6">
      <h4 className="font-semibold mb-2">
        {isInitial ? "Input Data (raw)" : "Training Data (expanded) & Weights"}
      </h4>
      <table className="w-full border-collapse border border-gray-300 text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 px-3 py-2">Source Row</th>
            <th className="border border-gray-300 px-3 py-2">f</th>
            <th className="border border-gray-300 px-3 py-2">t₁</th>
            <th className="border border-gray-300 px-3 py-2">t₂</th>
            <th className="border border-gray-300 px-3 py-2">weight</th>
          </tr>
        </thead>
        <tbody>
          {rowsToRender.map((row, idx) => {
            const originalRowIndex = row.source_row - 1;

            // bepaal group-begins/ends (per aaneengesloten blok met zelfde source_row)
            const isStart =
              idx === 0 || rowsToRender[idx - 1].source_row !== row.source_row;
            const isEnd =
              idx === rowsToRender.length - 1 ||
              rowsToRender[idx + 1].source_row !== row.source_row;

            // rand-klassen: enkel rondom de groep, dunste binnenin
            const edgeColor = "border-neutral-700"; // subtiele donkergrijs
            const topCls =
              !isInitial && isStart ? `border-t-2 ${edgeColor}` : "";
            const bottomCls =
              !isInitial && isEnd ? `border-b-2 ${edgeColor}` : "";
            const leftEdgeCls = !isInitial ? `border-l-2 ${edgeColor}` : "";
            const rightEdgeCls = !isInitial ? `border-r-2 ${edgeColor}` : "";

            // basiscel
            const tdBase = `border border-gray-300 px-3 py-2 text-center font-mono`;
            const groupStart = !isInitial && isGroupStart(idx);
            const groupEnd = !isInitial && isGroupEnd(idx);
            return (
              <tr
                key={idx}
                className={`cursor-pointer hover:bg-gray-50 ${
                  selectedRow === originalRowIndex ? "bg-yellow-200" : ""
                } ${getRowHighlight ? getRowHighlight(row) : ""}`}
                onClick={() => onRowClick(originalRowIndex)}
              >
                <td
                  className={`border border-gray-300 px-3 py-2 text-center font-semibold
                ${leftEdgeCls} ${topCls} ${bottomCls} ${
                    getCellHighlight ? getCellHighlight(row, "source") : ""
                  }`}
                >
                  {row.source_row}
                </td>

                <td
                  className={`${tdBase} ${
                    row.missing_f ? "font-bold" : ""
                  } ${topCls} ${bottomCls} ${
                    getCellHighlight ? getCellHighlight(row, "f") : ""
                  }`}
                >
                  {isInitial && row.missing_f ? "?" : row.f}
                </td>
                <td
                  className={`${tdBase} ${
                    row.missing_t1 ? "font-bold" : ""
                  } ${topCls} ${bottomCls} ${
                    getCellHighlight ? getCellHighlight(row, "t1") : ""
                  }`}
                >
                  {isInitial && row.missing_t1 ? "?" : row.t1}
                </td>
                <td
                  className={`${tdBase} ${
                    row.missing_t2 ? "font-bold" : ""
                  } ${topCls} ${bottomCls} ${
                    getCellHighlight ? getCellHighlight(row, "t2") : ""
                  }`}
                >
                  {isInitial && row.missing_t2 ? "?" : row.t2}
                </td>
                <td
                  className={`${tdBase} ${topCls} ${bottomCls} ${rightEdgeCls} ${
                    getCellHighlight ? getCellHighlight(row, "weight") : ""
                  }`}
                >
                  <div className="space-y-1">
                    <div className="font-mono text-xs">
                      {isInitial
                        ? row.missing_f || row.missing_t1 || row.missing_t2
                          ? "—"
                          : "1"
                        : row.weight.toFixed(3)}
                    </div>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {isInitial && (
        <p className="mt-2 text-xs text-gray-500">“?” = niet geobserveerd.</p>
      )}
    </section>
  );
}
