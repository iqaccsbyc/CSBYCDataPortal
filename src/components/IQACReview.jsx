import { useState } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../context/AuthContext'

export default function IQACReview({ collectionName, docId, currentStatus, currentComments, onUpdate }) {
  const { userRoles } = useAuth()
  const isElevated = ['admin', 'hod', 'assochod', 'adminassist',
    'director', 'assocdirector', 'campusadmin', 'dean', 'assocdean', 'deansoffice',
    'campusiqaccoordinator', 'campusiqaccoreteam',
    'deptiqaccoordinator', 'deptiqaccoreteam'
  ].some(r => userRoles?.includes(r))

  const [status, setStatus] = useState(currentStatus || 'Pending')
  const [comments, setComments] = useState(currentComments || '')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  if (!isElevated) return null

  const handleSave = async () => {
    setLoading(true)
    setSuccess(false)
    try {
      await updateDoc(doc(db, collectionName, docId), {
        proofAccepted: status,
        revisionComments: comments
      })
      setSuccess(true)
      if (onUpdate) onUpdate()
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error(err)
      alert("Error saving review: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (s) => {
    if (s === 'Accepted') return 'bg-green-100 text-green-800 border-green-200'
    if (s === 'Revision Needed') return 'bg-amber-100 text-amber-800 border-amber-200'
    return 'bg-gray-100 text-gray-800 border-gray-200'
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm mt-6">
      <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2">
        IQAC / Admin Review Panel
        <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor(status)}`}>
          Current: {status}
        </span>
      </h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select 
            value={status} 
            onChange={(e) => setStatus(e.target.value)}
            className="w-full sm:w-1/2 rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3 border"
          >
            <option value="Pending">Pending</option>
            <option value="Accepted">Accepted</option>
            <option value="Revision Needed">Revision Needed</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Revision Comments</label>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={3}
            placeholder="Add any required changes or feedback here..."
            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3 border"
          />
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Review'}
          </button>
          {success && <span className="text-sm font-medium text-green-600">Review saved successfully! ✓</span>}
        </div>
      </div>
    </div>
  )
}
