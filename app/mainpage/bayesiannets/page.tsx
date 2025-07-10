import BayesianNetworkDemo from "@/components/bayesiannets/bayesian-network-demo";
import ExerciseNetworkDemo from "@/components/bayesiannets/demo-exercises";
import { exerciseNetworks } from "@/components/bayesiannets/exercise-networks";

export default function Home() {
  return (
    <main className="container max-w-6xl mx-auto p-4 py-8">
      <h1 className="text-3xl font-bold mb-6">
        This page contains demo's for the exercise session about Bayesian
        Networks.
      </h1>
      <h1 className="text-xl mb-6">
        To start, there is a general demo of a Bayesian Network. You can play a
        bit with it to understand how it works.
      </h1>
      <BayesianNetworkDemo />
    </main>
  );
}
