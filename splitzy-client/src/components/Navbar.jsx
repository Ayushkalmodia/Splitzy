import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FaChartPie } from 'react-icons/fa'
import { 
  ChevronDown, 
  LogOut, 
  Settings, 
  User,
  Menu,
  X
} from 'lucide-react'
import { authService } from '../services/authService'

const Navbar = () => {
  const navigate = useNavigate()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const user = authService.getCurrentUser()

  const handleLogout = () => {
    authService.logout()
    navigate('/login')
  }

  const navigation = [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Groups', href: '/groups' },
    { name: 'Analytics', href: '/analytics' },
    { name: 'Settlements', href: '/settlements' }
  ]

  return (
    <nav className="backdrop-blur-lg bg-white/70 border-b border-neutral-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 group">
            <div className="bg-gradient-to-br from-teal-500 to-emerald-600 p-2 rounded-lg transform group-hover:scale-110 transition-all duration-300">
              <FaChartPie className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
              Splitzy
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`${
                  location.pathname === item.href
                    ? 'border-teal-500 text-neutral-900'
                    : 'border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-700'
                } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* User Menu */}
          <div className="hidden md:block">
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-3 focus:outline-none group"
              >
                <div className="text-right">
                  <p className="text-sm font-medium text-neutral-800 group-hover:text-teal-600 transition-colors">
                    {user?.name}
                  </p>
                  <p className="text-xs text-neutral-500">View Profile</p>
                </div>
                <div className="relative">
                  <img
                    src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}`}
                    alt="User Avatar"
                    className="h-9 w-9 rounded-full ring-2 ring-neutral-100 group-hover:ring-teal-100 transition-all"
                  />
                  <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-amber-500 rounded-full border-2 border-white"></div>
                </div>
                <ChevronDown className={`h-4 w-4 text-neutral-400 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white/80 backdrop-blur-lg rounded-xl shadow-lg py-1 z-10 border border-neutral-200 transform origin-top-right transition-all duration-200">
                  <Link
                    to="/profile"
                    className="flex items-center w-full px-4 py-2.5 text-sm text-neutral-700 hover:bg-teal-50 transition-colors"
                  >
                    <User className="h-4 w-4 mr-2 text-teal-600" />
                    Profile
                  </Link>
                  <Link
                    to="/settings"
                    className="flex items-center w-full px-4 py-2.5 text-sm text-neutral-700 hover:bg-teal-50 transition-colors"
                  >
                    <Settings className="h-4 w-4 mr-2 text-teal-600" />
                    Settings
                  </Link>
                  <div className="border-t border-neutral-200 my-1"></div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="text-neutral-600 hover:text-teal-600 transition-colors"
            >
              {showMobileMenu ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {showMobileMenu && (
        <div className="md:hidden bg-white/80 backdrop-blur-lg border-b border-neutral-200">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className="block px-3 py-2 rounded-md text-base font-medium text-neutral-600 hover:text-teal-600 hover:bg-teal-50 transition-colors"
                onClick={() => setShowMobileMenu(false)}
              >
                {item.name}
              </Link>
            ))}
            <div className="border-t border-neutral-200 my-1"></div>
            <Link
              to="/profile"
              className="block px-3 py-2 rounded-md text-base font-medium text-neutral-600 hover:text-teal-600 hover:bg-teal-50 transition-colors"
              onClick={() => setShowMobileMenu(false)}
            >
              Profile
            </Link>
            <Link
              to="/settings"
              className="block px-3 py-2 rounded-md text-base font-medium text-neutral-600 hover:text-teal-600 hover:bg-teal-50 transition-colors"
              onClick={() => setShowMobileMenu(false)}
            >
              Settings
            </Link>
            <button
              onClick={() => {
                handleLogout()
                setShowMobileMenu(false)
              }}
              className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}

export default Navbar 