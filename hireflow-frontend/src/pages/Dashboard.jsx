import { useState, useEffect } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

export default function Dashboard() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(false)
  const [pipelineResult, setPipelineResult] = useState(null)
  const [pipelineLoading, setPipelineLoading] = useState(false)
  const [newJob, setNewJob] = useState({ title: '', description: '', company: '' })
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [askLoading, setAskLoading] = useState(false)
  const [selectedJob, setSelectedJob] = useState(null)
  const navigate = useNavigate()
  const token = localStorage.getItem('token')

  useEffect(() => {
    if (!token) { navigate('/login'); return }
    fetchJobs()
  }, [])

  const fetchJobs = async () => {
    setLoading(true)
    try {
      const res = await axios.get('http://127.0.0.1:8000/jobs/', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setJobs(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const createJob = async (e) => {
    e.preventDefault()
    try {
      await axios.post('http://127.0.0.1:8000/jobs/', newJob, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setNewJob({ title: '', description: '', company: '' })
      fetchJobs()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create job')
    }
  }

  const runPipeline = async (jobId) => {
    setPipelineLoading(true)
    setPipelineResult(null)
    try {
      const res = await axios.post(
        `http://127.0.0.1:8000/jobs/${jobId}/pipeline`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setPipelineResult(res.data)
    } catch (err) {
      alert(err.response?.data?.detail || 'Pipeline failed')
    } finally {
      setPipelineLoading(false)
    }
  }

  const askQuestion = async () => {
    if (!question || !selectedJob) return
    setAskLoading(true)
    setAnswer('')
    
    try {
      const res = await fetch(
        `http://127.0.0.1:8000/jobs/${selectedJob}/ask/stream`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ question })
        }
      )
      
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        setAnswer(prev => prev + decoder.decode(value))
      }
    } catch (err) {
      setAnswer('Failed to get answer')
    } finally {
      setAskLoading(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-8">Recruiter Dashboard</h1>

      {/* Post New Job */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-8 border">
        <h2 className="text-lg font-semibold mb-4">Post New Job</h2>
        <form onSubmit={createJob} className="space-y-3">
          <input
            placeholder="Job Title"
            value={newJob.title}
            onChange={e => setNewJob({...newJob, title: e.target.value})}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <input
            placeholder="Company"
            value={newJob.company}
            onChange={e => setNewJob({...newJob, company: e.target.value})}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <textarea
            placeholder="Job Description"
            value={newJob.description}
            onChange={e => setNewJob({...newJob, description: e.target.value})}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            required
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Post Job
          </button>
        </form>
      </div>

      {/* Jobs List */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-8 border">
        <h2 className="text-lg font-semibold mb-4">Your Jobs</h2>
        {loading && <p className="text-gray-500">Loading...</p>}
        <div className="space-y-3">
          {jobs.map(job => (
            <div key={job.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">{job.title}</p>
                <p className="text-sm text-gray-500">{job.company}</p>
              </div>
              <button
                onClick={() => runPipeline(job.id)}
                disabled={pipelineLoading}
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
              >
                {pipelineLoading ? 'Running...' : '🤖 Run Pipeline'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Pipeline Results */}
      {pipelineResult && (
        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <h2 className="text-lg font-semibold mb-4">Pipeline Results</h2>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-blue-600">{pipelineResult.summary.total_processed}</p>
              <p className="text-sm text-gray-500">Processed</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-green-600">{pipelineResult.summary.shortlisted}</p>
              <p className="text-sm text-gray-500">Shortlisted</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-yellow-600">{pipelineResult.summary.maybe}</p>
              <p className="text-sm text-gray-500">Maybe</p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-red-600">{pipelineResult.summary.rejected}</p>
              <p className="text-sm text-gray-500">Rejected</p>
            </div>
          </div>

          {pipelineResult.shortlisted_candidates.map(c => (
            <div key={c.application_id} className="border rounded-lg p-4 mb-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold">{c.candidate_name}</h3>
                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                  {c.total_score}/100
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                <p>Skills: {c.breakdown.skills_match}/100</p>
                <p>Experience: {c.breakdown.experience_match}/100</p>
                <p>Education: {c.breakdown.education_match}/100</p>
                <p>Fit: {c.breakdown.overall_fit}/100</p>
              </div>
              <p className="text-sm mt-2 text-green-600 font-medium">{c.recommendation}</p>
            </div>
          ))}

          {pipelineResult.interview_kits.map(kit => (
            <div key={kit.application_id} className="border rounded-lg p-4 mb-4">
              <h3 className="font-semibold mb-3">Interview Kit — {kit.candidate_name}</h3>
              <ol className="space-y-2">
                {kit.questions.map((q, i) => (
                  <li key={i} className="text-sm text-gray-700">
                    <span className="font-medium">{i+1}.</span> {q.question}
                  </li>
                ))}
              </ol>
            </div>
          ))}

          {pipelineResult.jd_analysis && (
            <div className="border rounded-lg p-4 bg-yellow-50">
              <h3 className="font-semibold mb-2">JD Health Analysis</h3>
              <p className="text-sm text-gray-700">Health Score: <span className="font-bold">{pipelineResult.jd_analysis.health_score}/100</span></p>
              <p className="text-sm text-gray-700 mt-1">{pipelineResult.jd_analysis.analysis}</p>
              <p className="text-sm text-green-700 mt-2 font-medium">{pipelineResult.jd_analysis.expected_improvement}</p>
            </div>
          )}
        </div>
      )}

      {/* RAG Assistant */}
      <div className="bg-white rounded-xl shadow-sm p-6 border mt-8">
        <h2 className="text-lg font-semibold mb-4">🤖 AI Recruiting Assistant</h2>
        <select
          value={selectedJob || ''}
          onChange={e => setSelectedJob(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select a job...</option>
          {jobs.map(job => (
            <option key={job.id} value={job.id}>{job.title}</option>
          ))}
        </select>
        <div className="flex gap-2 mb-4">
          <input
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="Ask about candidates..."
            className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyDown={e => e.key === 'Enter' && askQuestion()}
          />
          <button
            onClick={askQuestion}
            disabled={askLoading}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {askLoading ? '...' : 'Ask'}
          </button>
        </div>
        {answer && (
          <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap">
            {answer}
            {askLoading && <span className="animate-pulse">▊</span>}
          </div>
        )}
      </div>
    </div>
  )
}
