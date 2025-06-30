import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import Analytics from './pages/Analytics'
import Settlements from './pages/Settlements'
import Groups from './pages/Groups'
import Footer from './components/Footer'
import Login from './pages/Login'
import Register from './pages/Register'

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token')
  if (!token) {
    return <Navigate to="/login" replace />
  }
  return children
}

// Component to conditionally render Navbar
const AppContent = () => {
  const location = useLocation()
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register'
  const isDashboardPage = location.pathname === '/dashboard'

  return (
    <div className="min-h-screen flex flex-col">
      {!isAuthPage && !isDashboardPage && <Navbar />}
      <main className="flex-grow">
        <Toaster position="top-right" />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/groups"
            element={
              <ProtectedRoute>
                <Groups />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Home />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settlements" element={<Settlements />} />
        </Routes>
      </main>
      {!isAuthPage && !isDashboardPage && <Footer />}
    </div>
  )
}

function App() {
  return (
    <Router>
      <Toaster position="top-right" />
      <AppContent />
    </Router>
  )
}

export default App
