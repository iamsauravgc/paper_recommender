import { useState } from "react"
import api from "../api.js"
import SearchBar from "../components/SearchBar.jsx"
import ErrorDisplay from "../components/ErrorDisplay.jsx"
import FilterPills from "../components/FilterPills.jsx"
import PaperCard from "../components/PaperCard.jsx"
import SkeletonCard from "../components/SkeletonCard.jsx"
import SavedPapers from "../components/SavedPapers.jsx"

export default function Home() {
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [savedPapers, setSavedPapers] = useState(() => {
    return JSON.parse(localStorage.getItem("savedPapers") || "[]")
  })
  const [activeCategory, setActiveCategory] = useState(null)

  async function toggleSave(paper) {
    const exists = savedPapers.find((p) => p.url === paper.url)
    const updated = exists
      ? savedPapers.filter((p) => p.url !== paper.url)
      : [...savedPapers, paper]

    try {
      if (exists) {
        await api.delete(`/bookmarks/${encodeURIComponent(paper.url)}`)
      } else {
        await api.post("/bookmarks", {
          url: paper.url, title: paper.title,
          abstract: paper.abstract, category: paper.category,
        })
      }
    } catch { /* not logged in — localStorage fallback is fine */ }

    setSavedPapers(updated)
    localStorage.setItem("savedPapers", JSON.stringify(updated))
  }

  function isSaved(paper) {
    return savedPapers.some((p) => p.url === paper.url)
  }

  function getErrorMessage(status) {
    if (status === 400) return { message: "Invalid URL. Please paste a valid ArXiv link.", type: "error" }
    if (status === 404) return { message: "Paper not found on ArXiv. Check the URL.", type: "error" }
    if (status === 502) return { message: "ArXiv API unavailable. Try again later.", type: "warning" }
    if (status === 503) return { message: "Paper index not ready. Try again in a moment.", type: "warning" }
    return { message: "Something went wrong. Check the URL.", type: "error" }
  }

  async function handleSubmit() {
    if (!url.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await api.post("/recommend", { url })
      setResult(res.data)
    } catch (err) {
      setError(getErrorMessage(err.response?.status))
    }
    setLoading(false)
  }

  const recommendations = result?.recommendations?.filter(
    (p) => !activeCategory || p.category === activeCategory
  )

  const inputPaper = result ? { url, title: result.input_paper.title, abstract: result.input_paper.abstract } : null

  return (
    <div>
      {!result && (
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-8 text-center">
          Paste an ArXiv paper URL to find semantically similar research papers.
        </p>
      )}

      <SearchBar value={url} onChange={setUrl} onSubmit={handleSubmit} loading={loading} />
      <ErrorDisplay error={error} />

      {result && (
        <div className="w-full">
          <div className="border border-gray-100 dark:border-gray-800 rounded-lg p-5 mb-6 bg-gray-50 dark:bg-gray-900 transition-colors">
            <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Input Paper</p>
            <h2 className="text-base font-semibold leading-snug dark:text-gray-100 mb-3">{result.input_paper.title}</h2>
            <div className="flex items-center gap-3">
              <a href={url} target="_blank" className="text-xs text-gray-900 dark:text-gray-300 font-medium hover:underline">
                View on ArXiv →
              </a>
              <button
                onClick={() => toggleSave(inputPaper)}
                className={`text-xs font-medium px-3 py-1 rounded-full border transition-colors ${
                  isSaved(inputPaper)
                    ? "text-green-600 dark:text-green-400 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/30"
                    : "text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500"
                }`}
              >
                {isSaved(inputPaper) ? "✓ Saved" : "+ Save"}
              </button>
            </div>
          </div>

          <FilterPills activeCategory={activeCategory} onCategoryChange={setActiveCategory} />
          <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">Recommended Papers</p>

          {loading ? (
            <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800">
              {[1, 2, 3, 4, 5].map((i) => <SkeletonCard key={i} />)}
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800 transition-all duration-300">
              {recommendations.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 py-5">No recommendations match the selected category.</p>
              ) : (
                recommendations.map((paper, i) => (
                  <PaperCard key={i} paper={paper} isSaved={isSaved(paper)} onToggleSave={toggleSave} />
                ))
              )}
            </div>
          )}

          <SavedPapers papers={savedPapers} onRemove={(paper) => toggleSave(paper)} />
        </div>
      )}
    </div>
  )
}
