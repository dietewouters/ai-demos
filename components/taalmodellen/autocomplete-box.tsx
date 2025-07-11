"use client";
import React, { JSX, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  END_TOKEN,
  isSpecialToken,
  MarkovChainPrediction,
  MarkovModel,
} from "./markov-model";
import cn from "clsx";
import { MarkovModelSelector } from "./markov-model-selector";
import { Label } from "@/components/ui/label";
import { useLoadMarkovModel } from "./markov-model-store";
import { calculateBackgroundColorBasedOnProbability } from "@/util/probability-utils";

export const AutocompleteBox: React.FC<{
  modelName?: string;
  model?: MarkovModel;
  n?: number;
  maxSuggestions?: number;
  initialText?: string;
  showModelSelector?: boolean;
  showNSelector?: boolean;
  showSpecialTokens?: boolean;
  showContext?: boolean;
  showStartNewLine?: boolean;
  showProbabilityColor?: boolean;
}> = ({
  model,
  modelName,
  n = 3,
  maxSuggestions = 9,
  showModelSelector = false,
  showNSelector = true,
  showSpecialTokens = true,
  showContext = true,
  showStartNewLine = false,
  showProbabilityColor = true,
}) => {
  const [currentModel, setCurrentModel] = useLoadMarkovModel(
    model,
    modelName,
    n
  );

  const [completedTokens, setCompletedTokens] = useState<string[][]>([]);
  const [tokens, setTokens] = useState<string[]>(["<start>"]);
  const addToken = useCallback((text: string) => {
    setTokens((prev) => [...prev, text]);
  }, []);

  function startNewLine() {
    setCompletedTokens((prev) => [...prev, tokens]);
    setTokens(["<start>"]);
  }

  if (!currentModel) {
    return <div>Loading autocomplete model...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="p-4 border rounded-md">
        {showModelSelector && (
          <MarkovModelSelector
            model={currentModel}
            onChangeAction={(m) => {
              console.log("Selected model:", m.name);
              setCurrentModel(m);
            }}
            showNSelector={showNSelector}
          />
        )}
        <div>
          {showModelSelector && <Label>Tekst:</Label>}
          <div
            className={
              "border rounded-md mt-2 h-40 max-h-40 overflow-y-scroll p-2"
            }
          >
            {completedTokens.map((tokens, index) => (
              <div key={index}>
                <AutocompleteTextRender
                  tokens={tokens}
                  showSpecialTokens={showSpecialTokens}
                  showContext={showContext}
                />
              </div>
            ))}
            <AutocompleteTextRender
              tokens={tokens}
              order={currentModel.order}
              showSpecialTokens={showSpecialTokens}
              showContext={showContext}
            />
          </div>
        </div>
        <SuggestionsBox
          className={"mt-4"}
          model={currentModel}
          tokens={tokens}
          maxSuggestions={maxSuggestions}
          onSuggestionClicked={(suggestion) => addToken(suggestion.token)}
          showProbabilityColor={showProbabilityColor}
          showStartNewLine={showStartNewLine}
          onStartNewLine={startNewLine}
        />
      </div>
    </div>
  );
};

export function TokensRenderer({
  tokens,
  showSpecialTokens = true,
}: {
  tokens: string[];
  showSpecialTokens?: boolean;
}): JSX.Element {
  return (
    <>
      {tokens.map((token, index) => (
        <span
          key={index}
          className={cn({
            hidden: !showSpecialTokens && isSpecialToken(token),
            "text-gray-500 b": showSpecialTokens && isSpecialToken(token),
          })}
        >
          {token} {index < tokens.length - 1 && " "}
        </span>
      ))}
    </>
  );
}

const AutocompleteTextRender: React.FC<{
  tokens: string[];
  order?: number;
  showSpecialTokens?: boolean;
  showContext?: boolean;
  className?: string;
}> = ({ tokens, order = 0, showSpecialTokens, showContext, className }) => {
  let outOfContext = tokens.length - order;
  if (!showContext) {
    outOfContext = tokens.length;
  }
  const preceding = tokens.slice(0, outOfContext);
  const contextTokens = order > 0 ? tokens.slice(outOfContext) : [];
  return (
    <div className={className}>
      {
        <span>
          <TokensRenderer
            tokens={preceding}
            showSpecialTokens={showSpecialTokens}
          />
        </span>
      }
      <span className="bg-yellow-200">
        <TokensRenderer
          tokens={contextTokens}
          showSpecialTokens={showSpecialTokens}
        />
      </span>
    </div>
  );
};

const SuggestionButton: React.FC<{
  suggestion: MarkovChainPrediction;
  maxProbability?: number;
  showProbabilityColor?: boolean;
  onClick: (suggestion: MarkovChainPrediction) => void;
}> = ({
  suggestion,
  onClick,
  maxProbability = 1,
  showProbabilityColor = true,
}) => {
  const style: React.CSSProperties = {};
  if (showProbabilityColor) {
    style["backgroundColor"] = calculateBackgroundColorBasedOnProbability(
      suggestion.probability,
      maxProbability
    );
  }

  return (
    <Button
      variant="outline"
      style={style}
      className="justify-between select-none"
      onClick={() => onClick(suggestion)}
    >
      <span>
        <TokensRenderer tokens={[suggestion.token]} />
      </span>
      <span className="ml-2 text-muted-foreground">
        {(suggestion.probability * 100).toFixed(2)}%
      </span>
    </Button>
  );
};

const SuggestionsBox: React.FC<{
  model: MarkovModel;
  tokens: string[];
  onSuggestionClicked: (suggestion: MarkovChainPrediction) => void;
  onStartNewLine: () => void;
  maxSuggestions?: number;
  className?: string;
  showProbabilityColor?: boolean;
  showStartNewLine?: boolean;
}> = ({
  model,
  tokens,
  onSuggestionClicked,
  onStartNewLine,
  maxSuggestions,
  showProbabilityColor,
  showStartNewLine,
  className,
}) => {
  const suggestions: MarkovChainPrediction[] = model.predictNextWords(tokens);
  const sortedSuggestions = suggestions.sort(
    (a, b) => b.probability - a.probability
  );

  if (maxSuggestions && sortedSuggestions.length > maxSuggestions) {
    sortedSuggestions.splice(maxSuggestions);
  }

  const maxProbability =
    sortedSuggestions.length === 0 ? 1 : sortedSuggestions[0].probability;

  const shouldShowStartNewLine =
    showStartNewLine || sortedSuggestions.length === 0;

  return (
    <>
      <div className={cn("grid grid-cols-1 md:grid-cols-3 gap-2", className)}>
        {sortedSuggestions.map((suggestion) => (
          <SuggestionButton
            key={suggestion.token}
            suggestion={suggestion}
            maxProbability={maxProbability}
            showProbabilityColor={showProbabilityColor}
            onClick={(s) => {
              onSuggestionClicked(s);
              if (
                !showStartNewLine &&
                onStartNewLine &&
                s.token === END_TOKEN
              ) {
                onStartNewLine();
              }
            }}
          />
        ))}
      </div>
      {shouldShowStartNewLine && (
        <div className={cn("grid grid-cols-1", className)}>
          <Button
            variant="outline"
            className="text-center"
            onClick={() => onStartNewLine()}
          >
            Start nieuwe lijn
          </Button>
        </div>
      )}
    </>
  );
};
