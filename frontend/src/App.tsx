import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

interface Book {
  id: number
  title: string
  author: string
  isbn: string | null
  borrowed_by: string | null
}

const CACHE_KEY = 'books-cache'

export default function App() {
  const [books, setBooks] = useState<Book[]>(() => {
    try {
      const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) ?? '[]')
      return Array.isArray(cached) ? cached : []
    } catch { return [] }
  })
  const [query, setQuery] = useState('')

  useEffect(() => {
    fetch('/api/book?limit=1000')
      .then((r) => r.json())
      .then((data: Book[]) => {
        if (Array.isArray(data)) {
          setBooks(data)
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(data))
        }
      })
  }, [])

  const filtered = query
    ? books.filter((b) =>
        b.title.toLowerCase().includes(query.toLowerCase()) ||
        b.author.toLowerCase().includes(query.toLowerCase())
      )
    : books

  return (
    <main className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex justify-center mb-8">
        <div className="flex items-center w-full max-w-md border rounded-full px-4 py-2 bg-white">
          <input
            type="text"
            placeholder="Search by title or author…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 outline-none text-sm bg-transparent"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {filtered.map((book) => (
          <Link key={book.id} to={`/book/${book.id}`} state={book} className="flex flex-col gap-2 group">
            <div className="relative aspect-[2/3] bg-gray-200 rounded overflow-hidden">
              {book.isbn && (
                <img
                  src={`/api/cover/${book.isbn}`}
                  alt={book.title}
                  className={`w-full h-full object-contain ${book.borrowed_by ? 'opacity-40' : ''}`}
                />
              )}
              {book.borrowed_by && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-medium text-gray-700 text-center px-2 leading-snug">{book.borrowed_by}</span>
                </div>
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
    </main>
  )
}
