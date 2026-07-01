export default function PaperCard({ paper, isSaved, onToggleSave }) {
  return (
    <div className="py-5 transition-opacity duration-300">
      <div className="flex justify-between items-start gap-4 mb-2">
        <h3 className="text-sm font-semibold leading-snug dark:text-white">{paper.title}</h3>
        <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0 mt-0.5">
          {(paper.score * 100).toFixed(0)}% match
        </span>
      </div>
      <p className="text-gray-500 dark:text-gray-400 text-sm line-clamp-3 mb-3">{paper.abstract}</p>
      <div className="flex items-center gap-3">
        <a
          href={paper.url}
          target="_blank"
          className="text-xs text-gray-900 dark:text-gray-300 font-medium hover:underline"
        >
          View on ArXiv →
        </a>
        <button
          onClick={() => onToggleSave(paper)}
          className={`text-xs font-medium px-3 py-1 rounded-full border transition-colors ${
            isSaved
              ? "text-green-600 dark:text-green-400 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/30"
              : "text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500"
          }`}
        >
          {isSaved ? "✓ Saved" : "+ Save"}
        </button>
      </div>
    </div>
  )
}
