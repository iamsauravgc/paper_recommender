import { useState } from "react"
import axios from "axios"

export default function App() {
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  async function handleSubmit() {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await axios.post("http://localhost:8000/recommend", { url })
      setResult(res.data)
    } catch (err) {
      setError("Something went wrong. Check the URL.")
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">ArXiv Paper Recommender</h1>
      <p className="text-gray-400 mb-8">Paste an ArXiv paper URL to find similar research</p>

      <div className="flex gap-3 mb-8">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://arxiv.org/abs/1706.03762"
          className="flex-1 bg-gray-800 rounded-lg px-4 py-3 text-white outline-none"
        />
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold disabled:opacity-50"
        >
          {loading ? "Searching..." : "Find Similar"}
        </button>
      </div>

      {error && <p className="text-red-400 mb-4">{error}</p>}

      {result && (
        <div>
          <div className="bg-gray-800 rounded-lg p-5 mb-6">
            <p className="text-xs text-blue-400 mb-1">INPUT PAPER</p>
            <h2 className="text-lg font-semibold">{result.input_paper.title}</h2>
          </div>

          <h3 className="text-gray-400 text-sm mb-3">RECOMMENDED PAPERS</h3>
          <div className="flex flex-col gap-4">
            {result.recommendations.map((paper, i) => (
              <div key={i} className="bg-gray-800 rounded-lg p-5">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold flex-1 pr-4">{paper.title}</h4>
                  <span className="text-blue-400 text-sm shrink-0">
                    {(paper.score * 100).toFixed(0)}% match
                  </span>
                </div>
                <p className="text-gray-400 text-sm line-clamp-3">{paper.abstract}</p>
                <a
                  href={paper.url}
                  target="_blank"
                  className="text-blue-400 text-sm mt-2 inline-block hover:underline"
                >
                  View on ArXiv →
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}