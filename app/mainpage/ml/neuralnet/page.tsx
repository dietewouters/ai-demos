export default function Home() {
  const DEMO_URL =
    "https://playground.tensorflow.org/#activation=tanh&batchSize=10&dataset=circle&regDataset=reg-plane&learningRate=0.03&regularizationRate=0&noise=0&networkShape=4,2&seed=0.25449&showTestData=false&discretize=false&percTrainData=50&x=true&y=true&xTimesY=false&xSquared=false&ySquared=false&cosX=false&sinX=false&cosY=false&sinY=false&collectStats=false&problem=classification&initZero=false&hideText=false";

  return (
    <main className="container max-w-6xl mx-auto p-4 py-8">
      <h1 className="text-3xl font-bold mb-3">Neural Networks</h1>
      <p className="text-gray-700 mb-6">
        Here you can find a demo for neural networks.
      </p>

      <a
        href={DEMO_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-white shadow-sm transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2"
        aria-label="Open de TensorFlow Playground demo (opent in nieuw tabblad)"
      >
        Open demo
        <span aria-hidden="true">↗</span>
      </a>

      <p className="mt-3 text-sm text-gray-500">Link opens in a new tab</p>
    </main>
  );
}
