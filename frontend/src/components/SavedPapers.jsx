export default function SavedPapers({ papers, onRemove }) {
  if (papers.length === 0) return null

  return (
    <div className="mt-12">
      <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">Saved Papers</p>
      <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800">
        {papers.map((paper, i) => (
          <div key={i} className="py-5">
            <div className="flex justify-between items-start gap-4">
              <h3 className="text-sm font-semibold dark:text-white">{paper.title}</h3>
              <button
                onClick={() => onRemove(paper)}
                className="text-xs text-red-400 hover:text-red-600 shrink-0"
              >
                Remove
              </button>
            </div>
            <a
              href={paper.url}
              target="_blank"
              className="text-xs text-gray-900 dark:text-gray-300 font-medium hover:underline mt-1 inline-block"
            >
              View on ArXiv →
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}
