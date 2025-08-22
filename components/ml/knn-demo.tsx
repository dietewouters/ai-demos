"use client";

import type React from "react";
import { useState, useCallback, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Point {
  x: number;
  y: number;
  label: "blue" | "orange";
}

interface QueryPoint {
  x: number;
  y: number;
}

interface DistanceResult {
  point: Point;
  distance: number;
  index: number;
}

const SCALE = 40; // pixels per unit
const OFFSET_X = 50;
const OFFSET_Y = 50;

// ===== Datasets =====
const DATASETS: Record<"basic" | "dense", { name: string; points: Point[] }> = {
  basic: {
    name: "Exercise from exercise session",
    points: [
      { x: 4, y: 1, label: "blue" },
      { x: 2, y: 5, label: "blue" },
      { x: 4, y: 7, label: "blue" },
      { x: 5, y: 3, label: "orange" },
      { x: 11, y: 2, label: "orange" },
      { x: 10, y: 4, label: "orange" },
      { x: 10, y: 6, label: "orange" },
      { x: 11, y: 8, label: "orange" },
    ],
  },
  dense: {
    name: "More complex exercise",
    points: [
      { x: 2, y: 8, label: "blue" },
      { x: 2, y: 3, label: "blue" },
      { x: 3, y: 2, label: "blue" },
      { x: 4, y: 1, label: "blue" },
      { x: 7, y: 7, label: "blue" },
      { x: 4, y: 7, label: "blue" },
      { x: 5, y: 6, label: "blue" },
      { x: 11, y: 6, label: "blue" },
      { x: 10, y: 8, label: "blue" },
      { x: 7, y: 2, label: "blue" },
      { x: 8, y: 3, label: "blue" },
      { x: 7, y: 3, label: "blue" },
      { x: 9, y: 1, label: "blue" },

      { x: 9, y: 5, label: "orange" },
      { x: 11, y: 3, label: "orange" },
      { x: 10, y: 5, label: "orange" },
      { x: 7, y: 5, label: "orange" },
      { x: 9, y: 7, label: "orange" },
      { x: 8, y: 7, label: "orange" },
      { x: 6, y: 4, label: "orange" },
      { x: 1, y: 5, label: "orange" },
      { x: 5, y: 3, label: "orange" },
      { x: 2, y: 6, label: "orange" },
      { x: 3, y: 5, label: "orange" },
      { x: 3, y: 3, label: "orange" },
    ],
  },
};

const X_MIN = 0,
  X_MAX = 13,
  Y_MIN = 0,
  Y_MAX = 10;

export default function KNNDemo() {
  // State
  const [datasetKey, setDatasetKey] = useState<keyof typeof DATASETS>("basic");
  const activePoints = useMemo(() => DATASETS[datasetKey].points, [datasetKey]);

  const [k, setK] = useState<number>(3);
  const [distanceMetric, setDistanceMetric] = useState<string>("euclidean"); // "euclidean" | "manhattan" | "minkowski"
  const [minkowskiP, setMinkowskiP] = useState<number>(3); // for "Choose p"
  const [queryPoint, setQueryPoint] = useState<QueryPoint>({ x: 7, y: 6 });
  const [showVoronoi, setShowVoronoi] = useState<boolean>(false);
  const [showCalculations, setShowCalculations] = useState<boolean>(false); // collapsed by default

  const PLOT_WIDTH = (X_MAX - X_MIN) * SCALE;
  const PLOT_HEIGHT = (Y_MAX - Y_MIN) * SCALE;
  const SVG_WIDTH = OFFSET_X * 2 + PLOT_WIDTH;
  const SVG_HEIGHT = OFFSET_Y * 2 + PLOT_HEIGHT;

  useEffect(() => {
    // keep query point in bounds when switching datasets
    setQueryPoint((qp) => ({
      x: Math.max(X_MIN, Math.min(X_MAX, qp.x)),
      y: Math.max(Y_MIN, Math.min(Y_MAX, qp.y)),
    }));
  }, [datasetKey]);

  // Distance
  const calculateDistance = useCallback(
    (p1: Point | QueryPoint, p2: Point | QueryPoint): number => {
      const dx = Math.abs(p1.x - p2.x);
      const dy = Math.abs(p1.y - p2.y);

      switch (distanceMetric) {
        case "euclidean": // L2
          return Math.hypot(dx, dy);
        case "manhattan": // L1
          return dx + dy;
        case "minkowski": {
          const p = Math.max(1, Math.round(minkowskiP)); // <-- ensure integer p ≥ 1
          const sum = Math.pow(dx, p) + Math.pow(dy, p);
          return Math.pow(sum, 1 / p);
        }

        default:
          return Math.hypot(dx, dy);
      }
    },
    [distanceMetric, minkowskiP]
  );

  // Neighbors + prediction
  const getNearestNeighbors = useCallback((): DistanceResult[] => {
    const distances = activePoints.map((point, index) => ({
      point,
      distance: calculateDistance(queryPoint, point),
      index,
    }));
    return distances.sort((a, b) => a.distance - b.distance).slice(0, k);
  }, [activePoints, queryPoint, k, calculateDistance]);

  const getPrediction = useCallback((): "blue" | "orange" | "tie" => {
    const neighbors = getNearestNeighbors();
    const blueCount = neighbors.filter((n) => n.point.label === "blue").length;
    const orangeCount = neighbors.length - blueCount;
    if (blueCount > orangeCount) return "blue";
    if (orangeCount > blueCount) return "orange";
    return "tie";
  }, [getNearestNeighbors]);

  const prediction = getPrediction();

  // Query point styling based on predicted class (distinct look)
  const queryStyle = useMemo(() => {
    if (prediction === "blue") {
      return { fill: "#dbeafe", stroke: "#3b82f6", text: "#1e40af" }; // light blue fill + blue ring
    } else if (prediction === "orange") {
      return { fill: "#ffedd5", stroke: "#f97316", text: "#9a3412" }; // light orange fill + orange ring
    }
    return { fill: "#e5e7eb", stroke: "#6b7280", text: "#374151" }; // tie/neutral
  }, [prediction]);

  // Click handling
  const handleCanvasClick = (event: React.MouseEvent<SVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.round((event.clientX - rect.left - OFFSET_X) / SCALE);
    const y = Math.round((event.clientY - rect.top - OFFSET_Y) / SCALE);
    setQueryPoint({
      x: Math.max(X_MIN, Math.min(X_MAX, x)),
      y: Math.max(Y_MIN, Math.min(Y_MAX, y)),
    });
  };

  // Voronoi-like k-NN decision regions
  const voronoiCells = useMemo(() => {
    if (!showVoronoi) return [];

    type Cell = {
      x: number;
      y: number;
      w: number;
      h: number;
      label: "blue" | "orange" | "tie";
    };
    const cells: Cell[] = [];

    const step = 2; // finer = smoother boundaries
    const xStart = OFFSET_X;
    const yStart = OFFSET_Y;
    const xEnd = OFFSET_X + PLOT_WIDTH;
    const yEnd = OFFSET_Y + PLOT_HEIGHT;

    for (let px = xStart; px < xEnd; px += step) {
      for (let py = yStart; py < yEnd; py += step) {
        // sample at the pixel cell center
        const dataX = X_MIN + (px - OFFSET_X + step / 2) / SCALE;
        const dataY = Y_MIN + (py - OFFSET_Y + step / 2) / SCALE;

        const neighbors = activePoints
          .map((p, index) => ({
            point: p,
            index,
            distance: calculateDistance({ x: dataX, y: dataY }, p),
          }))
          .sort((a, b) => a.distance - b.distance)
          .slice(0, k);

        const blueCount = neighbors.filter(
          (n) => n.point.label === "blue"
        ).length;
        const orangeCount = neighbors.length - blueCount;

        let label: Cell["label"] = "tie";
        if (blueCount > orangeCount) label = "blue";
        else if (orangeCount > blueCount) label = "orange";

        cells.push({ x: px, y: py, w: step, h: step, label });
      }
    }
    return cells;
  }, [showVoronoi, k, calculateDistance, activePoints]);

  const nearestNeighbors = getNearestNeighbors();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Controls */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Dataset selector */}
          <div>
            <label className="text-sm font-medium mb-2 block">Dataset</label>
            <Select
              value={datasetKey}
              onValueChange={(val) =>
                setDatasetKey(val as keyof typeof DATASETS)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose dataset" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="basic">{DATASETS.basic.name}</SelectItem>
                <SelectItem value="dense">{DATASETS.dense.name}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1"></p>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">K Value</label>
            <Select
              value={k.toString()}
              onValueChange={(value) => setK(Number.parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">K = 1</SelectItem>
                <SelectItem value="2">K = 2</SelectItem>
                <SelectItem value="3">K = 3</SelectItem>
                <SelectItem value="4">K = 4</SelectItem>
                <SelectItem value="5">K = 5</SelectItem>
                <SelectItem value="6">K = 6</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Distance Metric
            </label>
            <Select value={distanceMetric} onValueChange={setDistanceMetric}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="euclidean">Euclidean</SelectItem>
                <SelectItem value="manhattan">Manhattan</SelectItem>
              </SelectContent>
            </Select>

            {/* p control for Minkowski */}

            {distanceMetric === "minkowski" && (
              <div className="mt-2">
                <label className="text-xs text-gray-600 block mb-1">
                  p for Minkowski (integers only; 1 = Manhattan, 2 = Euclidean)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={1}
                    max={10}
                    step={1} // <-- integer steps
                    value={minkowskiP}
                    onChange={(e) =>
                      setMinkowskiP(parseInt(e.target.value, 10))
                    } // <-- force int
                    className="w-full"
                  />
                  <span className="w-12 text-right text-sm tabular-nums">
                    {minkowskiP} {/* <-- show as integer */}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Visualization Options
            </label>
            <Button
              variant={showVoronoi ? "default" : "outline"}
              onClick={() => setShowVoronoi(!showVoronoi)}
              className="w-full"
            >
              {showVoronoi ? "Hide" : "Show"} Voronoi Diagram
            </Button>
            <p className="text-xs text-gray-500 mt-1"></p>
          </div>

          <div className="pt-4 border-t">
            <h3 className="font-medium mb-2">Query Point</h3>
            <p className="text-sm text-gray-600 mb-2">
              Click on the plot to move the query point.
            </p>
            <p className="text-sm">
              Current: ({queryPoint.x}, {queryPoint.y})
            </p>
          </div>

          <div className="pt-4 border-t">
            <h3 className="font-medium mb-2">Prediction</h3>
            <Badge
              variant={
                prediction === "blue"
                  ? "default"
                  : prediction === "orange"
                  ? "secondary"
                  : "outline"
              }
              className={`text-white ${
                prediction === "blue"
                  ? "bg-blue-500"
                  : prediction === "orange"
                  ? "bg-orange-500"
                  : "bg-gray-500"
              }`}
            >
              {prediction === "tie"
                ? "Tie"
                : prediction.charAt(0).toUpperCase() + prediction.slice(1)}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Visualization */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>KNN Visualization — {DATASETS[datasetKey].name}</CardTitle>
          <p className="text-sm text-gray-600">
            Click anywhere to place the query point (❓)
          </p>
        </CardHeader>
        <CardContent>
          <svg
            width={SVG_WIDTH}
            height={SVG_HEIGHT}
            className="border rounded-lg cursor-crosshair bg-white"
            onClick={handleCanvasClick}
          >
            {/* Grid */}
            <defs>
              <pattern
                id="grid"
                x={OFFSET_X}
                y={OFFSET_Y}
                width={SCALE}
                height={SCALE}
                patternUnits="userSpaceOnUse"
              >
                <path
                  d={`M ${SCALE} 0 L 0 0 0 ${SCALE}`}
                  fill="none"
                  stroke="#f0f0f0"
                  strokeWidth="1"
                  shapeRendering="crispEdges"
                />
              </pattern>

              <clipPath id="plotClip">
                <rect
                  x={OFFSET_X}
                  y={OFFSET_Y}
                  width={PLOT_WIDTH}
                  height={PLOT_HEIGHT}
                />
              </clipPath>
            </defs>
            <rect
              x={OFFSET_X}
              y={OFFSET_Y}
              width={PLOT_WIDTH}
              height={PLOT_HEIGHT}
              fill="url(#grid)"
            />

            {/* Voronoi (k-NN regions) */}
            {showVoronoi &&
              voronoiCells.map((cell, i) => (
                <rect
                  key={`voronoi-${i}`}
                  x={cell.x}
                  y={cell.y}
                  width={cell.w}
                  height={cell.h}
                  fill={
                    cell.label === "blue"
                      ? "#3b82f620"
                      : cell.label === "orange"
                      ? "#f9731620"
                      : "#9ca3af20"
                  }
                  stroke="none"
                  clipPath="url(#plotClip)"
                />
              ))}

            {/* Lines to nearest neighbors */}
            {nearestNeighbors.map((neighbor) => (
              <line
                key={`line-${neighbor.index}`}
                x1={queryPoint.x * SCALE + OFFSET_X}
                y1={queryPoint.y * SCALE + OFFSET_Y}
                x2={neighbor.point.x * SCALE + OFFSET_X}
                y2={neighbor.point.y * SCALE + OFFSET_Y}
                stroke={neighbor.point.label === "blue" ? "#3b82f6" : "#f97316"}
                strokeWidth="3"
                strokeDasharray="8,4"
                opacity="0.8"
              />
            ))}

            {/* Training points */}
            {activePoints.map((point, index) => {
              const isNeighbor = nearestNeighbors.some(
                (n) => n.index === index
              );
              const neighborRank = nearestNeighbors.findIndex(
                (n) => n.index === index
              );

              return (
                <g key={index}>
                  {point.label === "blue" ? (
                    <rect
                      x={point.x * SCALE + OFFSET_X - 8}
                      y={point.y * SCALE + OFFSET_Y - 8}
                      width="16"
                      height="16"
                      fill="#3b82f6"
                      stroke={isNeighbor ? "#1d4ed8" : "none"}
                      strokeWidth={isNeighbor ? "3" : "0"}
                    />
                  ) : (
                    <circle
                      cx={point.x * SCALE + OFFSET_X}
                      cy={point.y * SCALE + OFFSET_Y}
                      r="8"
                      fill="#f97316"
                      stroke={isNeighbor ? "#ea580c" : "none"}
                      strokeWidth={isNeighbor ? "3" : "0"}
                    />
                  )}

                  {/* Coordinates */}
                  <text
                    x={point.x * SCALE + OFFSET_X}
                    y={point.y * SCALE + OFFSET_Y - 15}
                    textAnchor="middle"
                    className="text-xs font-medium"
                    fill="#374151"
                  >
                    ({point.x},{point.y})
                  </text>

                  {/* Neighbor rank */}
                  {isNeighbor && (
                    <text
                      x={point.x * SCALE + OFFSET_X + 12}
                      y={point.y * SCALE + OFFSET_Y - 12}
                      className="text-xs font-bold"
                      fill="#dc2626"
                    >
                      #{neighborRank + 1}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Query point (distinct, colored by prediction) */}
            <g>
              {/* outer dashed ring for distinct look */}
              <circle
                cx={queryPoint.x * SCALE + OFFSET_X}
                cy={queryPoint.y * SCALE + OFFSET_Y}
                r="18"
                fill="none"
                stroke={queryStyle.stroke}
                strokeWidth="3"
                strokeDasharray="6,4"
                opacity="0.7"
              />
              {/* main filled circle */}
              <circle
                cx={queryPoint.x * SCALE + OFFSET_X}
                cy={queryPoint.y * SCALE + OFFSET_Y}
                r="13"
                fill={queryStyle.fill}
                stroke={queryStyle.stroke}
                strokeWidth="2.5"
              />
              {/* question mark */}
              <text
                x={queryPoint.x * SCALE + OFFSET_X}
                y={queryPoint.y * SCALE + OFFSET_Y + 5}
                textAnchor="middle"
                className="text-lg font-bold"
                fill={queryStyle.text}
              >
                ?
              </text>
              {/* coordinates */}
              <text
                x={queryPoint.x * SCALE + OFFSET_X}
                y={queryPoint.y * SCALE + OFFSET_Y - 22}
                textAnchor="middle"
                className="text-xs font-medium"
                fill="#374151"
              >
                ({queryPoint.x},{queryPoint.y})
              </text>
            </g>

            {/* Axis labels */}
            <text
              x={OFFSET_X - 20}
              y={OFFSET_Y + 15}
              className="text-sm font-medium"
              fill="#374151"
            >
              Y
            </text>
            <text
              x={OFFSET_X + PLOT_WIDTH - 10}
              y={OFFSET_Y + PLOT_HEIGHT - 10}
              className="text-sm font-medium"
              fill="#374151"
            >
              X
            </text>
          </svg>
        </CardContent>
      </Card>

      {/* Calculations (collapsible) */}
      <Card className="lg:col-span-3">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Distance Calculations</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCalculations((v) => !v)}
          >
            {showCalculations
              ? "Hide Distance Calculations"
              : "Show Distance Calculations"}
          </Button>
        </CardHeader>

        {showCalculations && (
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Point</th>
                    <th className="text-left p-2">Coordinates</th>
                    <th className="text-left p-2">Class</th>
                    <th className="text-left p-2">Distance Calculation</th>
                    <th className="text-left p-2">Distance</th>
                    <th className="text-left p-2">Rank</th>
                  </tr>
                </thead>
                <tbody>
                  {activePoints.map((point, index) => {
                    const distance = calculateDistance(queryPoint, point);
                    const neighborIndex = nearestNeighbors.findIndex(
                      (n) => n.index === index
                    );
                    const isNeighbor = neighborIndex !== -1;

                    let calculation = "";
                    const dx = Math.abs(queryPoint.x - point.x);
                    const dy = Math.abs(queryPoint.y - point.y);

                    switch (distanceMetric) {
                      case "euclidean":
                        calculation = `√((${queryPoint.x}-${point.x})² + (${
                          queryPoint.y
                        }-${point.y})²) = √(${dx}² + ${dy}²) = √${
                          dx * dx + dy * dy
                        }`;
                        break;
                      case "manhattan":
                        calculation = `|${queryPoint.x}-${point.x}| + |${queryPoint.y}-${point.y}| = ${dx} + ${dy}`;
                        break;
                      case "minkowski":
                        calculation =
                          `(|Δx|^p + |Δy|^p)^(1/p) with p=${minkowskiP} → ` +
                          `(${dx}^${minkowskiP} + ${dy}^${minkowskiP})^(1/${minkowskiP})`;
                        break;
                    }

                    return (
                      <tr
                        key={index}
                        className={`border-b ${
                          isNeighbor ? "bg-yellow-50 font-medium" : ""
                        }`}
                      >
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            {point.label === "blue" ? (
                              <div className="w-4 h-4 bg-blue-500" />
                            ) : (
                              <div className="w-4 h-4 bg-orange-500 rounded-full" />
                            )}
                            Point {index + 1}
                          </div>
                        </td>
                        <td className="p-2">
                          ({point.x}, {point.y})
                        </td>
                        <td className="p-2">
                          <Badge
                            variant={
                              point.label === "blue" ? "default" : "secondary"
                            }
                          >
                            {point.label}
                          </Badge>
                        </td>
                        <td className="p-2 font-mono text-xs">{calculation}</td>
                        <td className="p-2 font-mono">{distance.toFixed(2)}</td>
                        <td className="p-2">
                          {isNeighbor ? (
                            <Badge variant="destructive">
                              #{neighborIndex + 1}
                            </Badge>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">Classification Result</h4>

              <div className="flex gap-4 mt-2">
                <span>
                  Blue votes:{" "}
                  {
                    nearestNeighbors.filter((n) => n.point.label === "blue")
                      .length
                  }
                </span>
                <span>
                  Orange votes:{" "}
                  {
                    nearestNeighbors.filter((n) => n.point.label === "orange")
                      .length
                  }
                </span>
                <span className="font-medium">
                  → Prediction:{" "}
                  <Badge
                    variant={
                      prediction === "blue"
                        ? "default"
                        : prediction === "orange"
                        ? "secondary"
                        : "outline"
                    }
                    className={`text-white ${
                      prediction === "blue"
                        ? "bg-blue-500"
                        : prediction === "orange"
                        ? "bg-orange-500"
                        : "bg-gray-500"
                    }`}
                  >
                    {prediction === "tie" ? "Tie" : prediction}
                  </Badge>
                </span>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
