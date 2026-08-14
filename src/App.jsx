import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { AuthProvider } from './context/AuthContext'
import { runFullEncryptionMigration } from './firebase/migrationService'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import ActivityEntry from './pages/ActivityEntry'
import ActivityAbstract from './pages/ActivityAbstract'
import FacultyContributionAbstract from './pages/FacultyContributionAbstract'
import FacultyDirectory from './pages/FacultyDirectory'

import Publication from './pages/faculty/Publication'
import Presentation from './pages/faculty/Presentation'
import IPROutcome from './pages/faculty/IPROutcome'
import Participations from './pages/faculty/Participation'
import Achievements from './pages/faculty/Achievements'
import ProjectEntry from './pages/faculty/ProjectEntry'
import ConsultancyEntry from './pages/faculty/ConsultancyEntry'
import IncentiveEntry from './pages/faculty/IncentiveEntry'
import FacultyEntryDashboard from './pages/faculty/FacultyEntryDashboard'
import FacultyProfile from './pages/faculty/FacultyProfile'
import ManageFaculty from './pages/ManageFaculty'
import ManageStudents from './pages/ManageStudents'
import ManagePhDScholars from './pages/ManagePhDScholars'
import ManagePlacements from './pages/ManagePlacements'
import PlacementAbstract from './pages/PlacementAbstract'
import ManageProgrammes from './pages/ManageProgrammes'
import ManageDisciplinary from './pages/ManageDisciplinary'
import ManageDepartments from './pages/ManageDepartments'
import ManageDocuments from './pages/ManageDocuments'
import ManageCollaborators from './pages/ManageCollaborators'
import ManageResearchCollaborators from './pages/ManageResearchCollaborators'
import ManageTasks from './pages/ManageTasks'
import ManageAlumni from './pages/ManageAlumni'
import ManageClasses from './pages/ManageClasses'
import DataCleanup from './pages/DataCleanup'
import About from './pages/About'

export default function App() {
  // Run full-database encryption migration automatically on app start
  useEffect(() => {
    runFullEncryptionMigration();
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Login — standalone page, no global Layout */}
          <Route path="/login" element={<Login />} />

          {/* All other routes share the global Layout (Navbar + logo) */}
          <Route
            path="/"
            element={
              <Layout>
                <ProtectedRoute>
                  <ActivityEntry />
                </ProtectedRoute>
              </Layout>
            }
          />
          <Route path="/abstract" element={<Layout><ActivityAbstract /></Layout>} />
          <Route path="/faculty-contribution-abstract" element={<Layout><FacultyContributionAbstract /></Layout>} />
          <Route path="/manage-faculty" element={<Layout><ProtectedRoute><ManageFaculty /></ProtectedRoute></Layout>} />
          <Route path="/manage-students" element={<Layout><ProtectedRoute><ManageStudents /></ProtectedRoute></Layout>} />
          <Route path="/manage-phd-scholars" element={<Layout><ProtectedRoute><ManagePhDScholars /></ProtectedRoute></Layout>} />
          <Route path="/placement-entry" element={<Layout><ProtectedRoute><ManagePlacements /></ProtectedRoute></Layout>} />
          <Route path="/placement-abstract" element={<Layout><ProtectedRoute><PlacementAbstract /></ProtectedRoute></Layout>} />
          <Route path="/manage-programmes" element={<Layout><ProtectedRoute><ManageProgrammes /></ProtectedRoute></Layout>} />
          <Route path="/manage-departments" element={<Layout><ProtectedRoute><ManageDepartments /></ProtectedRoute></Layout>} />
          <Route path="/manage-documents" element={<Layout><ProtectedRoute><ManageDocuments /></ProtectedRoute></Layout>} />
          <Route path="/manage-collaborators" element={<Layout><ProtectedRoute><ManageCollaborators /></ProtectedRoute></Layout>} />
          <Route path="/manage-research-collaborators" element={<Layout><ProtectedRoute><ManageResearchCollaborators /></ProtectedRoute></Layout>} />
          <Route path="/manage-tasks" element={<Layout><ProtectedRoute><ManageTasks /></ProtectedRoute></Layout>} />
          <Route path="/manage-alumni" element={<Layout><ProtectedRoute><ManageAlumni /></ProtectedRoute></Layout>} />
          <Route path="/manage-classes" element={<Layout><ProtectedRoute><ManageClasses /></ProtectedRoute></Layout>} />
          <Route path="/disciplinary-report" element={<Layout><ProtectedRoute><ManageDisciplinary /></ProtectedRoute></Layout>} />
          <Route path="/explore/faculty-directory" element={<Layout><ProtectedRoute><FacultyDirectory /></ProtectedRoute></Layout>} />
          <Route path="/faculty-entry" element={<Layout><ProtectedRoute><FacultyEntryDashboard /></ProtectedRoute></Layout>} />
          <Route path="/faculty-entry/profile" element={<Layout><ProtectedRoute><FacultyProfile /></ProtectedRoute></Layout>} />
          <Route path="/faculty-entry/publication" element={<Layout><ProtectedRoute><Publication /></ProtectedRoute></Layout>} />
          <Route path="/faculty-entry/presentation" element={<Layout><ProtectedRoute><Presentation /></ProtectedRoute></Layout>} />
          <Route path="/faculty-entry/ipr-outcome" element={<Layout><ProtectedRoute><IPROutcome /></ProtectedRoute></Layout>} />
          <Route path="/faculty-entry/participation" element={<Layout><ProtectedRoute><Participations /></ProtectedRoute></Layout>} />
          <Route path="/faculty-entry/achievements" element={<Layout><ProtectedRoute><Achievements /></ProtectedRoute></Layout>} />
          <Route path="/faculty-entry/project" element={<Layout><ProtectedRoute><ProjectEntry /></ProtectedRoute></Layout>} />
          <Route path="/faculty-entry/consultancy" element={<Layout><ProtectedRoute><ConsultancyEntry /></ProtectedRoute></Layout>} />
          <Route path="/faculty-entry/incentive" element={<Layout><ProtectedRoute><IncentiveEntry /></ProtectedRoute></Layout>} />
          <Route path="/cleanup" element={<Layout><ProtectedRoute><DataCleanup /></ProtectedRoute></Layout>} />
          <Route path="/about" element={<Layout><About /></Layout>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
