import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { DecodeHintType, BarcodeFormat } from '@zxing/library'

const HINTS = new Map<DecodeHintType, unknown>([
  [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8]],
  [DecodeHintType.TRY_HARDER, true],
])

const CONSTRAINTS: MediaStreamConstraints = {
  video: {
    facingMode: 'environment',
    width: { ideal: 1920 },
    height: { ideal: 1080 },
  },
}

export default function Scan() {
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [torch, setTorch] = useState(false)
  const [torchSupported, setTorchSupported] = useState(false)

  useEffect(() => {
    if (!videoRef.current) return
    const reader = new BrowserMultiFormatReader(HINTS)
    let handled = false
    let stopFn: (() => void) | null = null

    reader.decodeFromConstraints(CONSTRAINTS, videoRef.current, async (result) => {
      if (!result || handled) return
      handled = true
      stopFn?.()
      const isbn = result.getText()
      const r = await fetch(`/api/book/by-isbn/${isbn}`)
      if (r.ok) {
        const book = await r.json()
        navigate(`/book/${book.id}`, { state: book })
      } else {
        navigate(`/book/isbn/${isbn}`)
      }
    }).then((c) => {
      stopFn = () => c.stop()
      setTimeout(() => {
        const track = (videoRef.current?.srcObject as MediaStream | null)?.getVideoTracks()[0]
        setTorchSupported(!!track && 'torch' in (track.getCapabilities?.() ?? {}))
      }, 500)
    })

    return () => {
      handled = true
      stopFn?.()
      const video = videoRef.current
      if (video?.srcObject) {
        ;(video.srcObject as MediaStream).getTracks().forEach((t) => t.stop())
        video.srcObject = null
      }
    }
  }, [navigate])

  async function toggleTorch() {
    const track = (videoRef.current?.srcObject as MediaStream | null)?.getVideoTracks()[0]
    if (!track) return
    const next = !torch
    try {
      await track.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] })
      setTorch(next)
    } catch { /* torch not supported on this device */ }
  }

  return (
    <div className="flex-1 relative bg-black overflow-hidden border-t border-gray-200">
      <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
        <div className="relative w-4/5 h-24" style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)' }}>
          <span className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white" />
          <span className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white" />
          <span className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white" />
          <span className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white" />
        </div>
        <p className="text-sm text-white/80">Scan ISBN code</p>
      </div>
      <button
        onClick={toggleTorch}
        className={`absolute bottom-6 right-6 p-2 rounded-full transition-colors ${torchSupported ? `cursor-pointer ${torch ? 'bg-yellow-400 text-gray-900' : 'bg-black/50 text-white'}` : 'bg-black/20 text-white/30 cursor-not-allowed'}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path d="M11 21l1-8H6l7-12h1l-1 8h6L12 21h-1z" />
        </svg>
      </button>
    </div>
  )
}
