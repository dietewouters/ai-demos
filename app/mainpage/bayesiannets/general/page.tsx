import BayesianNetworkDemo from "@/components/bayesiannets/bayesian-network-demo";
import ExerciseNetworkDemo from "@/components/bayesiannets/demo-exercises";
import { exerciseNetworks } from "@/components/bayesiannets/exercise-networks";

export default function Home() {
  return (
    <main className="container max-w-6xl mx-auto p-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Bayesian Networks Demo</h1>
      <h1 className="text-gray-700">
        Here are some demos of Bayesian networks discussed in the exercise
        session (and a few extra's). You can select one of these networks to see
        the demo for that network.
      </h1>
      <br />
      <BayesianNetworkDemo />
    </main>
  );
}
