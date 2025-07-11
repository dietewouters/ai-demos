"use client";

export const START_TOKEN = "<start>";
export const END_TOKEN = "<end>";

export const isSpecialToken = (token: string) => {
  return token === START_TOKEN || token === END_TOKEN;
};

export type MarkovChainPrediction = {
  token: string;
  probability: number;
};

export type MarkovChainModel = {
  [context: string]: { [nextWord: string]: number };
};

export type MarkovChainModelEntry = {
  context: string;
  nextWord: string;
  count: number;
  probability: number;
};

export type MarkovModelType = {
  name: string;
  displayName: string;
  n: number;
  chain: MarkovChainModel;
};

export class MarkovModel implements MarkovModelType {
  name: string;
  displayName: string;
  n: number;
  chain: MarkovChainModel;
  fallbackModelRetriever?: () => MarkovModel;

  constructor(
    name: string,
    displayName: string,
    n: number,
    chain: MarkovChainModel,
    fallbackModelRetriever?: () => MarkovModel
  ) {
    this.name = name;
    this.displayName = displayName;
    this.n = n;
    this.chain = chain;
    this.fallbackModelRetriever = fallbackModelRetriever;
  }

  get order() {
    return this.n - 1;
  }

  get fallbackModel(): MarkovModel | undefined {
    return this.fallbackModelRetriever && this.fallbackModelRetriever();
  }

  predictNextWords(context: string[]): MarkovChainPrediction[] {
    // Check if context contains END_TOKEN, if so, don't predict anything
    if (context.includes(END_TOKEN)) {
      return [];
    }

    // Context should only be n-1 tokens
    if (context.length > this.n - 1) {
      context = context.slice(context.length - (this.n - 1));
    }

    // Normalize
    context = normalizeContext(context);

    // Get the counts
    const counts = this.chain[context.join(" ")];

    // Remove the <start> token predictions
    if (counts && counts[START_TOKEN]) {
      delete counts[START_TOKEN];
    }

    // Normalize
    if (counts && Object.keys(counts).length > 0) {
      return normalizeCountsToProbabilities(counts);
    }

    // Fallback to the fallback model
    if (this.fallbackModel) {
      return this.fallbackModel.predictNextWords(context);
    }
    return [];
  }
}

function normalizeContext(contextTokens: string[]): string[] {
  return contextTokens.map((c) => c.toLowerCase());
}

function normalizeCountsToProbabilities(counts: { [p: string]: number }) {
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  return Object.entries(counts).map(([token, count]) => ({
    token,
    probability: count / total,
  }));
}

/* =====================================================
   MarkovModelCache (Memoizes models keyed by `${n}:${text}`)
===================================================== */
/**
 * Build a Markov model from text for a given n.
 * The text is normalized (lowercase, punctuation removed) and split into lines.
 * For each line, "<start>" is prepended and "<end>" appended.
 */
export function buildMarkovChain(text: string, n: number): MarkovChainModel {
  const cleanedText = text; //.replace(/[^\p{L}\p{N}\s]/gu, "");
  const lines = cleanedText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const model: MarkovChainModel = {};

  for (const line of lines) {
    const words = line.split(/\s+/).filter((word) => word.length > 0);
    const tokens = [START_TOKEN, ...words, END_TOKEN];
    if (tokens.length < n) continue;
    for (let i = 0; i <= tokens.length - n; i++) {
      const context =
        n === 1 ? "" : normalizeContext(tokens.slice(i, i + n - 1)).join(" ");
      const nextWord = tokens[i + n - 1];
      if (!model[context]) model[context] = {};
      model[context][nextWord] = (model[context][nextWord] || 0) + 1;
    }
  }
  return model;
}

/**
 * Convert a Markov markovChainModel into table data.
 */
export function convertMarkovModelChainToTableEntry(
  markovChainModel: MarkovChainModel
): MarkovChainModelEntry[] {
  const data: MarkovChainModelEntry[] = [];
  for (const context in markovChainModel) {
    const totalCount = Object.values(markovChainModel[context]).reduce(
      (sum, count) => sum + count,
      0
    );
    for (const nextWord in markovChainModel[context]) {
      const count = markovChainModel[context][nextWord];
      data.push({
        context,
        nextWord,
        count,
        probability: count / totalCount,
      });
    }
  }
  return data;
}
