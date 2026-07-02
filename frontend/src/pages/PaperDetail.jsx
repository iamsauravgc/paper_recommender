import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import api from "../api.js"

export default function PaperDetail() {
  const { id } = useParams()
  const [paper, setPaper] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [bibtex, setBibtex] = useState("")
  const [showBibtex, setShowBibtex] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get(`/papers/${encodeURIComponent(id)}`)
        setPaper(res.data)
      } catch {
        setError("Paper not found.")
      }
      setLoading(false)
    }
    load()
  }, [id])

  async function loadBibtex() {
    if (bibtex) { setShowBibtex(!showBibtex); return }
    try {
      const res = await api.get(`/papers/${encodeURIComponent(id)}/bibtex`)
      setBibtex(res.data)
      setShowBibtex(true)
    } catch {
      setBibtex("Failed to load BibTeX.")
    }
  }

  if (loading) return <p className="text-gray-400 dark:text-gray-500 text-sm">Loading...</p>
  if (error) return <p className="text-red-500 text-sm">{error}</p>
  if (!paper) return null

  return (
    <div>
      <h1 className="text-xl font-bold leading-snug mb-3 dark:text-white">{paper.title}</h1>

      {paper.authors?.length > 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {paper.authors.join(", ")}
        </p>
      )}

      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{paper.category}</p>
      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-6">{paper.abstract}</p>

      <div className="flex gap-3">
        <a
          href={paper.url}
          target="_blank"
          className="text-xs bg-gray-900 dark:bg-white dark:text-gray-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-700 dark:hover:bg-gray-200 transition-colors"
        >
          View on ArXiv →
        </a>
        <button
          onClick={loadBibtex}
          className="text-xs border border-gray-200 dark:border-gray-700 px-4 py-2 rounded-lg font-medium text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
        >
          {showBibtex ? "Hide BibTeX" : "BibTeX"}
        </button>
      </div>

      {showBibtex && (
        <pre className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg text-xs text-gray-700 dark:text-gray-300 overflow-x-auto border border-gray-200 dark:border-gray-800 whitespace-pre-wrap">
          {bibtex}
        </pre>
      )}
    </div>
  )
}
