import { useState, useEffect } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

export default function Jobs() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(null)
  const [file, setFile] = useState(null)
  const [success, setSuccess] = useState(null)
  const navigate = useNavigate()
  const token = localStorage.getItem('token')
  const role = localStorage.getItem('role')

  useEffect(() => {
    axios.get('http://127.0.0.1:8000/jobs/')
      .then(res => setJobs(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  const handleApply = async (jobId) => {
    if (!token) { navigate('/login'); return }
    if (!file) { alert('Please select a PDF resume'); return }

    const formData = new FormData()
    formData.append('file', file)

    try {
      await axios.post(
        `http://127.0.0.1:8000/jobs/${jobId}/apply`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setSuccess(jobId)
      setApplying(null)
      setFile(null)
    } catch (err) {
      alert(err.response?.data?.detail || 'Application failed')
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Available Jobs</h1>

      {loading && <p className="text-gray-500">Loading jobs...</p>}

      <div className="space-y-4">
        {jobs.map(job => (
          <div key={job.id} className="bg-white rounded-xl shadow-sm p-6 border hover:border-blue-300 transition">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-800">{job.title}</h2>
                <p className="text-blue-600 font-medium text-sm mt-1">{job.company}</p>
                <p className="text-gray-500 text-sm mt-2">{job.description}</p>
              </div>
              <div className="ml-4">
                {success === job.id ? (
                  <span className="bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm font-medium">
                    ✓ Applied
                  </span>
                ) : (
                  <button
                    onClick={() => setApplying(applying === job.id ? null : job.id)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
                  >
                    Apply
                  </button>
                )}
              </div>
            </div>

            {applying === job.id && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-2">Upload your resume (PDF)</p>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setFile(e.target.files[0])}
                  className="w-full text-sm text-gray-500 mb-3"
                />
                <button
                  onClick={() => handleApply(job.id)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700"
                >
                  Submit Application
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
