import { BrowserRouter, Routes, Route } from 'react-router-dom'

// ── Auth ──────────────────────────────────────────────
import Login    from './pages/auth/Login'
import Register from './pages/auth/Register'

// ── Recruiter ─────────────────────────────────────────
import RecruiterDashboard from './pages/recruiter/RecruiterDashboard'
import PostJob            from './pages/recruiter/PostJob'
import Jobs               from './pages/recruiter/Jobs'
import ApplicationsTable  from './pages/recruiter/ApplicationsTable'
import PipelineResults    from './pages/recruiter/PipelineResults'
import PipelineProgress   from './pages/recruiter/PipelineProgress'
import Analytics          from './pages/recruiter/Analytics'
import CompanySetup       from './pages/recruiter/CompanySetup'
import ScheduleInterview  from './pages/recruiter/ScheduleInterview'
import CandidateFeedback  from './pages/recruiter/CandidateFeedback'

// ── Candidate ─────────────────────────────────────────
import CandidateDashboard from './pages/candidate/CandidateDashboard'
import Apply              from './pages/candidate/Apply'
import Profile            from './pages/candidate/Profile'

// ── Shared ────────────────────────────────────────────
import Notifications  from './pages/shared/Notifications'
import InterviewDetails from './pages/shared/InterviewDetails'

function RoleRouter({ candidate, recruiter }) {
  const role = localStorage.getItem('role')
  return role === 'recruiter' ? recruiter : candidate
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/"         element={<Jobs />} />
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Role-based dashboard */}
        <Route path="/dashboard" element={
          <RoleRouter
            candidate={<CandidateDashboard />}
            recruiter={<RecruiterDashboard />}
          />
        } />

        {/* Shared */}
        <Route path="/notifications"              element={<Notifications />} />
        <Route path="/interview/:applicationId"   element={<InterviewDetails />} />
        <Route path="/profile"                    element={<Profile />} />
        <Route path="/jobs/:jobId/apply"          element={<Apply />} />

        {/* Recruiter */}
        <Route path="/recruiter/dashboard"                                          element={<RecruiterDashboard />} />
        <Route path="/recruiter/post-job"                                           element={<PostJob />} />
        <Route path="/recruiter/company-setup"                                      element={<CompanySetup />} />
        <Route path="/recruiter/jobs/:jobId/pipeline"                               element={<PipelineProgress />} />
        <Route path="/recruiter/jobs/:jobId/applications"                           element={<ApplicationsTable />} />
        <Route path="/recruiter/jobs/:jobId/results"                                element={<PipelineResults />} />
        <Route path="/recruiter/jobs/:jobId/candidates/:candidateId/schedule"       element={<ScheduleInterview />} />
        <Route path="/recruiter/jobs/:jobId/candidates/:applicationId/feedback"      element={<CandidateFeedback />} />
        <Route path="/recruiter/analytics"                                          element={<Analytics />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
