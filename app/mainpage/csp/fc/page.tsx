import FCPlayground from "@/components/csp/fc-playground";

export default function Home() {
  return (
    <main className="container max-w-6xl mx-auto p-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Forward checking Demo</h1>
      <h1 className="text-gray-700">
        Here is a demo about the forward checking algorithm.
      </h1>
      <br />
      <FCPlayground />
    </main>
  );
}
