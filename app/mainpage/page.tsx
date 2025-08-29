import Link from "next/link";

export default function Home() {
  return (
    <section className="mx-auto max-w-3xl p-8">
      <h1 className="text-4xl font-semibold text-center">
        Artificial Intelligence [H06U1A]
      </h1>
      <p className="mt-3 text-lg text-center">
        Welcome! This site gathers hands-on demos for the Artificial
        Intelligence course
      </p>

      <hr className="my-8" />

      <h2 className="text-2xl font-semibold">What you can explore</h2>
      <div className="mt-6 space-y-8">
        <div>
          <h3 className="text-xl font-semibold">Search</h3>
          <ul className="mt-2 list-disc pl-6 space-y-1">
            <li>
              Visualizations of all algorithms seen in exercise session 1:
              Depth-First, Breadth-First, Iterative Deepening, Greedy, Beam and
              Uniform Cost Search{" "}
            </li>
            <li>All of the above—plus A* and IDA*</li>
            <li>Tree exploring with MiniMax (and Alpha-Beta pruning)</li>
          </ul>
        </div>

        <div>
          <h3 className="text-xl font-semibold">
            Constraint Satisfaction Problems
          </h3>
          <ul className="mt-2 list-disc pl-6 space-y-1">
            <li>Backtracking search</li>
            <li>Forward Checking</li>
            <li>Arc Consistency (AC-3)</li>
          </ul>
        </div>

        <div>
          <h3 className="text-xl font-semibold">First Order Logic</h3>
          <ul className="mt-2 list-disc pl-6 space-y-1">
            <li>Finding Most General Unifier (MGU)</li>
            <li>Converting formula into Implicative Normal Form (INF)</li>
          </ul>
        </div>

        <div>
          <h3 className="text-xl font-semibold">Language Models</h3>
          <ul className="mt-2 list-disc pl-6 space-y-1">
            <li>Autocomplete and probabilities for N-grams</li>
          </ul>
        </div>

        <div>
          <h3 className="text-xl font-semibold">Bayesian Nets</h3>
          <ul className="mt-2 list-disc pl-6 space-y-1">
            <li>Probability visualization</li>
            <li>Constructing a Bayesian Net from a problem description</li>
            <li>Finding the Markov Blanket of a node</li>
            <li>Testing d-separation/independence</li>
          </ul>
        </div>

        <div>
          <h3 className="text-xl font-semibold">Solvers</h3>
          <ul className="mt-2 list-disc pl-6 space-y-1">
            <li>SAT solving with DPLL and #SAT</li>
            <li>Weighted Model Count</li>
          </ul>
        </div>

        <div>
          <h3 className="text-xl font-semibold">Machine Learning</h3>
          <ul className="mt-2 list-disc pl-6 space-y-1">
            <li>Visualization of K-NN </li>
            <li>
              Comparing Naive Bayes network with the original Bayesian network
            </li>
            <li>Training a Neural Network</li>
          </ul>
        </div>

        <div>
          <h3 className="text-xl font-semibold">Bayesian Learning</h3>
          <ul className="mt-2 list-disc pl-6 space-y-1">
            <li>Visualization of the Beta-Function</li>
            <li>The Expectation-Maximization (EM) algorithm</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
