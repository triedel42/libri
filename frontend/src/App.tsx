import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

interface Book {
  id: number
  title: string
  author: string
  isbn: string | null
}

const PAGE_SIZE = 20
const CACHE_KEY = 'books-cache'

export default function App() {
  const [books, setBooks] = useState<Book[]>(() => {
    try { return JSON.parse(sessionStorage.getItem(CACHE_KEY) ?? '[]') } catch { return [] }
  })
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    fetch(`/api/book?offset=${offset}&limit=${PAGE_SIZE}`)
      .then((r) => r.json())
      .then((data: Book[]) => {
        setBooks(data)
        setHasMore(data.length === PAGE_SIZE)
        if (offset === 0) sessionStorage.setItem(CACHE_KEY, JSON.stringify(data))
      })
  }, [offset])

  return (
    <main className="max-w-5xl mx-auto px-6 py-8">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {books.map((book) => (
          <Link key={book.id} to={`/book/${book.id}`} state={book} className="flex flex-col gap-2 group">
            <div className="aspect-[2/3] bg-gray-200 rounded overflow-hidden">
              {book.isbn && (
                <img
                  src={`/api/cover/${book.isbn}`}
                  alt={book.title}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div>
              <p className="text-sm font-medium leading-snug line-clamp-2 group-hover:underline">
                {book.title}
              </p>
              <p className="text-xs text-gray-500 mt-0.5 group-hover:underline">{book.author}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="flex justify-center gap-3 mt-10">
        <button
          onClick={() => setOffset((o) => o - PAGE_SIZE)}
          disabled={offset === 0}
          className="px-5 py-2 text-sm border rounded-full bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <button
          onClick={() => setOffset((o) => o + PAGE_SIZE)}
          disabled={!hasMore}
          className="px-5 py-2 text-sm border rounded-full bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </main>
  )
}
