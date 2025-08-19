import ExpectationMaximizationDemo from "@/components/bayesianlearning/expectation-maximization-demo";

export default function Page() {
  return (
    <main className="container max-w-6xl mx-auto p-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Expectation Maximization</h1>
      <h1 className="text-gray-700"></h1>
      <br />
      <ExpectationMaximizationDemo />
    </main>
  );
}
