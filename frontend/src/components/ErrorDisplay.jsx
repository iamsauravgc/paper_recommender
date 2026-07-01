export default function ErrorDisplay({ error }) {
  if (!error) return null

  const colors = {
    red: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400",
    yellow: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-600 dark:text-yellow-400",
  }

  const style = error.type === "warning" ? colors.yellow : colors.red

  return (
    <div className={`${style} border rounded-lg px-4 py-3 text-sm mb-6`}>
      {error.message}
    </div>
  )
}
