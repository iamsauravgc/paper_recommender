import { BrowserRouter, Routes, Route } from "react-router-dom"
import { AuthProvider } from "./AuthProvider.jsx"
import Header from "./components/Header.jsx"
import ProtectedRoute from "./ProtectedRoute.jsx"
import Home from "./pages/Home.jsx"
import Browse from "./pages/Browse.jsx"
import PaperDetail from "./pages/PaperDetail.jsx"
import Saved from "./pages/Saved.jsx"

function Layout({ children }) {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 px-6 py-10 max-w-2xl mx-auto transition-colors">
      <Header />
      {children}
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/browse" element={<Browse />} />
            <Route path="/paper/:id" element={<PaperDetail />} />
            <Route path="/saved" element={<ProtectedRoute><Saved /></ProtectedRoute>} />
          </Routes>
        </Layout>
      </AuthProvider>
    </BrowserRouter>
  )
}
