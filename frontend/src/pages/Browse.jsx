import { useState } from "react"
import { Link } from "react-router-dom"
import api from "../api.js"

const PER_PAGE = 50

export default function Browse() {
  const [query, setQuery] = useState("")
  const [papers, setPapers] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  async function handleSearch(p = 1) {
    if (!query.trim()) return
    setLoading(true)
    setSearched(true)
    try {
      const res = await api.get("/papers/search", { params: { q: query, page: p } })
      setPapers(res.data.papers)
      setTotal(res.data.total)
      setPage(p)
    } catch {
      setPapers([])
      setTotal(0)
    }
    setLoading(false)
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") handleSearch()
  }

  const totalPages = Math.ceil(total / PER_PAGE)

  return (
    <div>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
        Search through all papers in the database semantically. Results are ranked by relevance.
      </p>

      <div className="flex gap-2 mb-8">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search papers..."
          className="flex-1 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 text-sm outline-none focus:border-gray-400 dark:focus:border-gray-500 transition-colors dark:bg-gray-800 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
        />
        <button
          onClick={() => handleSearch()}
          disabled={loading}
          className="bg-gray-900 dark:bg-white dark:text-gray-900 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-gray-700 dark:hover:bg-gray-200 transition-colors disabled:opacity-40"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {total > 0 && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
          {total} result{total !== 1 ? "s" : ""} — page {page} of {totalPages}
        </p>
      )}

      {searched && papers.length === 0 && !loading && (
        <p className="text-gray-400 dark:text-gray-500 text-sm">No papers found.</p>
      )}

      <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800">
        {papers.map((paper, i) => {
          const paperId = paper.url?.split("/").pop() || paper.id
          const scorePct = paper.score != null ? Math.round(paper.score * 100) : null
          return (
            <div key={i} className="py-4">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <Link to={`/paper/${paperId}`} className="text-sm font-semibold leading-snug dark:text-white hover:underline">
                    {paper.title}
                  </Link>
                  <p className="text-gray-500 dark:text-gray-400 text-xs mt-1 line-clamp-2">{paper.abstract}</p>
                  <span className="text-xs text-gray-400 dark:text-gray-500 mt-1 inline-block">{paper.category}</span>
                </div>
                {scorePct != null && (
                  <div className="shrink-0 flex flex-col items-center gap-0.5 mt-0.5">
                    <div className="w-10 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gray-500 dark:bg-gray-400 rounded-full transition-all"
                        style={{ width: `${Math.min(scorePct, 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums">{scorePct}%</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-8 pb-8">
          <button
            onClick={() => handleSearch(page - 1)}
            disabled={page <= 1 || loading}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            &larr; Previous
          </button>
          <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => handleSearch(page + 1)}
            disabled={page >= totalPages || loading}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            Next &rarr;
          </button>
        </div>
      )}
    </div>
  )
}