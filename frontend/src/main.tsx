import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './index.css'
import Layout from './Layout.tsx'
import App from './App.tsx'
import BookDetail from './BookDetail.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<App />} />
          <Route path="/book/:id" element={<BookDetail />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
