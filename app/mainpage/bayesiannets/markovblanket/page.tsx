import BayesianNetworkDemo from "@/components/bayesiannets/bayesian-network-demo";
import ExerciseNetworkDemo from "@/components/bayesiannets/demo-exercises";
import MarkovBlanketDemo from "@/components/bayesiannets/markov-blanket-demo";
import { exerciseNetworks } from "@/components/bayesiannets/exercise-networks";
import { driverNetwork } from "@/components/bayesiannets/network-registry";
import DSeparationDemo from "@/components/bayesiannets/d-separatio-demo";

export default function Home() {
  return (
    <main className="container max-w-6xl mx-auto p-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Markov blanket</h1>
      <div className="space-y-4"></div>

      <div className="mt-8"></div>
      <p className="text-gray-700">
        Below you can find a demo showing how the Markov blanket of different
        nodes in Bayesian networks can be found.
      </p>

      <MarkovBlanketDemo />
    </main>
  );
}
