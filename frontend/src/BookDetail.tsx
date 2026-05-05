import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

interface Book {
  id: number
  title: string
  author: string
  isbn: string | null
  created_at: string
}

export default function BookDetail() {
  const { id } = useParams()
  const [book, setBook] = useState<Book | null>(null)

  useEffect(() => {
    fetch(`/api/book/${id}`)
      .then((r) => r.json())
      .then(setBook)
  }, [id])

  if (!book) return null

  return (
    <main className="max-w-3xl mx-auto px-6 py-10 flex gap-10">
      <div className="w-48 shrink-0">
        {book.isbn ? (
          <img src={`/api/cover/${book.isbn}`} alt={book.title} className="w-full rounded shadow" />
        ) : (
          <div className="w-full aspect-[2/3] bg-gray-200 rounded" />
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
              <td className="py-2 font-medium">{new Date(book.created_at).toLocaleDateString()}</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 pr-4 text-gray-500 w-24">ISBN</td>
              <td className="py-2 font-medium">
                {book.isbn ? (
                  <a href={`https://openlibrary.org/isbn/${book.isbn}`} target="_blank" rel="noreferrer"
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

        <button className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-full">
          Borrow
        </button>
      </div>
    </main>
  )
}
