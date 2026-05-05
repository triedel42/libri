import { useEffect, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { useAuth } from './useAuth'

interface BookEvent {
  id: number
  user_login: string
  event_type: string
  note: string | null
  created_at: string
}

interface Book {
  id: number
  title: string
  author: string
  isbn: string | null
  added_by: string | null
  owner: string | null
  borrowed_by: string | null
  removed: boolean
  source_url: string | null
  events: BookEvent[]
}

interface BookEvent {
  id: number
  user_login: string
  event_type: string
  note: string | null
  created_at: string
}

export default function BookDetail() {
  const { id } = useParams()
  const { state } = useLocation()

  const { user } = useAuth()
  const [book, setBook] = useState<Book | null>(state ?? null)
  const [comment, setComment] = useState('')

  useEffect(() => {
    fetch(`/api/book/${id}`).then((r) => r.json()).then(setBook)
  }, [id])

  async function refreshBook() {
    const r = await fetch(`/api/book/${id}`)
    if (r.ok) setBook(await r.json())
  }

  async function handleBorrow() {
    const r = await fetch(`/api/book/${id}/borrow`, { method: 'POST' })
    if (r.ok) setBook(await r.json())
  }

  async function handleReturn() {
    const r = await fetch(`/api/book/${id}/return`, { method: 'POST' })
    if (r.ok) setBook(await r.json())
  }

  async function handleComment(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!comment.trim()) return
    const r = await fetch(`/api/book/${id}/comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note: comment.trim() }),
    })
    if (r.ok) { setComment(''); refreshBook() }
  }

  async function handleDelete() {
    await fetch(`/api/book/${id}`, { method: 'DELETE' })
    refreshBook()
  }

  async function handleRestore() {
    const r = await fetch(`/api/book/${id}/restore`, { method: 'POST' })
    if (r.ok) setBook(await r.json())
  }

  if (!book) return null

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex flex-col sm:flex-row gap-8 mb-8">
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
            <tr className="border-b">
              <td className="py-2 pr-4 text-gray-500 w-24">Links</td>
              <td className="py-2 font-medium">
                <a href={`https://www.goodreads.com/search?q=${book.isbn}`} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1.5 hover:underline">
                  <img src="https://www.google.com/s2/favicons?domain=goodreads.com&sz=32" alt="" className="w-4 h-4" />
                  Goodreads
                </a>
              </td>
            </tr>
            <tr>
              <td className="py-2 pr-4 text-gray-500 w-24">Status</td>
              <td className="py-2 font-medium">
                {book.borrowed_by
                  ? <span>Borrowed by <a href={`https://profile.intra.42.fr/users/${book.borrowed_by}`} target="_blank" rel="noreferrer" className="underline hover:text-gray-500">{book.borrowed_by}</a></span>
                  : 'Available'}
              </td>
            </tr>
          </tbody>
        </table>

        <div className="flex gap-3 items-center">
          {!book.borrowed_by && (
            <button onClick={handleBorrow} className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-full cursor-pointer">
              Borrow
            </button>
          )}
          {book.borrowed_by === user?.login && (
            <button onClick={handleReturn} className="px-6 py-2 bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-medium rounded-full cursor-pointer">
              Return
            </button>
          )}
          {book.borrowed_by && book.borrowed_by !== user?.login && (
            <span className="text-sm text-gray-500">Borrowed by <a href={`https://profile.intra.42.fr/users/${book.borrowed_by}`} target="_blank" rel="noreferrer" className="underline hover:text-gray-700">{book.borrowed_by}</a></span>
          )}
          {user?.login === book.added_by && !book.removed && (
            <button onClick={handleDelete} className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-full cursor-pointer">
              Remove
            </button>
          )}
          {user?.login === book.added_by && book.removed && (
            <button onClick={handleRestore} className="px-6 py-2 bg-gray-900 hover:bg-gray-700 text-white text-sm font-medium rounded-full cursor-pointer">
              Add
            </button>
          )}
        </div>
      </div>
      </div>
      <section className="mb-6">
        <ul className="space-y-2">
          {book.events.map((e) => (
            <li key={e.id} className="text-sm flex gap-2">
              <span className="text-gray-400 shrink-0">{new Date(e.created_at).toLocaleDateString()}</span>
              <span>
                <a href={`https://profile.intra.42.fr/users/${e.user_login}`} target="_blank" rel="noreferrer" className="font-medium underline hover:text-gray-500">{e.user_login}</a>
                {e.event_type === 'added' && ' added this book'}
                {e.event_type === 'removed' && ' removed this book'}
                {e.event_type === 'borrow' && ' borrowed this book'}
                {e.event_type === 'return' && ' returned this book'}
                {e.event_type === 'comment' && <span className="text-gray-600"> commented: "{e.note}"</span>}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <form onSubmit={handleComment} className="max-w-3xl mx-auto px-6 pb-10 flex gap-2">
        <input
          type="text"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Leave a comment…"
          className="flex-1 border rounded-full px-4 py-2 text-sm outline-none focus:border-gray-400"
        />
        <button type="submit" className="px-5 py-2 bg-gray-900 hover:bg-gray-700 text-white text-sm font-medium rounded-full cursor-pointer">
          Post
        </button>
      </form>
    </main>
  )
}
