"use client";

import React, { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MarkovModel, MarkovModelType } from "./markov-model";
import { MarkovModelStore } from "./markov-model-store";
import cn from "clsx";

export const MarkovModelSelector: React.FC<{
  model: MarkovModelType;
  onChangeAction: (model: MarkovModel) => void; // renamed prop for serializability
  maxN?: number;
  showNSelector?: boolean;
}> = ({ model, onChangeAction, maxN = 3, showNSelector = true }) => {
  const [selectedModelName, setSelectedModelName] = useState<string>(
    model.name
  );
  const [selectedN, setSelectedN] = useState<number>(model.n);

  useEffect(() => {
    async function loadModel() {
      const newModel = await MarkovModelStore.getModel(
        selectedModelName,
        selectedN
      );
      if (newModel && onChangeAction) {
        onChangeAction(newModel);
      }
    }

    loadModel();
  }, [selectedModelName, selectedN, onChangeAction]);

  const allModels = MarkovModelStore.getAllMarkovModelsData();
  const handleModelChange = (value: string) => {
    setSelectedModelName(
      allModels.find((modelData) => modelData.name === value)!.name
    );
  };

  const handleNChange = (value: number) => {
    setSelectedN(value);
  };

  const allNValues = Array.from({ length: maxN }, (_, i) => i + 1);

  return (
    <div className={"pb-4"}>
      <Label>Model:</Label>
      <div
        className={cn("mt-2 grid grid-cols-1 gap-2", {
          "md:grid-cols-2": showNSelector,
        })}
      >
        <Select onValueChange={handleModelChange} value={selectedModelName}>
          <SelectTrigger id="model-select" className="w-full">
            <SelectValue placeholder="Select model" />
          </SelectTrigger>
          <SelectContent>
            {allModels.map((modelData) => (
              <SelectItem key={modelData.name} value={modelData.name}>
                {modelData.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {showNSelector && (
          <Select
            onValueChange={(value) => handleNChange(parseInt(value))}
            value={selectedN.toString()}
          >
            <SelectTrigger id="n-select" className="w-full">
              <SelectValue placeholder="Select n" />
            </SelectTrigger>
            <SelectContent>
              {allNValues.map((n) => (
                <SelectItem key={n} value={n.toString()}>
                  {n}-gram
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
};
