export default function Home() {
  const demossearch = [
    {
      title: "Introduction to search algorithms",
      url: "https://www.redblobgames.com/pathfinding/a-star/introduction.html",
    },
    {
      title: "PathFinding functions visualized",
      url: "https://qiao.github.io/PathFinding.js/visual/",
    },
    {
      title: "Graph Traversal DFS/BFS",
      url: "https://visualgo.net/en/dfsbfs?slide=1",
    },
    {
      title: "N‑Puzzle",
      url: "https://tristanpenman.com/demos/n-puzzle/",
    },
    {
      title: "Solving problems by searching",
      url: "https://aimacode.github.io/aima-javascript/3-Solving-Problems-By-Searching/",
    },
    {
      title: "Beyond classical search",
      url: "https://aimacode.github.io/aima-javascript/4-Beyond-Classical-Search/",
    },
  ];
  const demosadvancedsearch = [
    {
      title: "Minimax and Alpha-Beta pruning demo",
      url: "https://raphsilva.github.io/utilities/minimax_simulator/",
    },
    {
      title: "Adversarial Search",
      url: "https://aimacode.github.io/aima-javascript/5-Adversarial-Search/",
    },
  ];
  const demoscsp = [
    {
      title: "Javascript constraints",
      url: "https://prajitr.github.io/jusCSP/",
    },
    {
      title: "Constraint Satisfaction Notebook",
      url: "https://github.com/ToniRV/Constraint-Satisfaction-Notebook/blob/master/CSPs.ipynb",
    },
    {
      title: "Constraint Satisfaction Problems",
      url: "https://aimacode.github.io/aima-javascript/6-Constraint-Satisfaction-Problems/",
    },
    {
      title: "CPMpy",
      url: "https://mybinder.org/v2/gh/CPMpy/cpmpy/HEAD?labpath=examples%2Fquickstart_sudoku.ipynb",
    },
  ];
  const demosprob = [
    {
      title: "Introduction to Probability",
      url: "https://dlsun.github.io/probability/bayes.html",
    },
    {
      title: "Conditional Probability Visualized",
      url: "https://setosa.io/conditional/",
    },
    {
      title: "Bite Size Bayes",
      url: "https://colab.research.google.com/github/AllenDowney/BiteSizeBayes/blob/master/02_bayes.ipynb",
    },
  ];
  const demosbayesiannets = [
    {
      title: "Bayes Server",
      url: "https://www.bayesserver.com/examples/networks/simpsons-paradox",
    },
    {
      title: "Pgmpy Notebook",
      url: "https://github.com/pgmpy/pgmpy/blob/dev/examples/Monty%20Hall%20Problem.ipynb",
    },
    {
      title: "Hidden Markov Model",
      url: "https://colab.research.google.com/drive/1IUe9lfoIiQsL49atSOgxnCmMR_zJazKI",
    },
    {
      title: "D-separation",
      url: "https://ml-kuleuven.github.io/ai-course-demos/demos/6.%20Bayesian%20Networks/D-separationguide/dsepar_index.html",
    },
  ];
  const demossolvers = [
    {
      title: "DPLL SAT Solver",
      url: "https://www.inf.ufpr.br/dpasqualin/d3-dpll/",
    },
    {
      title: "Z3 SAT Solver",
      url: "https://colab.research.google.com/github/philzook58/z3_tutorial/blob/master/Z3%20Tutorial.ipynb",
    },
    { title: "Zebra Puzzle", url: "https://bartbog.github.io/zebra/origin/" },
  ];
  const demosmarkov = [
    {
      title: "Value Iteration Algorithm",
      url: "https://medium.com/@ngao7/markov-decision-process-value-iteration-2d161d50a6ff",
    },
    {
      title: "GridWorld: Dynamic Programming",
      url: "https://cs.stanford.edu/people/karpathy/reinforcejs/gridworld_dp.html",
    },
  ];
  const demosml = [
    {
      title: "K-NN Visualization",
      url: "https://codepen.io/gangtao/pen/PPoqMW",
    },
    {
      title: "Distance Metrics",
      url: "https://medium.com/@luigi.fiori.lf0303/distance-metrics-and-k-nearest-neighbor-knn-1b840969c0f4",
    },
    {
      title: "Backpropagation",
      url: "https://xnought.github.io/backprop-explainer/",
    },
    {
      title: "Anomaly Detection",
      url: "https://www.geeksforgeeks.org/machine-learning/machine-learning-for-anomaly-detection/",
    },
    {
      title: "Google teachable machine",
      url: "https://teachablemachine.withgoogle.com/",
    },
    { title: "LLM visualization", url: "https://bbycroft.net/llm" },
  ];
  return (
    <main className="container max-w-6xl mx-auto p-6 py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">External demos</h1>
        <p className="mt-2 text-gray-600">
          A selection of useful demos related to this course.
        </p>
      </header>
      <div className="space-y-12 sm:space-y-14 lg:space-y-16">
        <section aria-labelledby="search-algos">
          <h2 id="search-algos" className="text-xl font-semibold mb-4">
            Search algorithms
          </h2>

          <ul role="list" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {demossearch.map((demo) => (
              <li key={demo.url}>
                <a
                  href={demo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block rounded-2xl border border-gray-200 p-4 shadow-sm transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                  aria-label={`${demo.title} (opens in new tab)`}
                  aria-describedby="newtab-note"
                >
                  <div className="flex items-start justify-between">
                    <span className="font-medium">{demo.title}</span>
                    <span aria-hidden="true" className="text-xl leading-none">
                      ↗
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">Open demo</p>
                </a>
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="search-algos">
          <h2 id="search-algos" className="text-xl font-semibold mb-4">
            Advanced Search and Games
          </h2>

          <ul role="list" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {demosadvancedsearch.map((demo) => (
              <li key={demo.url}>
                <a
                  href={demo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block rounded-2xl border border-gray-200 p-4 shadow-sm transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                  aria-label={`${demo.title} (opens in new tab)`}
                  aria-describedby="newtab-note"
                >
                  <div className="flex items-start justify-between">
                    <span className="font-medium">{demo.title}</span>
                    <span aria-hidden="true" className="text-xl leading-none">
                      ↗
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">Open demo</p>
                </a>
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="search-algos">
          <h2 id="search-algos" className="text-xl font-semibold mb-4">
            Constraint Satisfaction Problems
          </h2>

          <ul role="list" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {demoscsp.map((demo) => (
              <li key={demo.url}>
                <a
                  href={demo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block rounded-2xl border border-gray-200 p-4 shadow-sm transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                  aria-label={`${demo.title} (opens in new tab)`}
                  aria-describedby="newtab-note"
                >
                  <div className="flex items-start justify-between">
                    <span className="font-medium">{demo.title}</span>
                    <span aria-hidden="true" className="text-xl leading-none">
                      ↗
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">Open demo</p>
                </a>
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="search-algos">
          <h2 id="search-algos" className="text-xl font-semibold mb-4">
            Probability
          </h2>

          <ul role="list" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {demosprob.map((demo) => (
              <li key={demo.url}>
                <a
                  href={demo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block rounded-2xl border border-gray-200 p-4 shadow-sm transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                  aria-label={`${demo.title} (opens in new tab)`}
                  aria-describedby="newtab-note"
                >
                  <div className="flex items-start justify-between">
                    <span className="font-medium">{demo.title}</span>
                    <span aria-hidden="true" className="text-xl leading-none">
                      ↗
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">Open demo</p>
                </a>
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="search-algos">
          <h2 id="search-algos" className="text-xl font-semibold mb-4">
            Bayesian Networks
          </h2>

          <ul role="list" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {demosbayesiannets.map((demo) => (
              <li key={demo.url}>
                <a
                  href={demo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block rounded-2xl border border-gray-200 p-4 shadow-sm transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                  aria-label={`${demo.title} (opens in new tab)`}
                  aria-describedby="newtab-note"
                >
                  <div className="flex items-start justify-between">
                    <span className="font-medium">{demo.title}</span>
                    <span aria-hidden="true" className="text-xl leading-none">
                      ↗
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">Open demo</p>
                </a>
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="search-algos">
          <h2 id="search-algos" className="text-xl font-semibold mb-4">
            Solvers
          </h2>

          <ul role="list" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {demossolvers.map((demo) => (
              <li key={demo.url}>
                <a
                  href={demo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block rounded-2xl border border-gray-200 p-4 shadow-sm transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                  aria-label={`${demo.title} (opens in new tab)`}
                  aria-describedby="newtab-note"
                >
                  <div className="flex items-start justify-between">
                    <span className="font-medium">{demo.title}</span>
                    <span aria-hidden="true" className="text-xl leading-none">
                      ↗
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">Open demo</p>
                </a>
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="search-algos">
          <h2 id="search-algos" className="text-xl font-semibold mb-4">
            Markov
          </h2>

          <ul role="list" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {demosmarkov.map((demo) => (
              <li key={demo.url}>
                <a
                  href={demo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block rounded-2xl border border-gray-200 p-4 shadow-sm transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                  aria-label={`${demo.title} (opens in new tab)`}
                  aria-describedby="newtab-note"
                >
                  <div className="flex items-start justify-between">
                    <span className="font-medium">{demo.title}</span>
                    <span aria-hidden="true" className="text-xl leading-none">
                      ↗
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">Open demo</p>
                </a>
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="search-algos">
          <h2 id="search-algos" className="text-xl font-semibold mb-4">
            Machine Learning
          </h2>

          <ul role="list" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {demosml.map((demo) => (
              <li key={demo.url}>
                <a
                  href={demo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block rounded-2xl border border-gray-200 p-4 shadow-sm transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                  aria-label={`${demo.title} (opens in new tab)`}
                  aria-describedby="newtab-note"
                >
                  <div className="flex items-start justify-between">
                    <span className="font-medium">{demo.title}</span>
                    <span aria-hidden="true" className="text-xl leading-none">
                      ↗
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">Open demo</p>
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
