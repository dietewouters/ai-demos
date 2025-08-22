"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";

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

type MapInfo =
  | { kind: "interior"; xs: number[] }
  | { kind: "left" | "right"; xs: [0] | [1] }
  | { kind: "both"; xs: [0, 1] }
  | { kind: "flat"; xs: [] };

export default function BetaFunctionDemo() {
  const [a, setA] = useState([2]);
  const [b, setB] = useState([2]);

  // Curves
  const currentCurve = useMemo(() => generateCurve(a[0], b[0]), [a, b]);

  // Stats
  const mean = a[0] / (a[0] + b[0]);
  const variance =
    (a[0] * b[0]) / (Math.pow(a[0] + b[0], 2) * (a[0] + b[0] + 1));

  // MAP cases
  const mapInfo = useMemo<MapInfo>(() => {
    const A = a[0],
      B = b[0];
    if (A === 1 && B === 1) return { kind: "flat", xs: [] };
    if (A > 1 && B > 1)
      return { kind: "interior", xs: [(A - 1) / (A + B - 2)] };
    if (A <= 1 && B <= 1) return { kind: "both", xs: [0, 1] };
    if (A <= 1) return { kind: "left", xs: [0] };
    return { kind: "right", xs: [1] };
  }, [a, b]);

  // SVG dims
  const width = 600;
  const height = 400;
  const margin = { top: 20, right: 20, bottom: 60, left: 60 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  // Scales
  const xScale = (x: number) => x * chartWidth + margin.left;
  const yScale = (y: number) => height - margin.bottom - (y * chartHeight) / 3;

  // Path
  const createPath = (data: { x: number; y: number }[]) =>
    data
      .map((d, i) => `${i === 0 ? "M" : "L"} ${xScale(d.x)} ${yScale(d.y)}`)
      .join(" ");

  // Colors & widths
  const meanColor = "#f59e0b"; // amber-500
  const mapColor = "#16a34a"; // green-600
  const bandWidth = 8;

  // Fixed badges content
  const meanBadge = {
    title: `μ = ${mean.toFixed(3)}`,
    sub: `a/(a+b) = ${a[0]}/(${a[0]}+${b[0]})`,
  };

  const mapBadgeText = () => {
    const A = a[0],
      B = b[0];
    if (mapInfo.kind === "interior") {
      const mx = mapInfo.xs[0];
      return {
        title: `MAP = ${mx.toFixed(3)}`,
        sub: `(a-1)/(a+b-2) = ${fmt1(A - 1)}/(${fmt1(A)}+${fmt1(B)}-2)`,
      };
    }
    if (mapInfo.kind === "left") {
      return { title: `MAP = 0`, sub: `a = ${fmt1(A)} ≤ 1 ⇒ θ = 0` };
    }
    if (mapInfo.kind === "right") {
      return { title: `MAP = 1`, sub: `b = ${fmt1(B)} ≤ 1 ⇒ θ = 1` };
    }
    if (mapInfo.kind === "both") {
      return {
        title: `MAP not unique: 0 and 1`,
        sub: `a = ${fmt1(A)} ≤ 1 en b = ${fmt1(B)} ≤ 1`,
      };
    }
    return { title: `No unique MAP`, sub: `Uniform: a = 1, b = 1` };
  };

  return (
    <div className="space-y-6">
      {/* Uitlegkaart bovenaan */}
      <Card>
        <CardHeader>
          <CardTitle>What is the Beta distribution?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-6">
          <p>
            We often use the beta distribution as a prior to estimate the
            probability of a certain parameter. The a and b are parameters that
            show a virtual count (a = positive examples and b = negative). The
            higher the values, the more certain we are of a certain probability,
            e.g. (1,1), (2.2) and (5.5) all have the same mean (0.5), but are
            increasingly concentrated around the probability 0.5. More of a
            certain type of count shifts the probability in that direction:
            increasing a (= number of positive examples) brings the probability
            mass closer to the probability 1. Intuition: more ‘positive
            examples’ ( <span className="font-mono">a</span> increase) shifts
            mass to <span className="font-mono">θ = 1</span>; more "negative
            examples" ( increase <span className="font-mono">b</span>) shifts
            mass to <span className="font-mono">θ = 0</span>.
          </p>
        </CardContent>
      </Card>

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
                    setA([3]);
                    setB([2]);
                  }}
                  className="w-full text-left p-2 rounded bg-blue-50 hover:bg-blue-100 text-sm"
                >
                  [3,2]
                </button>
                <button
                  onClick={() => {
                    setA([4]);
                    setB([2]);
                  }}
                  className="w-full text-left p-2 rounded bg-purple-50 hover:bg-purple-100 text-sm"
                >
                  [4,2]
                </button>
                <button
                  onClick={() => {
                    setA([5]);
                    setB([2]);
                  }}
                  className="w-full text-left p-2 rounded bg-orange-50 hover:bg-orange-100 text-sm"
                >
                  [5,2]
                </button>
                <button
                  onClick={() => {
                    setA([5]);
                    setB([5]);
                  }}
                  className="w-full text-left p-2 rounded bg-yellow-50 hover:bg-yellow-100 text-sm"
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
            <CardTitle>Beta Distribution Visualization</CardTitle>
            {/* Vaste kaders naast elkaar */}
            <div className="mt-2 flex flex-wrap gap-3">
              <div className="rounded-md bg-white/95 shadow-sm ring-1 ring-amber-400 px-3 py-2 text-sm font-medium text-amber-800">
                <div className="font-bold">{meanBadge.title}</div>
                <div className="font-mono text-xs">{meanBadge.sub}</div>
              </div>
              <div className="rounded-md bg-white/95 shadow-sm ring-1 ring-green-600 px-3 py-2 text-sm font-medium text-green-800">
                <div className="font-bold">{mapBadgeText().title}</div>
                <div className="font-mono text-xs">{mapBadgeText().sub}</div>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <svg width={width} height={height} className="border rounded block">
              {/* Grid */}
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

              {/* X labels */}
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

              {/* Y labels */}
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

              {/* Curve */}
              <path
                d={createPath(currentCurve)}
                fill="none"
                stroke="#2563eb"
                strokeWidth="3"
              />

              {/* Mean band + SOLID line + pointer */}
              {(() => {
                const meanX = xScale(mean);
                return (
                  <g>
                    <rect
                      x={meanX - bandWidth / 2}
                      y={margin.top}
                      width={bandWidth}
                      height={chartHeight}
                      fill={meanColor}
                      opacity="0.08"
                    />
                    <line
                      x1={meanX}
                      y1={margin.top}
                      x2={meanX}
                      y2={height - margin.bottom}
                      stroke={meanColor}
                      strokeWidth={3}
                    />
                    <circle
                      cx={meanX}
                      cy={margin.top}
                      r={3.5}
                      fill={meanColor}
                    />
                    <path
                      d={`M ${meanX - 6} ${height - margin.bottom} L ${
                        meanX + 6
                      } ${height - margin.bottom} L ${meanX} ${
                        height - margin.bottom + 9
                      } Z`}
                      fill={meanColor}
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
                  </g>
                );
              })()}

              {/* MAP band(s) + DASHED line(s) + pointer(s) */}
              {mapInfo.kind !== "flat" &&
                mapInfo.xs.map((mx, idx) => {
                  const mxPix = xScale(mx);
                  return (
                    <g key={`map-line-${idx}-${mx}`}>
                      <rect
                        x={mxPix - bandWidth / 2}
                        y={margin.top}
                        width={bandWidth}
                        height={chartHeight}
                        fill={mapColor}
                        opacity="0.08"
                      />
                      <line
                        x1={mxPix}
                        y1={margin.top}
                        x2={mxPix}
                        y2={height - margin.bottom}
                        stroke={mapColor}
                        strokeWidth={3}
                        strokeDasharray="6,4"
                      />
                      <circle
                        cx={mxPix}
                        cy={margin.top}
                        r={3.5}
                        fill={mapColor}
                      />
                      <path
                        d={`M ${mxPix - 6} ${height - margin.bottom} L ${
                          mxPix + 6
                        } ${height - margin.bottom} L ${mxPix} ${
                          height - margin.bottom + 9
                        } Z`}
                        fill={mapColor}
                        opacity={0.9}
                      />
                      <text
                        x={mxPix}
                        y={height - margin.bottom + 22}
                        textAnchor="middle"
                        fontSize="11"
                        fill="#065f46"
                        fontWeight="bold"
                      >
                        MAP
                      </text>
                    </g>
                  );
                })}
            </svg>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
