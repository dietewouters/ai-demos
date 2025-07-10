import BayesianNetworkDemo from "@/components/bayesiannets/bayesian-network-demo";
import ExerciseNetworkDemo from "@/components/bayesiannets/demo-exercises";
import { exerciseNetworks } from "@/components/bayesiannets/exercise-networks";
import HMMDemo from "@/components/bayesiannets/hmm-demo";

export default function Home() {
  return (
    <main className="container max-w-6xl mx-auto p-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Hidden Markov Models</h1>
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Scenario</h2>
        <p className="text-gray-700">
          On some days, the TA responds, while on others he doesn't (Y). The TA
          can be at work or on holiday (X), but the student cannot perceive this
          directly. The student can only observe the TA's response (Y), which is
          influenced by whether the TA is at work or on holiday.
        </p>
      </div>
      <HMMDemo />
    </main>
  );
}
