import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Barcode from 'react-barcode'

interface ISBNMeta {
  isbn: string
  title: string
  author: string
}

export default function ISBNDetail() {
  const { isbn } = useParams<{ isbn: string }>()
  const navigate = useNavigate()
  const [meta, setMeta] = useState<ISBNMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [notInCatalog, setNotInCatalog] = useState(false)
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState(false)

  useEffect(() => {
    fetch(`/api/isbn/${isbn}`)
      .then((r) => {
        if (r.ok) return r.json()
        setNotInCatalog(true)
        return null
      })
      .then((data) => { if (data) setMeta(data) })
      .finally(() => setLoading(false))
  }, [isbn])

  async function handleAdd() {
    setAdding(true)
    setAddError(false)
    const r = await fetch('/api/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isbn }),
    })
    if (r.ok) {
      navigate('/scan')
    } else {
      setAddError(true)
      setAdding(false)
    }
  }

  return (
    <main className="max-w-lg mx-auto px-6 py-12 flex flex-col items-center">
      <div className="mb-6">
        <Barcode value={isbn!} format="EAN13" width={1.5} height={60} fontSize={13} />
      </div>

      <div className="bg-white rounded-xl p-4 mb-6 h-28 flex items-center w-full">
        {loading && (
          <div className="flex justify-center w-full">
            <svg className="w-6 h-6 animate-spin text-gray-400" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          </div>
        )}
        {meta && (
          <div className="flex items-center gap-4 text-left w-full">
            <div className="w-14 shrink-0 aspect-[2/3] bg-gray-100 rounded overflow-hidden">
              <img
                src={`/api/cover/${isbn}`}
                alt={meta.title}
                className="w-full h-full object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            </div>
            <div>
              <p className="text-base font-semibold leading-snug">{meta.title}</p>
              {meta.author && <p className="text-sm text-gray-500 mt-0.5">{meta.author}</p>}
            </div>
          </div>
        )}
        {notInCatalog && (
          <p className="text-sm text-gray-500 w-full text-center">Not found in any catalog</p>
        )}
      </div>

      {addError && (
        <p className="text-sm text-red-500 mb-4">Could not add book — ISBN not found in catalog</p>
      )}

      <div className="flex flex-col items-center gap-3">
        {!notInCatalog && (
          <button
            onClick={handleAdd}
            disabled={adding || !meta}
            className="px-6 py-2 bg-gray-900 hover:bg-gray-700 disabled:opacity-50 text-white text-sm font-medium rounded-full cursor-pointer"
          >
            {adding ? 'Adding…' : 'Add'}
          </button>
        )}
        <button
          onClick={() => navigate('/scan')}
          className="px-6 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-full cursor-pointer"
        >
          Abort
        </button>
      </div>
    </main>
  )
}
