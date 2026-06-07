import { useState } from "react"
import axios from "axios"

export default function App() {
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [savedPapers, setSavedPapers] = useState(() => {
    return JSON.parse(localStorage.getItem('savedPapers') || '[]')
  })
  const [activeCategory, setActiveCategory] = useState(null)

  function toggleSave(paper) {
    const exists = savedPapers.find(p => p.url === paper.url)
    const updated = exists
      ? savedPapers.filter(p => p.url !== paper.url)
      : [...savedPapers, paper]
    setSavedPapers(updated)
    localStorage.setItem('savedPapers', JSON.stringify(updated))
  }

  function isSaved(paper) {
    return savedPapers.some(p => p.url === paper.url)
  }

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
    <div className="min-h-screen bg-white text-gray-900 px-6 py-16 max-w-2xl mx-auto">

      <div className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-3">Research Paper Recommender</h1>
        <p className="text-gray-500 text-lg">Paste an ArXiv link. Find what to read next.</p>
      </div>

      <div className="flex flex-col gap-3 mb-12">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://arxiv.org/abs/1706.03762"
          className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm outline-none focus:border-gray-400 transition-colors"
        />
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-gray-900 text-white py-3 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-40"
        >
          {loading ? "Finding similar papers..." : "Find Similar Papers"}
        </button>
      </div>

      {error && <p className="text-red-500 text-sm mb-6">{error}</p>}

      {result && (
        <div className="w-full">
          <div className="border border-gray-100 rounded-lg p-5 mb-6 bg-gray-50">
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">Input Paper</p>
            <h2 className="text-base font-semibold leading-snug">{result.input_paper.title}</h2>
          </div>

          <div className="flex gap-2 flex-wrap mb-6">
            {['machine learning', 'computer vision', 'natural language processing'].map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  activeCategory === cat
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <p className="text-xs text-gray-400 uppercase tracking-widest mb-4">Recommended Papers</p>

          <div className="flex flex-col divide-y divide-gray-100">
            {result.recommendations.map((paper, i) => (
              <div key={i} className="py-5">
                <div className="flex justify-between items-start gap-4 mb-2">
                  <h3 className="text-sm font-semibold leading-snug">{paper.title}</h3>
                  <span className="text-xs text-gray-400 shrink-0 mt-0.5">
                    {(paper.score * 100).toFixed(0)}% match
                  </span>
                </div>
                <p className="text-gray-500 text-sm line-clamp-3 mb-3">{paper.abstract}</p>
                <a href={paper.url} target="_blank" className="text-xs text-gray-900 font-medium hover:underline">
                  View on ArXiv →
                </a>
                <button
                  onClick={() => toggleSave(paper)}
                  className={`ml-4 text-xs font-medium px-3 py-1 rounded-full border transition-colors ${
                    isSaved(paper)
                      ? 'text-green-600 border-green-200 bg-green-50'
                      : 'text-gray-500 border-gray-200 hover:border-gray-400'
                  }`}
                >
                  {isSaved(paper) ? '✓ Saved' : '+ Save'}
                </button>
              </div>
            ))}
          </div>

          {savedPapers.length > 0 && (
            <div className="mt-12">
              <p className="text-xs text-gray-400 uppercase tracking-widest mb-4">Saved Papers</p>
              <div className="flex flex-col divide-y divide-gray-100">
                {savedPapers.map((paper, i) => (
                  <div key={i} className="py-5">
                    <div className="flex justify-between items-start gap-4">
                      <h3 className="text-sm font-semibold">{paper.title}</h3>
                      <button
                        onClick={() => toggleSave(paper)}
                        className="text-xs text-red-400 hover:text-red-600 shrink-0"
                      >
                        Remove
                      </button>
                    </div>
                    <a href={paper.url} target="_blank" className="text-xs text-gray-900 font-medium hover:underline mt-1 inline-block">
                      View on ArXiv →
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}