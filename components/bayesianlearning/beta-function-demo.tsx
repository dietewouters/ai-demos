"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";

// Beta function calculation
function betaFunction(a: number, b: number): number {
  // Using gamma function approximation: B(a,b) = Γ(a)Γ(b)/Γ(a+b)
  return (gamma(a) * gamma(b)) / gamma(a + b);
}

// Gamma function approximation using Stirling's approximation
function gamma(z: number): number {
  if (z === 1) return 1;
  if (z === 0.5) return Math.sqrt(Math.PI);
  if (z < 1) return gamma(z + 1) / z;

  // Stirling's approximation for larger values
  return Math.sqrt((2 * Math.PI) / z) * Math.pow(z / Math.E, z);
}

// Beta PDF calculation
function betaPDF(x: number, a: number, b: number): number {
  if (x <= 0 || x >= 1) return 0;
  const B = betaFunction(a, b);
  return (Math.pow(x, a - 1) * Math.pow(1 - x, b - 1)) / B;
}

// Generate curve points
function generateCurve(a: number, b: number, points = 200) {
  const data = [] as { x: number; y: number }[];
  for (let i = 0; i <= points; i++) {
    const x = i / points;
    const y = x === 0 || x === 1 ? 0 : betaPDF(x, a, b);
    data.push({ x, y });
  }
  return data;
}

const clamp = (v: number, min: number, max: number) =>
  Math.min(Math.max(v, min), max);
// pretty rounding for display (1 decimal), trims trailing .0 and fixes -0
const fmt1 = (n: number) => {
  const r = Math.round((n + Number.EPSILON) * 10) / 10;
  const s = r.toFixed(1).replace(/\.0$/, "");
  return s === "-0" ? "0" : s;
};

