import FCPlayground from "@/components/csp/fc-playground";

export default function Home() {
  return (
    <main className="container max-w-6xl mx-auto p-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Forward Checking Demo</h1>

      <section className="-mt-4 md:-mt-6">
        <FCPlayground />
      </section>
    </main>
  );
}
