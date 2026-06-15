import { Link, useNavigate } from 'react-router-dom'

export default function Navbar() {
  const navigate = useNavigate()
  const token = localStorage.getItem('token')
  const role = localStorage.getItem('role')

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    navigate('/login')
  }

  return (
    <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
      <Link to="/" className="text-xl font-bold text-blue-600">HireFlow</Link>
      <div className="flex gap-4 items-center">
        {token ? (
          <>
            <Link to="/" className="text-gray-600 hover:text-blue-600">Jobs</Link>
            {role === 'recruiter' && (
              <Link to="/recruiter/dashboard" className="text-gray-600 hover:text-blue-600">Dashboard</Link>
            )}
            {role === 'candidate' && (
              <Link to="/profile" className="text-gray-600 hover:text-blue-600">Profile</Link>
            )}
            <button
              onClick={handleLogout}
              className="bg-red-500 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-red-600"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="text-gray-600 hover:text-blue-600">Login</Link>
            <Link to="/register" className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700">
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  )
}
