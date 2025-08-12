import AC3Playground from "@/components/csp/ac3-playground";

export default function Home() {
  return (
    <main className="container max-w-6xl mx-auto p-4 py-8">
      <h1 className="text-3xl font-bold mb-6">AC-3 Demo</h1>
      <h1 className="text-gray-700">
        Here is a demo about the AC-3 algorithm.
      </h1>
      <br />
      <AC3Playground />
    </main>
  );
}
