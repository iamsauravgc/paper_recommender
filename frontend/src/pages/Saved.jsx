import { useState } from "react"
import { Link } from "react-router-dom"

export default function Saved() {
  const [savedPapers, setSavedPapers] = useState(() => {
    return JSON.parse(localStorage.getItem("savedPapers") || "[]")
  })

  function removePaper(url) {
    const updated = savedPapers.filter((p) => p.url !== url)
    setSavedPapers(updated)
    localStorage.setItem("savedPapers", JSON.stringify(updated))
  }

  return (
    <div>
      <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-6">Saved Papers</p>

      {savedPapers.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-2">No saved papers yet.</p>
          <Link to="/" className="text-sm text-gray-900 dark:text-gray-300 font-medium hover:underline">
            Find papers to save →
          </Link>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800">
          {savedPapers.map((paper, i) => {
            const paperId = paper.url?.split("/").pop() || ""
            return (
              <div key={i} className="py-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <Link to={`/paper/${paperId}`} className="text-sm font-semibold dark:text-white hover:underline">
                    {paper.title}
                  </Link>
                  {paper.abstract && (
                    <p className="text-gray-500 dark:text-gray-400 text-xs mt-1 line-clamp-2">{paper.abstract}</p>
                  )}
                  {paper.category && (
                    <span className="text-xs text-gray-400 dark:text-gray-500 mt-1 inline-block">{paper.category}</span>
                  )}
                </div>
                <button
                  onClick={() => removePaper(paper.url)}
                  className="text-xs text-red-400 hover:text-red-600 shrink-0"
                >
                  Remove
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
