import ImplicativeNormalFormDemo from "@/components/fo/implicative-normal-form-demo";

export default function Home() {
  return (
    <main className="container max-w-6xl mx-auto p-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Implicative Normal Form</h1>
      <h1 className="text-gray-700">
        Here is a demo about the algorithm to put a formula in implicative
        normal form.
      </h1>
      <br />
      <ImplicativeNormalFormDemo />
    </main>
  );
}
