const CATEGORIES = ["machine learning", "computer vision", "natural language processing"]

export default function FilterPills({ activeCategory, onCategoryChange }) {
  return (
    <div className="flex gap-2 flex-wrap mb-6">
      {CATEGORIES.map((cat) => (
        <button
          key={cat}
          onClick={() => onCategoryChange(activeCategory === cat ? null : cat)}
          className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            activeCategory === cat
              ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white"
              : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500"
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  )
}
