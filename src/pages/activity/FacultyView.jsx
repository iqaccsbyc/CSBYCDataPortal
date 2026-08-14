import { useState, useEffect } from 'react'
import { collection, query, where } from 'firebase/firestore'
import { onSnapshotEncrypted as onSnapshot } from '../../firebase/encryptedStore'
import { db } from '../../firebase/config'
import { useAuth } from '../../context/AuthContext'
import Stage2Form from './Stage2Form'
import StatusBadge from '../../components/StatusBadge'
import ActivityDetailView from '../../components/ActivityDetailView'

function Tabs({ tabs, active, onChange }) {
  return (
    <div className="border-b border-gray-200 mb-6">
      <nav className="flex gap-6 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
              active === t.id
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  )
}

function formatDate(str) {
  if (!str) return '—'
  const [y, m, d] = str.split('-')
  return `${d}/${m}/${y}`
}

function formatTs(ts) {
  if (!ts?.toDate) return null
  const d = ts.toDate()
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

function ActivityCard({ activity, onComplete, onView }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 leading-snug">{activity.eventName}</h3>
          <p className="text-sm text-gray-500 mt-1">
            {formatDate(activity.startDate)}
            {activity.endDate !== activity.startDate ? ` – ${formatDate(activity.endDate)}` : ''}
            {activity.noOfDays > 1 ? ` (${activity.noOfDays} days)` : ''}
          </p>
          <p className="text-sm text-gray-600 mt-0.5">{activity.eventType}</p>
        </div>
        <StatusBadge status={activity.status} />
      </div>

      <div className="text-xs text-gray-400 space-y-0.5">
        <p>Entered by: <span className="text-gray-600">{activity.dataEntryEmail}</span></p>
        {activity.createdAt && (
          <p>on <span className="text-gray-600">{formatTs(activity.createdAt)}</span></p>
        )}
        {activity.completedAt && (
          <p>Completed: <span className="text-gray-600">{formatTs(activity.completedAt)}</span></p>
        )}
      </div>

      {/* Classification tags (compact) */}
      {(activity.sdgLinks?.length > 0 || activity.naacCriteria?.length > 0) && (
        <div className="flex flex-wrap gap-1">
          {activity.sdgLinks?.slice(0, 3).map(s => (
            <span key={s} className="bg-blue-50 text-blue-600 text-xs px-1.5 py-0.5 rounded">{s}</span>
          ))}
          {activity.naacCriteria?.map(c => (
            <span key={c} className="bg-purple-50 text-purple-600 text-xs px-1.5 py-0.5 rounded">{c}</span>
          ))}
          {activity.sdgLinks?.length > 3 && (
            <span className="text-xs text-gray-400">+{activity.sdgLinks.length - 3} more</span>
          )}
        </div>
      )}

      <div className="flex gap-2 mt-auto pt-1">
        {onComplete && (
          <button
            onClick={onComplete}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2 rounded-lg transition-colors"
          >
            Complete Entry
          </button>
        )}
        {onView && (
          <button
            onClick={onView}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2 rounded-lg transition-colors"
          >
            View Details
          </button>
        )}
      </div>
    </div>
  )
}

export default function FacultyView() {
  const { user } = useAuth()
  const [activeTab, setActiveTab]   = useState('pending')
  const [allActivities, setAll]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [completing, setCompleting] = useState(null)
  const [viewing, setViewing]       = useState(null)
  const [successMsg, setSuccessMsg] = useState('')

  useEffect(() => {
    if (!user) return
    const q = query(
      collection(db, 'activities'),
      where('organizerEmails', 'array-contains', user.email),
    )
    const unsub = onSnapshot(q, snap => {
      const docs = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
      setAll(docs)
      setLoading(false)
    }, err => {
      console.error(err)
      setLoading(false)
    })
    return unsub
  }, [user])

  const pending   = allActivities.filter(a => a.status === 'pending_faculty' || a.status === 'under_revision')
  const completed = allActivities.filter(a => a.status === 'completed')

  const tabs = [
    { id: 'pending',   label: `Pending — Complete My Section (${pending.length})` },
    { id: 'completed', label: `Completed (${completed.length})` },
  ]

  function handleCompletionSuccess() {
    setCompleting(null)
    setSuccessMsg('Entry completed successfully.')
    setActiveTab('completed')
    setTimeout(() => setSuccessMsg(''), 5000)
  }

  const list = activeTab === 'pending' ? pending : completed

  return (
    <div>
      <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

      {successMsg && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800">
          ✓ {successMsg}
        </div>
      )}

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : list.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg mb-1">
            {activeTab === 'pending' ? 'No pending entries.' : 'No completed entries yet.'}
          </p>
          {activeTab === 'pending' && (
            <p className="text-sm">You will see entries here when a Secretary assigns you as an organizer.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map(a => (
            <ActivityCard
              key={a.id}
              activity={a}
              onComplete={activeTab === 'pending' ? () => setCompleting(a) : undefined}
              onView={activeTab === 'completed' ? () => setViewing(a) : undefined}
            />
          ))}
        </div>
      )}

      {completing && (
        <Stage2Form
          activity={allActivities.find(a => a.id === completing.id) || completing}
          activityId={completing.id}
          onClose={() => setCompleting(null)}
          onSuccess={handleCompletionSuccess}
        />
      )}

      {viewing && (
        <ActivityDetailView activity={viewing} onClose={() => setViewing(null)} />
      )}
    </div>
  )
}