export default function BetaFunctionDemo() {
  const [a, setA] = useState([2]);
  const [b, setB] = useState([2]);

  // Generate curves for current parameters and reference curves
  const currentCurve = useMemo(() => generateCurve(a[0], b[0]), [a, b]);
  const referenceCurves = useMemo(
    () => ({
      uniform: generateCurve(1, 1),
      moderate: generateCurve(2, 2),
      peaked: generateCurve(5, 5),
    }),
    []
  );

  // Calculate statistics
  const mean = a[0] / (a[0] + b[0]);
  const variance =
    (a[0] * b[0]) / (Math.pow(a[0] + b[0], 2) * (a[0] + b[0] + 1));
  const mode = a[0] > 1 && b[0] > 1 ? (a[0] - 1) / (a[0] + b[0] - 2) : null;

  // SVG dimensions
  const width = 600;
  const height = 400;
  const margin = { top: 20, right: 20, bottom: 60, left: 60 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  // Scale functions
  const xScale = (x: number) => x * chartWidth + margin.left;
  const yScale = (y: number) => height - margin.bottom - (y * chartHeight) / 3;

  // Create path string for curves
  const createPath = (data: { x: number; y: number }[]) => {
    return data
      .map((d, i) => `${i === 0 ? "M" : "L"} ${xScale(d.x)} ${yScale(d.y)}`)
      .join(" ");
  };

  // Layout for above-chart mean badge
  const padTop = 52; // extra headroom for the badge
  const meanX = xScale(mean);
  const badgeW = 180;
  const badgeLeft = clamp(
    meanX - badgeW / 2,
    margin.left,
    width - margin.right - badgeW
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Parameters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                a: {a[0]}
              </label>
              <Slider
                value={a}
                onValueChange={setA}
                min={0.1}
                max={10}
                step={0.1}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                b: {b[0]}
              </label>
              <Slider
                value={b}
                onValueChange={setB}
                min={0.1}
                max={10}
                step={0.1}
                className="w-full"
              />
            </div>

            <div className="pt-4 border-t">
              <h4 className="font-medium mb-2">Quick Presets:</h4>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setA([1]);
                    setB([1]);
                  }}
                  className="w-full text-left p-2 rounded bg-red-50 hover:bg-red-100 text-sm"
                >
                  [1,1]
                </button>
                <button
                  onClick={() => {
                    setA([2]);
                    setB([2]);
                  }}
                  className="w-full text-left p-2 rounded bg-green-50 hover:bg-green-100 text-sm"
                >
                  [2,2]
                </button>
                <button
                  onClick={() => {
                    setA([5]);
                    setB([5]);
                  }}
                  className="w-full text-left p-2 rounded bg-purple-50 hover:bg-purple-100 text-sm"
                >
                  [5,5]
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Visualization */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Beta Distribution Visualization
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Wrapper adds headroom and hosts the above-chart mean badge */}
            <div className="relative" style={{ width, paddingTop: padTop }}>
              {/* Mean badge ABOVE the chart */}
              <div
                className="absolute z-10 select-none pointer-events-none rounded-md bg-white/95 shadow-sm ring-1 ring-amber-400 px-3 py-2 text-sm font-medium text-amber-800"
                style={{ left: badgeLeft, top: 6, width: badgeW }}
              >
                <div className="font-bold">μ = {mean.toFixed(3)}</div>
                <div className="font-mono text-xs">
                  a/(a+b) = {a[0]}/({a[0]}+{b[0]})
                </div>
              </div>

              <svg
                width={width}
                height={height}
                className="border rounded block"
              >
                {/* Grid lines & defs */}
                <defs>
                  <pattern
                    id="grid"
                    width="50"
                    height="50"
                    patternUnits="userSpaceOnUse"
                  >
                    <path
                      d="M 50 0 L 0 0 0 50"
                      fill="none"
                      stroke="#f0f0f0"
                      strokeWidth="1"
                    />
                  </pattern>
                </defs>

                <rect
                  width={chartWidth}
                  height={chartHeight}
                  x={margin.left}
                  y={margin.top}
                  fill="url(#grid)"
                />

                {/* Axes */}
                <line
                  x1={margin.left}
                  y1={height - margin.bottom}
                  x2={width - margin.right}
                  y2={height - margin.bottom}
                  stroke="black"
                  strokeWidth="2"
                />
                <line
                  x1={margin.left}
                  y1={margin.top}
                  x2={margin.left}
                  y2={height - margin.bottom}
                  stroke="black"
                  strokeWidth="2"
                />

                {/* X-axis labels */}
                {[0, 0.2, 0.4, 0.6, 0.8, 1.0].map((x) => (
                  <g key={x}>
                    <line
                      x1={xScale(x)}
                      y1={height - margin.bottom}
                      x2={xScale(x)}
                      y2={height - margin.bottom + 5}
                      stroke="black"
                    />
                    <text
                      x={xScale(x)}
                      y={height - margin.bottom + 20}
                      textAnchor="middle"
                      fontSize="12"
                    >
                      {x}
                    </text>
                  </g>
                ))}

                {/* Y-axis labels */}
                {[0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0].map((y) => (
                  <g key={y}>
                    <line
                      x1={margin.left - 5}
                      y1={yScale(y)}
                      x2={margin.left}
                      y2={yScale(y)}
                      stroke="black"
                    />
                    <text
                      x={margin.left - 10}
                      y={yScale(y) + 4}
                      textAnchor="end"
                      fontSize="12"
                    >
                      {y}
                    </text>
                  </g>
                ))}

                {/* Axis labels */}
                <text
                  x={width / 2}
                  y={height - 10}
                  textAnchor="middle"
                  fontSize="14"
                  fontWeight="bold"
                >
                  Parameter θ
                </text>
                <text
                  x={20}
                  y={height / 2}
                  textAnchor="middle"
                  fontSize="14"
                  fontWeight="bold"
                  transform={`rotate(-90, 20, ${height / 2})`}
                >
                  P(Θ = θ)
                </text>

                {/* Formula box */}
                <g transform="translate(80, 50)">
                  <rect
                    x="-5"
                    y="-15"
                    width="260"
                    height="35"
                    fill="white"
                    stroke="#ddd"
                    strokeWidth="1"
                    rx="3"
                  />
                  <text
                    x="0"
                    y="0"
                    fontSize="12"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    f(x) = x^(a-1) × (1-x)^(b-1) / B(a,b)
                  </text>
                  <text
                    x="0"
                    y="15"
                    fontSize="10"
                    fontFamily="monospace"
                    fill="#666"
                  >
                    {`Current: x^${fmt1(a[0] - 1)} × (1-x)^${fmt1(
                      b[0] - 1
                    )} / B(${fmt1(a[0])},${fmt1(b[0])})`}
                  </text>
                </g>

                {/* Reference curves (lighter) */}
                <path
                  d={createPath(referenceCurves.uniform)}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="2"
                  opacity="0.3"
                  strokeDasharray="5,5"
                />
                <path
                  d={createPath(referenceCurves.moderate)}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2"
                  opacity="0.3"
                  strokeDasharray="5,5"
                />
                <path
                  d={createPath(referenceCurves.peaked)}
                  fill="none"
                  stroke="#8b5cf6"
                  strokeWidth="2"
                  opacity="0.3"
                  strokeDasharray="5,5"
                />

                {/* Current curve */}
                <path
                  d={createPath(currentCurve)}
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="3"
                />

                {/* Mean band + line + axis pointer (kept inside chart) */}
                <rect
                  x={meanX - 4}
                  y={margin.top}
                  width={8}
                  height={chartHeight}
                  fill="#f59e0b"
                  opacity="0.08"
                />
                <line
                  x1={meanX}
                  y1={margin.top}
                  x2={meanX}
                  y2={height - margin.bottom}
                  stroke="#f59e0b"
                  strokeWidth={3}
                  strokeDasharray="4,3"
                />
                <circle cx={meanX} cy={margin.top} r={3.5} fill="#f59e0b" />
                <path
                  d={`M ${meanX - 6} ${height - margin.bottom} L ${meanX + 6} ${
                    height - margin.bottom
                  } L ${meanX} ${height - margin.bottom + 9} Z`}
                  fill="#f59e0b"
                  opacity={0.9}
                />
                <text
                  x={meanX}
                  y={height - margin.bottom + 22}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#b45309"
                  fontWeight="bold"
                >
                  μ
                </text>

                {/* Reference curves legend in top right */}
                <g transform="translate(450, 40)">
                  <text fontSize="12" fontWeight="bold">
                    Reference:
                  </text>
                  <g transform="translate(0, 15)">
                    <line
                      x1="0"
                      y1="0"
                      x2="15"
                      y2="0"
                      stroke="#ef4444"
                      strokeWidth="2"
                      opacity="0.3"
                      strokeDasharray="5,5"
                    />
                    <text x="20" y="4" fontSize="9">
                      [1,1]
                    </text>
                  </g>
                  <g transform="translate(0, 28)">
                    <line
                      x1="0"
                      y1="0"
                      x2="15"
                      y2="0"
                      stroke="#10b981"
                      strokeWidth="2"
                      opacity="0.3"
                      strokeDasharray="5,5"
                    />
                    <text x="20" y="4" fontSize="9">
                      [2,2]
                    </text>
                  </g>
                  <g transform="translate(0, 41)">
                    <line
                      x1="0"
                      y1="0"
                      x2="15"
                      y2="0"
                      stroke="#8b5cf6"
                      strokeWidth="2"
                      opacity="0.3"
                      strokeDasharray="5,5"
                    />
                    <text x="20" y="4" fontSize="9">
                      [5,5]
                    </text>
                  </g>
                  <g transform="translate(0, 54)">
                    <line
                      x1="0"
                      y1="0"
                      x2="15"
                      y2="0"
                      stroke="#2563eb"
                      strokeWidth="3"
                    />
                    <text x="20" y="4" fontSize="9" fontWeight="bold">
                      [{a[0]},{b[0]}]
                    </text>
                  </g>
                </g>
              </svg>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
