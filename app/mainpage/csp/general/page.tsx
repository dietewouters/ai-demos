import CSPVisualizer from "@/components/csp/csp-visualizer";

export default function Home() {
  return (
    <main className="container max-w-6xl mx-auto p-4 py-8">
      <h1 className="text-3xl font-bold mb-6">
        Constraint Satisfaction Problems
      </h1>
      <h1 className="text-gray-700">Here is a demo about CSP's.</h1>
      <br />
      <CSPVisualizer />
    </main>
  );
}
