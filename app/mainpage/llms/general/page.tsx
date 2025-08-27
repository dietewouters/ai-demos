import { MarkovDemo } from "@/components/taalmodellen/markov-demo";

export default function Home() {
  return (
    <main className="container max-w-6xl mx-auto p-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Language Models</h1>
      <h1 className="text-gray-700">
        Here is a general demo about autocomplete and probabilities for N-grams.
      </h1>
      <br />
      <MarkovDemo />
    </main>
  );
}
