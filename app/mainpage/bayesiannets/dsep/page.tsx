import DSeparationDemo from "@/components/bayesiannets/d-separatio-demo";
import { predefinedNetworks } from "@/components/bayesiannets/predefined-networks";

export default function Home() {
  return (
    <main className="container max-w-6xl mx-auto p-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Independence</h1>

      <DSeparationDemo
        networks={predefinedNetworks}
        defaultNetworkName="LISP" // interne key
        labels={{
          // hoe je ze wilt tonen
          LISP: "Fred's LISP dilemma",
          NUCLEAR: "Nuclear Power Plant",
          DRIVER: "Negligent Driver",
          HMM: "Hidden Markov Model",
          dsepNetwork: "Network exercise 7",
          weather: "Weather model",
          medical: "Medical model",
          student: "Student model",
        }}
        order={[
          "LISP",
          "NUCLEAR",
          "DRIVER",
          "HMM",
          "dsepNetwork",
          "weather",
          "medical",
          "student",
        ]}
      />
    </main>
  );
}
