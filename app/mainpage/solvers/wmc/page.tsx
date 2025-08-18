import { WMCDemo } from "@/components/solvers/wmc-demo";

export default function Page() {
  return (
    <main className="container max-w-6xl mx-auto p-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Solvers</h1>
      <h1 className="text-gray-700">
        Here is a demo about weighted model count.
      </h1>
      <br />
      <WMCDemo />
    </main>
  );
}
