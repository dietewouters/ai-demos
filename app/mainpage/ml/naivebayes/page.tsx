import DSeparationDemo from "@/components/bayesiannets/d-separatio-demo";
import { naivebayesnetworks } from "@/components/bayesiannets/naivebayesnetworks";

export default function Home() {
  return (
    <main className="container max-w-6xl mx-auto p-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Independence</h1>

      <DSeparationDemo
        networks={naivebayesnetworks}
        labels={{
          bayesiannet: "Bayesian Network",
          naivebayesnets: "Naïve Bayes Network",
        }}
        order={["bayesiannet", "naivebayesnets"]}
        defaultNetworkName="bayesiannet"
      />
    </main>
  );
}
