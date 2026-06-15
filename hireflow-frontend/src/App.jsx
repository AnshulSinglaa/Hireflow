import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Jobs from './pages/Jobs'
import Dashboard from './pages/Dashboard'
import CandidateDashboard from './pages/CandidateDashboard'
import Apply from './pages/Apply'
import Notifications from './pages/Notifications'
import InterviewDetails from './pages/InterviewDetails'
import Profile from './pages/Profile'
import RecruiterDashboard from './pages/RecruiterDashboard'
import PostJob from './pages/PostJob'
import CompanySetup from './pages/CompanySetup'
import PipelineProgress from './pages/PipelineProgress'
import ApplicationsTable from './pages/ApplicationsTable'
import PipelineResults from './pages/PipelineResults'
import ScheduleInterview from './pages/ScheduleInterview'
import Analytics from './pages/Analytics'

function RoleRouter({ candidate, recruiter }) {
  const role = localStorage.getItem('role')
  return role === 'recruiter' ? recruiter : candidate
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Jobs />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<RoleRouter candidate={<CandidateDashboard />} recruiter={<RecruiterDashboard />} />} />
        <Route path="/jobs/:jobId/apply" element={<Apply />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/interview/:applicationId" element={<InterviewDetails />} />
        <Route path="/profile" element={<Profile />} />
        
        {/* Recruiter Routes */}
        <Route path="/recruiter/dashboard" element={<RecruiterDashboard />} />
        <Route path="/recruiter/post-job" element={<PostJob />} />
        <Route path="/recruiter/company-setup" element={<CompanySetup />} />
        <Route path="/recruiter/jobs/:jobId/pipeline" element={<PipelineProgress />} />
        <Route path="/recruiter/jobs/:jobId/applications" element={<ApplicationsTable />} />
        <Route path="/recruiter/jobs/:jobId/results" element={<PipelineResults />} />
        <Route path="/recruiter/jobs/:jobId/candidates/:candidateId/schedule" element={<ScheduleInterview />} />
        <Route path="/recruiter/analytics" element={<Analytics />} />
      </Routes>
    </BrowserRouter>
  )
}


export default App

