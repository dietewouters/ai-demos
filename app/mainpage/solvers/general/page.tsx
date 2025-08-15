import { SATSolverDemo } from "@/components/solvers/sat-solver";

export default function Page() {
  return (
    <main className="container max-w-6xl mx-auto p-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Solvers</h1>
      <h1 className="text-gray-700">
        Here is a demo about the algorithms seen in exercise session 9.
      </h1>
      <br />
      <SATSolverDemo />
    </main>
  );
}
