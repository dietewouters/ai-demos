"use client";
import { buildMarkovChain } from "./markov-model";
import { MarkovModel } from "./markov-model";
import { useEffect, useState } from "react";
import modelsData from "./markov-model.json";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export type MarkovModelData = {
  name: string;
  displayName: string;
  trainingText?: string;
  trainingFile?: string;
};

async function getTrainingText(
  markovModelData: MarkovModelData
): Promise<string> {
  if (markovModelData.trainingText) {
    return markovModelData.trainingText;
  } else if (markovModelData.trainingFile) {
    let filePath = markovModelData.trainingFile;
    if (!filePath.startsWith("http")) {
      // ensure leading slash
      if (!filePath.startsWith("/")) filePath = `/${filePath}`;
      filePath = `${basePath}${filePath}`;
    }

    // Fetch the url and return
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`Failed to fetch training text: ${response.statusText}`);
    }
    const result = await response.text();
    markovModelData.trainingText = result;
    return result;
  } else {
    throw new Error(
      `No training text found for model: ${JSON.stringify(markovModelData)}`
    );
  }
}

export class MarkovModelStore {
  private static cache = new Map<string, MarkovModel>();

  private static getKey(name: string, n: number): string {
    return `${n}:${name}`;
  }

  public static async getModel(name: string, n: number): Promise<MarkovModel> {
    // Check if already stored
    const key = this.getKey(name, n);
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    // Check if we know the name
    const markovModelData: MarkovModelData | undefined = modelsData.find(
      (d) => d.name === name
    );
    if (!markovModelData) {
      throw Error("Could not find markov model data: " + name + "/" + n);
    }

    const trainingText = await getTrainingText(markovModelData);
    return this._getModel(name, markovModelData.displayName, n, trainingText);
  }

  private static _getModel(
    name: string,
    displayName: string,
    n: number,
    trainingText: string
  ): MarkovModel {
    const markovChain = buildMarkovChain(trainingText, n);
    const fallbackModelRetriever =
      n > 1
        ? () =>
            MarkovModelStore._getModel(name, displayName, n - 1, trainingText)
        : undefined;

    const model = new MarkovModel(
      name,
      displayName,
      n,
      markovChain,
      fallbackModelRetriever
    );
    this.cache.set(this.getKey(name, n), model);

    return model;
  }

  public static getDefaultModelName(): string {
    return MarkovModelStore.getAllMarkovModelsData()[0].name;
  }

  public static getDefaultModel() {
    return MarkovModelStore.getModel(this.getDefaultModelName(), 3);
  }

  public static getAllMarkovModelsData(): MarkovModelData[] {
    return modelsData;
  }
}

export function useLoadMarkovModel(
  initialModel: MarkovModel | undefined,
  modelName: string | undefined,
  n: number | undefined
): [MarkovModel | undefined, (model: MarkovModel | undefined) => void] {
  const [currentModel, setCurrentModel] = useState<MarkovModel | undefined>(
    initialModel
  );

  useEffect(() => {
    async function loadModel() {
      if (initialModel) {
        setCurrentModel(initialModel);
      } else if (!currentModel) {
        try {
          console.log("Loading model:", modelName);
          let result;
          if (modelName) {
            result = await MarkovModelStore.getModel(modelName, n || 3);
          } else {
            result = await MarkovModelStore.getDefaultModel();
          }
          setCurrentModel(result);
        } catch (error) {
          console.error("Error fetching model:", error);
        }
      }
    }

    loadModel();
  }, [initialModel, currentModel, modelName, n]);

  return [currentModel, setCurrentModel];
}
