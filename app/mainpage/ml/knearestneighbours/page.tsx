import KNNDemo from "@/components/ml/knn-demo";
export default function Home() {
  return (
    <main className="container max-w-6xl mx-auto p-4 py-8">
      <h1 className="text-3xl font-bold mb-6">K-Nearest Neighbours</h1>
      <h1 className="text-gray-700">
        Here is a demo for the K-Nearest Neighbours algorithm.
      </h1>
      <br />
      <KNNDemo />
    </main>
  );
}
