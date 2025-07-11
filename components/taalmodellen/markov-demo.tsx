"use client";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/taps";
import { MarkovModelSelector } from "./markov-model-selector";
import { MarkovProbabilityTableView } from "./markov-model-table";
import { AutocompleteBox } from "./autocomplete-box";
import React from "react";
import { MarkovModel } from "./markov-model";
import { MarkovModelStore } from "./markov-model-store";

export const MarkovDemo = () => {
  const [model, setModel] = React.useState<MarkovModel>();
  // Load the model from the store
  React.useEffect(() => {
    async function loadModel() {
      if (!model) {
        try {
          const result = await MarkovModelStore.getDefaultModel();
          setModel(result);
        } catch (error) {
          console.error("Error fetching model:", error);
        }
      }
    }

    loadModel();
  }, [model]);
  if (!model) {
    return <div>Loading...</div>;
  }
  return (
    <Card>
      <CardContent>
        <Tabs defaultValue={"table"}>
          <TabsList className=" w-full">
            {/*<TabsTrigger value="input">Input</TabsTrigger>*/}
            <TabsTrigger value="autocomplete">Autocomplete</TabsTrigger>
            <TabsTrigger value="table">Kansentabel</TabsTrigger>
          </TabsList>
          <MarkovModelSelector model={model} onChangeAction={setModel} />
          <TabsContent value="table" className="space-y-4">
            <MarkovProbabilityTableView
              model={model}
            ></MarkovProbabilityTableView>
          </TabsContent>
          <TabsContent value="autocomplete" className="space-y-4">
            <AutocompleteBox
              model={model}
              showStartNewLine={true}
              maxSuggestions={900}
            ></AutocompleteBox>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
