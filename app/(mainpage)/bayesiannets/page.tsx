import BayesianNetworkDemo from "@/components/bayesiannets/bayesian-network-demo";
import ExerciseNetworkDemo from "@/components/bayesiannets/demo-exercises";
import { exerciseNetworks } from "@/components/bayesiannets/exercise-networks";

export default function Home() {
  return (
    <main className="container max-w-6xl mx-auto p-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Bayesian Networks</h1>
      <h1 className="text-xl mb-6">
        This section shows demos regarding the exercise session about Bayesian
        nets.
      </h1>
    </main>
  );
}
