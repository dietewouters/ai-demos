import BayesianNetworkDemo from "@/components/bayesiannets/bayesian-network-demo";
import ExerciseNetworkDemo from "@/components/bayesiannets/demo-exercises";
import MarkovBlanketDemo from "@/components/bayesiannets/markov-blanket-demo";
import { exerciseNetworks } from "@/components/bayesiannets/exercise-networks";
import NetworkConstructionDemo from "@/components/bayesiannets/network-construction-demo";
import { nuclearNetwork } from "@/components/bayesiannets/network-registry";
import DSeparationDemo from "@/components/bayesiannets/d-separatio-demo";

export default function Home() {
  return (
    <div className="container max-w-6xl mx-auto p-4 py-8">
      <div className="text-3xl font-bold mb-6">Construction Demo</div>

      <div className="mt-8">
        <p className="text-gray-700">
          This demo shows how the Bayesian net of exercise 3 is constructed
        </p>
        <br />
        <NetworkConstructionDemo />
      </div>
    </div>
  );
}
