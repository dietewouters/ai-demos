import * as React from "react";

export type DataPoint = {
  f?: 0 | 1;
  t1?: 0 | 1;
  t2?: 0 | 1;
};

export type ExpandedDataPoint = {
  source_row: number;
  f: 0 | 1;
  t1: 0 | 1;
  t2: 0 | 1;
  missing_f: boolean;
  missing_t1: boolean;
  missing_t2: boolean;
  weight: number;
  // voeg andere velden toe als jouw project die heeft
};

type Props = {
  data: DataPoint[]; // ruwe input (met undefineds)
  expandedData: ExpandedDataPoint[]; // jouw bestaande “expanded & weights”
  currentStep: string;
  selectedRow: number | null;
  onRowClick: (rowIndex: number) => void; // index in originele data (0-based)
  getRowHighlight: (row: ExpandedDataPoint) => string;
  weightLabel: (row: ExpandedDataPoint) => string;
  startSteps?: string[]; // optioneel: welke stepnamen tellen als “begin”
};

export default function TrainingDataTable({
  data,
  expandedData,
  currentStep,
  selectedRow,
  onRowClick,
  getRowHighlight,
  weightLabel,
  startSteps = ["idle", "start", "init"], // pas aan als jouw beginstap anders heet
}: Props) {
  // 1) Ben ik in het “begin”-scherm?
  const isInitial = startSteps.includes(currentStep);

  // 2) Maak beginscherm-rijen in *hetzelfde type* als ExpandedDataPoint
  const initialRows: ExpandedDataPoint[] = React.useMemo(
    () =>
      data.map((p, i) => ({
        source_row: i + 1,
        // numerieke placeholders; we tonen “?” in de cellen via missing_* flags
        f: (p.f ?? 0) as 0 | 1,
        t1: (p.t1 ?? 0) as 0 | 1,
        t2: (p.t2 ?? 0) as 0 | 1,
        missing_f: p.f === undefined,
        missing_t1: p.t1 === undefined,
        missing_t2: p.t2 === undefined,
        weight: 1, // irrelevant in beginscherm; we tonen “—”
      })),
    [data]
  );

  // 3) Kies welke set we tonen
  const rowsToRender = isInitial ? initialRows : expandedData;

  // 4) Titel
  const title = isInitial
    ? "Input Data (raw)"
    : "Training Data (expanded) & Weights";

  return (
    <section className="mb-6">
      <h4 className="font-semibold mb-2">{title}</h4>

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

            return (
              <tr
                key={idx}
                className={`cursor-pointer hover:bg-gray-50 ${
                  selectedRow === originalRowIndex
                    ? "bg-yellow-200 border-2 border-yellow-400"
                    : ""
                } ${getRowHighlight(row)}`}
                onClick={() => onRowClick(originalRowIndex)}
              >
                <td className="border border-gray-300 px-3 py-2 text-center font-semibold">
                  {row.source_row}
                </td>

                <td
                  className={`border border-gray-300 px-3 py-2 text-center font-mono ${
                    row.missing_f ? "font-bold" : ""
                  }`}
                >
                  {isInitial && row.missing_f ? "?" : row.f}
                </td>

                <td
                  className={`border border-gray-300 px-3 py-2 text-center font-mono ${
                    row.missing_t1 ? "font-bold" : ""
                  }`}
                >
                  {isInitial && row.missing_t1 ? "?" : row.t1}
                </td>

                <td
                  className={`border border-gray-300 px-3 py-2 text-center font-mono ${
                    row.missing_t2 ? "font-bold" : ""
                  }`}
                >
                  {isInitial && row.missing_t2 ? "?" : row.t2}
                </td>

                <td className="border border-gray-300 px-3 py-2 text-center">
                  <div className="space-y-1">
                    <div className="font-mono text-xs">
                      {isInitial ? "—" : row.weight.toFixed(3)}
                    </div>
                    {!isInitial && (
                      <div className="text-xs text-gray-700">
                        {weightLabel(row)}
                      </div>
                    )}
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
