import { useState } from "react"
import axios from "axios"

import Header from "./components/Header.jsx"
import SearchBar from "./components/SearchBar.jsx"
import ErrorDisplay from "./components/ErrorDisplay.jsx"
import FilterPills from "./components/FilterPills.jsx"
import PaperCard from "./components/PaperCard.jsx"
import SkeletonCard from "./components/SkeletonCard.jsx"
import SavedPapers from "./components/SavedPapers.jsx"

export default function App() {
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [savedPapers, setSavedPapers] = useState(() => {
    return JSON.parse(localStorage.getItem("savedPapers") || "[]")
  })
  const [activeCategory, setActiveCategory] = useState(null)
  const [darkMode, setDarkMode] = useState(() => {
    return document.documentElement.classList.contains("dark")
  })

  function toggleDark() {
    const next = !darkMode
    setDarkMode(next)
    document.documentElement.classList.toggle("dark", next)
    localStorage.setItem("darkMode", next)
  }

  function toggleSave(paper) {
    const exists = savedPapers.find((p) => p.url === paper.url)
    const updated = exists
      ? savedPapers.filter((p) => p.url !== paper.url)
      : [...savedPapers, paper]
    setSavedPapers(updated)
    localStorage.setItem("savedPapers", JSON.stringify(updated))
  }

  function isSaved(paper) {
    return savedPapers.some((p) => p.url === paper.url)
  }

  function getErrorMessage(status) {
    if (status === 400) return { message: "Invalid URL. Please paste a valid ArXiv link (e.g. https://arxiv.org/abs/1706.03762).", type: "error" }
    if (status === 404) return { message: "Paper not found on ArXiv. Check the URL and try again.", type: "error" }
    if (status === 502) return { message: "ArXiv API is temporarily unavailable. Try again later.", type: "warning" }
    return { message: "Something went wrong. Check the URL and try again.", type: "error" }
  }

  async function handleSubmit() {
    if (!url.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"
      const res = await axios.post(`${API_URL}/recommend`, { url })
      setResult(res.data)
    } catch (err) {
      const status = err.response?.status
      setError(getErrorMessage(status))
    }
    setLoading(false)
  }

  const recommendations = result?.recommendations?.filter(
    (paper) => !activeCategory || paper.category === activeCategory
  )

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 px-6 py-16 max-w-2xl mx-auto transition-colors">
      <Header darkMode={darkMode} onToggleDark={toggleDark} />

      <SearchBar value={url} onChange={setUrl} onSubmit={handleSubmit} loading={loading} />

      <ErrorDisplay error={error} />

      {result && (
        <div className="w-full">
          <div className="border border-gray-100 dark:border-gray-800 rounded-lg p-5 mb-6 bg-gray-50 dark:bg-gray-900 transition-colors">
            <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">
              Input Paper
            </p>
            <h2 className="text-base font-semibold leading-snug dark:text-gray-100">
              {result.input_paper.title}
            </h2>
          </div>

          <FilterPills activeCategory={activeCategory} onCategoryChange={setActiveCategory} />

          <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">
            Recommended Papers
          </p>

          {result.input_paper.error && (
            <ErrorDisplay error={{ message: `Could not embed the input paper: ${result.input_paper.error}`, type: "warning" }} />
          )}

          {loading ? (
            <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800">
              {[1, 2, 3, 4, 5].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800 transition-all duration-300">
              {recommendations.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 py-5">
                  No recommendations match the selected category.
                </p>
              ) : (
                recommendations.map((paper, i) => (
                  <PaperCard
                    key={i}
                    paper={paper}
                    isSaved={isSaved(paper)}
                    onToggleSave={toggleSave}
                  />
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
