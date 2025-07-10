import BayesianNetworkDemo from "@/components/bayesiannets/bayesian-network-demo";
import ExerciseNetworkDemo from "@/components/bayesiannets/demo-exercises";
import MarkovBlanketDemo from "@/components/bayesiannets/markov-blanket-demo";
import { exerciseNetworks } from "@/components/bayesiannets/exercise-networks";
import NetworkConstructionDemo from "@/components/bayesiannets/network-construction-demo";
import { nuclearNetwork } from "@/components/bayesiannets/network-registry";

export default function Home() {
  return (
    <div className="container max-w-6xl mx-auto p-4 py-8">
      <div className="text-3xl font-bold mb-6">Nuclear power plant</div>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Scenario</h2>
          <p className="text-gray-700">
            In your local nuclear power station, there is an alarm that senses
            when a temperature gauge exceeds a given threshold. The gauge
            measures the temperature of the core.
          </p>

          <h3 className="text-lg font-medium">Variables:</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            <li>
              <strong>A</strong>: Alarm sounds (Boolean - true if sounds)
            </li>
            <li>
              <strong>
                F<sub>A</sub>
              </strong>
              : Alarm is faulty (Boolean - true if faulty)
            </li>
            <li>
              <strong>
                F<sub>G</sub>
              </strong>
              : Gauge is faulty (Boolean - true if faulty)
            </li>
            <li>
              <strong>G</strong>: Gauge reading (Boolean - normal (true) or high
              (false))
            </li>
            <li>
              <strong>T</strong>: Actual core temperature (Boolean - normal
              (true) or high (false))
            </li>
          </ul>
        </div>
      </div>

      <div className="mt-8">
        <div className="text-xl font-semibold">Set up the network</div>
        <p className="text-gray-700">
          First we will learn how to set up a Bayesian network. You can use the
          demo below to build it step by step.
        </p>

        <NetworkConstructionDemo />
      </div>
      <div className="mt-8">
        <p className="text-gray-700">
          Below you can see the Bayesian network that you just build. You can
          change the probabilities to understand how each variable effects the
          other variables.
        </p>

        <ExerciseNetworkDemo networkName="NUCLEAR" />
        <div className="mt-8"></div>
        <p className="text-gray-700">
          Below you can find a demo showing how the Markov blanket of different
          nodes in this network can be found.
        </p>

        <MarkovBlanketDemo network={nuclearNetwork} />
      </div>
    </div>
  );
}
