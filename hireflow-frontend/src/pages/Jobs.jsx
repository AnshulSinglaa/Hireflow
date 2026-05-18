import { useState, useEffect } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

export default function Jobs() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    axios.get('http://127.0.0.1:8000/jobs/')
      .then(res => setJobs(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Available Jobs</h1>

      {loading && <p className="text-gray-500">Loading jobs...</p>}

      <div className="space-y-4">
        {jobs.map(job => (
          <div key={job.id} className="bg-white rounded-xl shadow-sm p-6 border hover:border-blue-300 transition">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">{job.title}</h2>
                <p className="text-blue-600 font-medium text-sm mt-1">{job.company}</p>
                <p className="text-gray-500 text-sm mt-2 line-clamp-2">{job.description}</p>
              </div>
              <button
                onClick={() => navigate(`/jobs/${job.id}/apply`)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 ml-4 shrink-0"
              >
                Apply
              </button>
            </div>
          </div>
        ))}

        {!loading && jobs.length === 0 && (
          <p className="text-gray-500 text-center py-10">No jobs posted yet.</p>
        )}
      </div>
    </div>
  )
}
