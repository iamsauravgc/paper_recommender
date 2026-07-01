export default function SkeletonCard() {
  return (
    <div className="py-5 animate-pulse">
      <div className="flex justify-between items-start gap-4 mb-2">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16 shrink-0 mt-1" />
      </div>
      <div className="space-y-2 mb-3">
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-4/6" />
      </div>
      <div className="flex gap-3">
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24" />
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded-full w-16" />
      </div>
    </div>
  )
}
