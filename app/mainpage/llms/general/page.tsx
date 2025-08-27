import { MarkovDemo } from "@/components/taalmodellen/markov-demo";

export default function Home() {
  return (
    <main className="container max-w-6xl mx-auto p-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Language Models</h1>

      <br />
      <MarkovDemo />
    </main>
  );
}
