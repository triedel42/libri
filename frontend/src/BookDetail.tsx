import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from './useAuth'

interface Book {
  id: number
  title: string
  author: string
  isbn: string | null
  added_by: string | null
  source_url: string | null
  created_at: string
}

export default function BookDetail() {
  const { id } = useParams()
  const { state } = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [book, setBook] = useState<Book | null>(state ?? null)

  useEffect(() => {
    fetch(`/api/book/${id}`)
      .then((r) => r.json())
      .then(setBook)
  }, [id])

  async function handleDelete() {
    await fetch(`/api/book/${id}`, { method: 'DELETE' })
    navigate('/')
  }

  if (!book) return null

  return (
    <main className="max-w-3xl mx-auto px-6 py-10 flex flex-col sm:flex-row gap-8">
      <div className="w-36 sm:w-48 shrink-0 aspect-[2/3] bg-gray-100 rounded overflow-hidden">
        {book.isbn && (
          <img src={`/api/cover/${book.isbn}`} alt={book.title} className="w-full h-full object-contain" />
        )}
      </div>

      <div className="flex-1">
        <table className="w-full text-sm mb-8">
          <tbody>
            <tr className="border-b">
              <td className="py-2 pr-4 text-gray-500 w-24">Title</td>
              <td className="py-2 font-medium">{book.title}</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 pr-4 text-gray-500 w-24">Author</td>
              <td className="py-2 font-medium">{book.author}</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 pr-4 text-gray-500 w-24">Added</td>
              <td className="py-2 font-medium">
                {new Date(book.created_at).toLocaleDateString()}
                {book.added_by && <span> by <a href={`https://profile.intra.42.fr/users/${book.added_by}`} target="_blank" rel="noreferrer" className="underline hover:text-gray-500">{book.added_by}</a></span>}
              </td>
            </tr>
            <tr className="border-b">
              <td className="py-2 pr-4 text-gray-500 w-24">ISBN</td>
              <td className="py-2 font-medium">
                {book.isbn ? (
                  <a href={book.source_url ?? `https://openlibrary.org/isbn/${book.isbn}`} target="_blank" rel="noreferrer"
                    className="underline hover:text-gray-600">
                    {book.isbn}
                  </a>
                ) : '—'}
              </td>
            </tr>
            <tr>
              <td className="py-2 pr-4 text-gray-500 w-24">Links</td>
              <td className="py-2 font-medium">
                <a href={`https://www.goodreads.com/search?q=${book.isbn}`} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1.5 hover:underline">
                  <img src="https://www.google.com/s2/favicons?domain=goodreads.com&sz=32" alt="" className="w-4 h-4" />
                  Goodreads
                </a>
              </td>
            </tr>
          </tbody>
        </table>

        <div className="flex gap-3">
          <button className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-full">
            Borrow
          </button>
          {user?.login === book.added_by && (
            <button onClick={handleDelete} className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-full cursor-pointer">
              Remove
            </button>
          )}
        </div>
      </div>
    </main>
  )
}
