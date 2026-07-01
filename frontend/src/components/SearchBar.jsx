import { useState } from "react"

export default function SearchBar({ value, onChange, onSubmit, loading }) {
  const [focused, setFocused] = useState(false)

  function handleKeyDown(e) {
    if (e.key === "Enter") onSubmit()
  }

  return (
    <div className="flex flex-col gap-3 mb-12">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="https://arxiv.org/abs/1706.03762"
        className={`w-full border rounded-lg px-4 py-3 text-sm outline-none transition-colors dark:bg-gray-800 dark:text-white dark:border-gray-700 placeholder:text-gray-400 dark:placeholder:text-gray-500 ${
          focused ? "border-gray-400 dark:border-gray-500" : "border-gray-200 dark:border-gray-700"
        }`}
      />
      <button
        onClick={onSubmit}
        disabled={loading}
        className="w-full bg-gray-900 dark:bg-white dark:text-gray-900 text-white py-3 rounded-lg text-sm font-medium hover:bg-gray-700 dark:hover:bg-gray-200 transition-colors disabled:opacity-40"
      >
        {loading ? "Finding similar papers..." : "Find Similar Papers"}
      </button>
    </div>
  )
}
