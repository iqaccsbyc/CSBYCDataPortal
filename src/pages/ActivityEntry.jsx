import { useAuth } from '../context/AuthContext'
import AdminAssistView from './activity/AdminAssistView'
import FacultyView from './activity/FacultyView'
import HodAdminView from './activity/HodAdminView'
import { CAMPUS_ROLES, DEPT_ROLES } from '../utils/roleUtils'

// Roles that get the admin/management view with filters
const ADMIN_VIEW_ROLES = [...CAMPUS_ROLES, ...DEPT_ROLES]

export default function ActivityEntry() {
  const { userRoles } = useAuth()

  function renderView() {
    if (!userRoles || userRoles.length === 0) {
      return (
        <div className="py-16 text-center text-gray-400">
          <p>Your role does not have access to Activity Entry.</p>
        </div>
      )
    }

    // Secretary gets a specialised entry-only view
    if (userRoles.includes('adminassist'))   return <AdminAssistView />
    // All campus and department admin roles → management view with filters
    if (ADMIN_VIEW_ROLES.some(r => userRoles.includes(r))) return <HodAdminView />
    // Faculty → their own personal view
    if (userRoles.includes('faculty'))       return <FacultyView />
    return (
      <div className="py-16 text-center text-gray-400">
        <p>Your roles <span className="font-medium text-gray-600">({userRoles.join(', ')})</span> do not have access to Activity Entry.</p>
      </div>
    )
  }

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Activity Entry</h1>
        <p className="text-sm text-gray-500 mt-0.5">Submit new department activities</p>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
        {renderView()}
      </div>
    </div>
  )
}
