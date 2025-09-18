import SearchDemo from "@/components/search/search-demo";
import { algorithms2 } from "@/components/search/algorithms/algorithms2";

export default function Home() {
  return (
    <main className="container max-w-6xl mx-auto p-4 py-8">
      <h1 className="text-3xl font-bold mb-6">
        Advanced Search Algorithms Demo
      </h1>

      <br />
      <SearchDemo algorithms={algorithms2} />
    </main>
  );
}
