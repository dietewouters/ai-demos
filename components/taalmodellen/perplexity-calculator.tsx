"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { END_TOKEN, MarkovModel, START_TOKEN } from "./markov-model";
import { useLoadMarkovModel } from "./markov-model-store";

/**
 * Compute log‑probability of a sentence under the provided Markov model.
 * A tiny additive‑smoothing value (1 × 10⁻⁶) is used whenever the model has
 * never seen a particular transition, so that probabilities are never exactly
 * zero.  This keeps perplexity finite while still strongly penalising unseen
 * n‑grams.
 */
function logProbability(sentence: string, model: MarkovModel): number {
  const tokens = sentence
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 0);

  // Start‑of‑sentence context  ⟨start⟩
  const ctx: string[] = [START_TOKEN];
  let logp = 0;

  const SMOOTH = 1e-6; // Laplace‑like smoothing constant

  for (const tok of tokens) {
    const preds = model.predictNextWords(ctx);
    const hit = preds.find((p) => p.token === tok);
    const prob = hit ? hit.probability : SMOOTH;
    logp += Math.log(prob);

    ctx.push(tok);
    if (ctx.length > model.order) ctx.shift();
  }

  // Account for ⟨end⟩ token so sentences of different length are comparable
  const endPreds = model.predictNextWords(ctx);
  const endHit = endPreds.find((p) => p.token === END_TOKEN);
  const probEnd = endHit ? endHit.probability : SMOOTH;
  logp += Math.log(probEnd);

  return logp;
}

export const PerplexityCalculator: React.FC<{
  /** name of a model that exists in the MarkovModelStore */
  modelName?: string;
  /** n‑gram size to load, defaults to trigram */
  n?: number;
  /** initial example sentences shown in the table */
  initialSentences?: string[];
}> = ({ modelName, n = 3, initialSentences = [] }) => {
  const [model] = useLoadMarkovModel(undefined, modelName, n);
  const [sentences, setSentences] = useState<string[]>(initialSentences);
  const [draft, setDraft] = useState("");

  if (!model) return <div>Loading model …</div>;

  function addSentence() {
    const s = draft.trim();
    if (s.length === 0) return;
    setSentences((prev) => [...prev, s]);
    setDraft("");
  }

  function stats(s: string) {
    if (!model) {
      return { sentence: s, probability: 0, perplexity: 0 };
    }
    const logp = logProbability(s, model);
    const prob = Math.exp(logp);
    const tokenCount = s.split(/\s+/).filter((t) => t.length > 0).length + 1; // +1 for ⟨end⟩
    const perplexity = Math.exp(-logp / tokenCount);
    return { sentence: s, probability: prob, perplexity };
  }

  const rows = sentences.map(stats);
  // .sort((a, b) => a.perplexity - b.perplexity);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Perplexity‑calculator</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* results table */}
        <Table className={"not-prose"}>
          <TableHeader>
            <TableRow>
              <TableCell>Zin</TableCell>
              <TableCell className="text-right">Kans</TableCell>
              <TableCell className="text-right">Perplexity</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ sentence, probability, perplexity }, i) => (
              <TableRow key={i}>
                <TableCell>{sentence}</TableCell>
                <TableCell className="text-right">
                  {probability.toExponential(3)}
                </TableCell>
                <TableCell className="text-right">
                  {perplexity.toFixed(2)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {/* sentence input */}
        <Input
          placeholder="Typ een eigen zin en druk Enter …"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addSentence();
          }}
        />
      </CardContent>
    </Card>
  );
};
