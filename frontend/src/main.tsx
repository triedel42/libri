import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './index.css'
import { AuthProvider } from './AuthContext.tsx'
import Layout from './Layout.tsx'
import App from './App.tsx'
import BookDetail from './BookDetail.tsx'
import ISBNDetail from './ISBNDetail.tsx'
import Scan from './Scan.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<App />} />
            <Route path="/book/isbn/:isbn" element={<ISBNDetail />} />
            <Route path="/book/:id" element={<BookDetail />} />
            <Route path="/scan" element={<Scan />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
