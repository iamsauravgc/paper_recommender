import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import api from "../api.js"

export default function Saved() {
  const [data, setData] = useState({ bookmarks: [], collections: [] })
  const [loading, setLoading] = useState(true)
  const [showNewCol, setShowNewCol] = useState(false)
  const [newColName, setNewColName] = useState("")
  const [newColDesc, setNewColDesc] = useState("")

  useEffect(() => {
    api.get("/bookmarks").then((bRes) => {
      api.get("/collections").then((cRes) => {
        setData({ bookmarks: bRes.data.bookmarks, collections: cRes.data.collections })
        setLoading(false)
      }, () => setLoading(false))
    }, () => setLoading(false))
  }, [])

  async function removeBookmark(url) {
    await api.delete(`/bookmarks/${encodeURIComponent(url)}`)
    setData((prev) => ({ ...prev, bookmarks: prev.bookmarks.filter((b) => b.url !== url) }))
  }

  async function createCollection() {
    if (!newColName.trim()) return
    const res = await api.post("/collections", { name: newColName, description: newColDesc })
    setNewColName("")
    setNewColDesc("")
    setShowNewCol(false)
    setData((prev) => ({
      ...prev,
      collections: [...prev.collections, { id: res.data.id, name: newColName, description: newColDesc, paper_count: 0 }],
    }))
  }

  async function deleteCollection(id) {
    await api.delete(`/collections/${id}`)
    setData((prev) => ({ ...prev, collections: prev.collections.filter((c) => c.id !== id) }))
  }

  if (loading) return <p className="text-gray-400 dark:text-gray-500 text-sm">Loading...</p>

  const { bookmarks, collections } = data

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-widest">Bookmarks</p>
        <button
          onClick={() => setShowNewCol(true)}
          className="text-xs text-gray-900 dark:text-gray-300 font-medium border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-lg hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
        >
          + New Collection
        </button>
      </div>

      {bookmarks.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-8">No bookmarks yet.</p>
      ) : (
        <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800 mb-10">
          {bookmarks.map((b, i) => {
            const paperId = b.url?.split("/").pop() || ""
            return (
              <div key={i} className="py-4 flex items-start justify-between gap-4">
                <div>
                  <Link to={`/paper/${paperId}`} className="text-sm font-semibold dark:text-white hover:underline">
                    {b.title}
                  </Link>
                  <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">{b.category}</span>
                </div>
                <button onClick={() => removeBookmark(b.url)} className="text-xs text-red-400 hover:text-red-600 shrink-0">
                  Remove
                </button>
              </div>
            )
          })}
        </div>
      )}

      <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">Collections</p>

      {collections.length === 0 && !showNewCol && (
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">No collections yet.</p>
      )}

      <div className="flex flex-col gap-3 mb-6">
        {collections.map((c) => (
          <div key={c.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold dark:text-white">{c.name}</p>
              {c.description && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{c.description}</p>}
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{c.paper_count} papers</p>
            </div>
            <button onClick={() => deleteCollection(c.id)} className="text-xs text-red-400 hover:text-red-600 shrink-0">
              Delete
            </button>
          </div>
        ))}
      </div>

      {showNewCol && (
        <div className="flex flex-col gap-2 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <input
            type="text"
            value={newColName}
            onChange={(e) => setNewColName(e.target.value)}
            placeholder="Collection name"
            className="border border-gray-200 dark:border-gray-700 rounded px-3 py-2 text-sm dark:bg-gray-800 dark:text-white outline-none focus:border-gray-400 dark:focus:border-gray-500"
          />
          <input
            type="text"
            value={newColDesc}
            onChange={(e) => setNewColDesc(e.target.value)}
            placeholder="Description (optional)"
            className="border border-gray-200 dark:border-gray-700 rounded px-3 py-2 text-sm dark:bg-gray-800 dark:text-white outline-none focus:border-gray-400 dark:focus:border-gray-500"
          />
          <div className="flex gap-2">
            <button onClick={createCollection} className="bg-gray-900 dark:bg-white dark:text-gray-900 text-white px-4 py-2 rounded-lg text-xs font-medium hover:bg-gray-700 dark:hover:bg-gray-200 transition-colors">
              Create
            </button>
            <button onClick={() => setShowNewCol(false)} className="text-xs text-gray-500 dark:text-gray-400 px-4 py-2">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
