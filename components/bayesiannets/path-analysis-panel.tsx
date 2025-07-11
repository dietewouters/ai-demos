"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PathInfo } from "./d-separation";

interface PathAnalysisPanelProps {
  targetNode: string | null;
  selectedNode: string | null;
  pathInfos: PathInfo[];
  onSelectPath: (path: string[] | null) => void;
  selectedPath: string[] | null;
}

export function PathAnalysisPanel({
  targetNode,
  selectedNode,
  pathInfos,
  onSelectPath,
  selectedPath,
}: PathAnalysisPanelProps) {
  if (!targetNode || !selectedNode) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Path Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">
            Select a target node and click on another node to see path analysis
          </p>
        </CardContent>
      </Card>
    );
  }

  const blockedPaths = pathInfos.filter((p) => p.isBlocked);
  const unblockedPaths = pathInfos.filter((p) => !p.isBlocked);
  const isDSeparated =
    pathInfos.length > 0 && pathInfos.every((p) => p.isBlocked);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          Path Analysis: {targetNode} → {selectedNode}
        </CardTitle>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant={isDSeparated ? "destructive" : "default"}>
            {isDSeparated ? "D-Separated" : "Not D-Separated"}
          </Badge>
          <span className="text-sm text-gray-600">
            ({pathInfos.length} path{pathInfos.length !== 1 ? "s" : ""} found)
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {pathInfos.length === 0 && (
          <p className="text-gray-500">No paths found between these nodes</p>
        )}

        {blockedPaths.length > 0 && (
          <div>
            <h4 className="font-semibold text-red-600 mb-2">
              Blocked Paths ({blockedPaths.length})
            </h4>
            <div className="space-y-2">
              {blockedPaths.map((pathInfo, index) => (
                <div
                  key={index}
                  className="border border-red-200 rounded p-3 bg-red-50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <code className="text-sm bg-white px-2 py-1 rounded">
                      {pathInfo.path.join(" → ")}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onSelectPath(pathInfo.path)}
                      className={
                        selectedPath === pathInfo.path ? "bg-blue-100" : ""
                      }
                    >
                      Highlight
                    </Button>
                  </div>
                  {pathInfo.blockingReason && (
                    <p className="text-sm text-red-700">
                      <strong>Blocked:</strong> {pathInfo.blockingReason}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {unblockedPaths.length > 0 && (
          <div>
            <h4 className="font-semibold text-green-600 mb-2">
              Unblocked Paths ({unblockedPaths.length})
            </h4>
            <div className="space-y-2">
              {unblockedPaths.map((pathInfo, index) => (
                <div
                  key={index}
                  className="border border-green-200 rounded p-3 bg-green-50"
                >
                  <div className="flex items-center justify-between">
                    <code className="text-sm bg-white px-2 py-1 rounded">
                      {pathInfo.path.join(" → ")}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onSelectPath(pathInfo.path)}
                      className={
                        selectedPath === pathInfo.path ? "bg-blue-100" : ""
                      }
                    >
                      Highlight
                    </Button>
                  </div>
                  <p className="text-sm text-green-700 mt-1">
                    <strong>Open:</strong> This path is not blocked by evidence
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-2 border-t">
          <h4 className="font-semibold mb-2">D-Separation Rule</h4>
          <p className="text-sm text-gray-600">
            Two nodes are <strong>d-separated</strong> if <em>all</em> paths
            between them are blocked by evidence.
            {isDSeparated
              ? " ✓ All paths are blocked, so these nodes are conditionally independent."
              : " ✗ At least one path remains open, so these nodes are not conditionally independent."}
          </p>
        </div>

        {selectedPath && (
          <div className="pt-2 border-t">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onSelectPath(null)}
            >
              Clear Path Highlight
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
