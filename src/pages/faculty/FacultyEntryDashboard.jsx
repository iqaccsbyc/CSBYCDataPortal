import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../../context/AuthContext'
import { ACADEMIC_YEARS, getCurrentAcademicYear } from '../../utils/academicYear'

const MODULES = [
  { id: 'publications', title: 'Publications', path: '/faculty-entry/publication', color: 'blue' },
  { id: 'presentations', title: 'Presentations', path: '/faculty-entry/presentation', color: 'emerald' },
  { id: 'iprOutcomes', title: 'IPR Outcomes', path: '/faculty-entry/ipr-outcome', color: 'purple' },
  { id: 'participations', title: 'Participations', path: '/faculty-entry/participation', color: 'amber' },
  { id: 'achievements', title: 'Achievements', path: '/faculty-entry/achievements', color: 'rose' },
  { id: 'projects', title: 'Projects', path: '/faculty-entry/project', color: 'teal' },
  { id: 'consultancy', title: 'Consultancy', path: '/faculty-entry/consultancy', color: 'cyan' },
  { id: 'incentives', title: 'Financial Incentives', path: '/faculty-entry/incentive', color: 'orange' }
]

export default function FacultyEntryDashboard() {
  const { user, userRoles } = useAuth()
  const [metrics, setMetrics] = useState({})
  const [loading, setLoading] = useState(true)
  const [selectedAY, setSelectedAY] = useState(getCurrentAcademicYear())

  const isElevatedRole = ['admin', 'iqac', 'hod', 'adminassist', 'assochod'].some(r => userRoles?.includes(r))
  const isFacultyRole = ['faculty', 'coordinator', 'coreteam'].some(r => userRoles?.includes(r))
  
  const [viewMode, setViewMode] = useState(isElevatedRole ? 'department' : 'individual')

  const isElevated = isElevatedRole && viewMode === 'department'

  useEffect(() => {
    if (!user) return

    const fetchAllData = async () => {
      setLoading(true)
      const newMetrics = {}

      for (const mod of MODULES) {
        let q
        if (isElevated) {
          q = query(collection(db, mod.id), where('academicYear', '==', selectedAY))
        } else {
          q = query(collection(db, mod.id), where('academicYear', '==', selectedAY), where('submittedBy', '==', user.email))
        }

        try {
          const snap = await getDocs(q)
          let total = 0
          let accepted = 0
          let pending = 0
          let revision = 0

          snap.forEach(doc => {
            total++
            const status = doc.data().proofAccepted || 'Pending'
            if (status === 'Accepted') accepted++
            else if (status === 'Revision Needed') revision++
            else pending++
          })

          newMetrics[mod.id] = { total, accepted, pending, revision }
        } catch (err) {
          console.error(`Error fetching ${mod.id}:`, err)
          newMetrics[mod.id] = { total: 0, accepted: 0, pending: 0, revision: 0 }
        }
      }

      setMetrics(newMetrics)
      setLoading(false)
    }

    fetchAllData()
  }, [user, isElevated, selectedAY])

  const getColorClasses = (colorName) => {
    const classes = {
      blue: 'bg-blue-50 border-blue-200 text-blue-800',
      emerald: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      purple: 'bg-purple-50 border-purple-200 text-purple-800',
      amber: 'bg-amber-50 border-amber-200 text-amber-800',
      rose: 'bg-rose-50 border-rose-200 text-rose-800',
      teal: 'bg-teal-50 border-teal-200 text-teal-800',
      cyan: 'bg-cyan-50 border-cyan-200 text-cyan-800',
      orange: 'bg-orange-50 border-orange-200 text-orange-800',
    }
    return classes[colorName] || 'bg-gray-50 border-gray-200 text-gray-800'
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-4">
        <Link to="/" className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
          <span>&larr;</span> Back to Main Dashboard
        </Link>
      </div>
      
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Faculty Entry Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            {isElevated ? 'Department-wide summary of all faculty entries.' : 'Summary of your submitted entries.'}
          </p>
          <div className="mt-3">
            <label className="text-sm font-medium text-gray-700 mr-2">Academic Year:</label>
            <select
              value={selectedAY}
              onChange={(e) => setSelectedAY(e.target.value)}
              className="text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-1 font-semibold"
            >
              {ACADEMIC_YEARS.map(ay => <option key={ay} value={ay}>{ay}</option>)}
            </select>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {isElevatedRole && isFacultyRole && (
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setViewMode('department')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'department' ? 'bg-white shadow-sm text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Department
              </button>
              <button
                onClick={() => setViewMode('individual')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'individual' ? 'bg-white shadow-sm text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Individual
              </button>
            </div>
          )}
          
          <Link
            to="/faculty-entry/profile"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            My Profile & Contributions
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {MODULES.map(mod => {
            const data = metrics[mod.id] || { total: 0, accepted: 0, pending: 0, revision: 0 }
            return (
              <Link 
                key={mod.id} 
                to={mod.path}
                className={`block rounded-2xl border p-6 transition-all hover:shadow-md hover:-translate-y-1 ${getColorClasses(mod.color)}`}
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold">{mod.title}</h3>
                  <span className="text-2xl font-black opacity-30">{data.total}</span>
                </div>
                
                <div className="space-y-3 mt-6">
                  <div className="flex justify-between items-center bg-white/60 px-3 py-2 rounded-lg">
                    <span className="text-sm font-medium opacity-80">Accepted</span>
                    <span className="font-bold text-green-600">{data.accepted}</span>
                  </div>
                  <div className="flex justify-between items-center bg-white/60 px-3 py-2 rounded-lg">
                    <span className="text-sm font-medium opacity-80">Pending</span>
                    <span className="font-bold text-gray-600">{data.pending}</span>
                  </div>
                  <div className="flex justify-between items-center bg-white/60 px-3 py-2 rounded-lg">
                    <span className="text-sm font-medium opacity-80">Revision Needed</span>
                    <span className="font-bold text-amber-600">{data.revision}</span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
