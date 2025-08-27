import AC3Playground from "@/components/csp/ac3-playground";

export default function Home() {
  return (
    <main className="container max-w-6xl mx-auto p-4 py-8">
      <h1 className="text-3xl font-bold mb-6">AC-3 Demo</h1>

      <section className="-mt-4 md:-mt-6">
        <AC3Playground />
      </section>
    </main>
  );
}
