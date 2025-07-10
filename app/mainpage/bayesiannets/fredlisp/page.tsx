import BayesianNetworkDemo from "@/components/bayesiannets/bayesian-network-demo";
import ExerciseNetworkDemo from "@/components/bayesiannets/demo-exercises";
import { exerciseNetworks } from "@/components/bayesiannets/exercise-networks";
import MarkovBlanketDemo from "@/components/bayesiannets/markov-blanket-demo";
import { lispNetwork } from "@/components/bayesiannets/network-registry";

export default function Home() {
  return (
    <main className="container max-w-6xl mx-auto p-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Fred LISP dilemma</h1>
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Scenario</h2>
        <p className="text-gray-700">
          Their are only two situations that could cause the LISP interpreter I
          to stop running: There are either problems with the computer hardware
          H, or there is a bug in Fred's code C. Fred is also running an editor
          E in which he is writing and editing his LISP code.
        </p>
        <h3 className="text-lg font-medium">Variables:</h3>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li>
            <strong>I</strong>: Interpreter (Boolean - true if runs/false if
            stops)
          </li>
          <li>
            <strong>C</strong>: Code (Boolean - true if contains a bug)
          </li>
          <li>
            <strong>H</strong>: Hardware (Boolean - true if functioning
            properly)
          </li>
          <li>
            <strong>E</strong>: Editor (Boolean - true if running)
          </li>
        </ul>
      </div>
      <div className="mt-8"></div>
      <ExerciseNetworkDemo networkName="LISP" />
      <div className="mt-8"></div>
      <p className="text-gray-700">
        Below you can find a demo showing how the Markov blanket of different
        nodes in this network can be found.
      </p>

      <MarkovBlanketDemo network={lispNetwork} />
    </main>
  );
}
