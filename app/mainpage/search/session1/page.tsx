import SearchDemo from "@/components/search/search-demo";
import { algorithms } from "@/components/search/algorithms/algorithms";

export default function Home() {
  return (
    <main className="container max-w-6xl mx-auto p-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Search Algorithms Demo</h1>
      <h1 className="text-gray-700">
        Here is a demo about search algorithms seen in exercise session 1.
      </h1>
      <br />
      <SearchDemo algorithms={algorithms} />
    </main>
  );
}
