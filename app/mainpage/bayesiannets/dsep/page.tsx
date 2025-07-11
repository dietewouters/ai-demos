import MarkovBlanketDemo from "@/components/bayesiannets/markov-blanket-demo";
import { dsepnetwork } from "@/components/bayesiannets/network-registry";
import DSeparationDemo from "@/components/bayesiannets/d-separatio-demo";

export default function Home() {
  return (
    <main className="container max-w-6xl mx-auto p-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Exercise 7</h1>

      <div className="mt-8"></div>
      <p className="text-gray-700">
        Below you can find a demo showing how to decide which nodes are
        d-separated for exercise 7.
      </p>

      <DSeparationDemo network={dsepnetwork} />
    </main>
  );
}
