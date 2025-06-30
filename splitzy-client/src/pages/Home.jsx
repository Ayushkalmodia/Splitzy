import { Link } from 'react-router-dom'
import { FaChartPie, FaUsers, FaMoneyBillWave, FaLock } from 'react-icons/fa'
import { ArrowRight, CheckCircle2 } from 'lucide-react'

const Home = () => {
  const features = [
    {
      icon: <FaMoneyBillWave className="h-6 w-6" />,
      title: 'Easy Expense Tracking',
      description: 'Split expenses with friends and family, track who owes what, and settle up easily.'
    },
    {
      icon: <FaUsers className="h-6 w-6" />,
      title: 'Group Management',
      description: 'Create groups for different occasions - trips, roommates, or any shared expenses.'
    },
    {
      icon: <FaChartPie className="h-6 w-6" />,
      title: 'Smart Analytics',
      description: 'Get insights into your spending patterns and group expenses with beautiful charts.'
    },
    {
      icon: <FaLock className="h-6 w-6" />,
      title: 'Secure & Private',
      description: 'Your data is encrypted and secure. We never share your information with third parties.'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
              Split Expenses
              <br />
              <span className="text-neutral-900">Without the Hassle</span>
            </h1>
            <p className="mt-6 text-xl text-neutral-600 max-w-3xl mx-auto">
              Splitzy makes it easy to track shared expenses and balances with housemates, trips, groups, friends, and family.
            </p>
            <div className="mt-10 flex justify-center gap-4">
              <Link
                to="/register"
                className="px-8 py-3 rounded-xl text-white bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-all duration-300 transform hover:scale-105"
              >
                Get Started
              </Link>
              <Link
                to="/login"
                className="px-8 py-3 rounded-xl text-teal-600 bg-white border border-teal-100 hover:border-teal-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-all duration-300 transform hover:scale-105"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 bg-white/50 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-neutral-900">
              Everything you need to manage shared expenses
            </h2>
            <p className="mt-4 text-lg text-neutral-600">
              Splitzy helps you track shared expenses and balances with housemates, trips, groups, friends, and family.
            </p>
          </div>

          <div className="mt-20 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 border border-neutral-200 hover:border-teal-100 transition-all duration-300 hover:shadow-lg hover:shadow-teal-100 group"
              >
                <div className="bg-gradient-to-br from-teal-500 to-emerald-600 p-3 rounded-xl w-fit transform group-hover:scale-110 transition-all duration-300">
                  {feature.icon}
                </div>
                <h3 className="mt-4 text-lg font-medium text-neutral-900 group-hover:text-teal-600 transition-colors">
                  {feature.title}
                </h3>
                <p className="mt-2 text-neutral-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-neutral-900">
              How Splitzy Works
            </h2>
            <p className="mt-4 text-lg text-neutral-600">
              Three simple steps to start managing your shared expenses
            </p>
          </div>

          <div className="mt-20 grid grid-cols-1 gap-8 sm:grid-cols-3">
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 border border-neutral-200 hover:border-teal-100 transition-all duration-300 hover:shadow-lg hover:shadow-teal-100 group">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-teal-100 text-teal-600 font-bold text-xl">
                1
              </div>
              <h3 className="mt-4 text-lg font-medium text-neutral-900 group-hover:text-teal-600 transition-colors">
                Create a Group
              </h3>
              <p className="mt-2 text-neutral-600">
                Start by creating a group and adding your friends or family members.
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 border border-neutral-200 hover:border-teal-100 transition-all duration-300 hover:shadow-lg hover:shadow-teal-100 group">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-teal-100 text-teal-600 font-bold text-xl">
                2
              </div>
              <h3 className="mt-4 text-lg font-medium text-neutral-900 group-hover:text-teal-600 transition-colors">
                Add Expenses
              </h3>
              <p className="mt-2 text-neutral-600">
                Add expenses as they occur and split them between group members.
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 border border-neutral-200 hover:border-teal-100 transition-all duration-300 hover:shadow-lg hover:shadow-teal-100 group">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-teal-100 text-teal-600 font-bold text-xl">
                3
              </div>
              <h3 className="mt-4 text-lg font-medium text-neutral-900 group-hover:text-teal-600 transition-colors">
                Settle Up
              </h3>
              <p className="mt-2 text-neutral-600">
                Splitzy calculates who owes what and helps you settle up easily.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-24 bg-gradient-to-br from-teal-500 to-emerald-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white">
            Ready to start splitting expenses?
          </h2>
          <p className="mt-4 text-lg text-teal-50">
            Join thousands of users who trust Splitzy for their shared expenses.
          </p>
          <div className="mt-8">
            <Link
              to="/register"
              className="inline-flex items-center px-8 py-3 rounded-xl text-teal-600 bg-white hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white transition-all duration-300 transform hover:scale-105"
            >
              Get Started for Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white/80 backdrop-blur-lg border-t border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2">
                <div className="bg-gradient-to-br from-teal-500 to-emerald-600 p-2 rounded-lg">
                  <FaChartPie className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
                  Splitzy
                </span>
              </div>
              <p className="mt-4 text-sm text-neutral-600">
                The easiest way to split expenses with friends and family.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-900 uppercase tracking-wider">
                Product
              </h3>
              <ul className="mt-4 space-y-4">
                <li>
                  <Link to="/features" className="text-base text-neutral-600 hover:text-teal-600 transition-colors">
                    Features
                  </Link>
                </li>
                <li>
                  <Link to="/pricing" className="text-base text-neutral-600 hover:text-teal-600 transition-colors">
                    Pricing
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-900 uppercase tracking-wider">
                Company
              </h3>
              <ul className="mt-4 space-y-4">
                <li>
                  <Link to="/about" className="text-base text-neutral-600 hover:text-teal-600 transition-colors">
                    About
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className="text-base text-neutral-600 hover:text-teal-600 transition-colors">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-900 uppercase tracking-wider">
                Legal
              </h3>
              <ul className="mt-4 space-y-4">
                <li>
                  <Link to="/privacy" className="text-base text-neutral-600 hover:text-teal-600 transition-colors">
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link to="/terms" className="text-base text-neutral-600 hover:text-teal-600 transition-colors">
                    Terms
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-neutral-200">
            <p className="text-base text-neutral-600 text-center">
              © 2024 Splitzy. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Home 