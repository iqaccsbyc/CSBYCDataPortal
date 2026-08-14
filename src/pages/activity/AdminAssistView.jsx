import { useState, useEffect } from 'react'
import { collection, query, where, deleteDoc, doc } from 'firebase/firestore'
import { onSnapshotEncrypted as onSnapshot } from '../../firebase/encryptedStore'
import { db } from '../../firebase/config'
import { useAuth } from '../../context/AuthContext'
import Stage1Form from './Stage1Form'
import StatusBadge from '../../components/StatusBadge'
import ActivityDetailView from '../../components/ActivityDetailView'

function Tabs({ tabs, active, onChange }) {
  return (
    <div className="border-b border-gray-200 mb-6">
      <nav className="flex gap-6">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
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

function DeleteConfirmDialog({ activity, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-2">Delete Activity?</h2>
        <p className="text-sm text-gray-600 mb-1">
          Are you sure you want to delete:
        </p>
        <p className="text-sm font-medium text-gray-900 mb-4 line-clamp-2">
          {activity.eventName}
        </p>
        <p className="text-xs text-red-600 mb-6">
          This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-60"
          >
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

function EditModal({ activity, onClose, onSuccess }) {
  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/40 overflow-y-auto py-8 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Update Activity</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-xl font-bold leading-none"
          >
            ×
          </button>
        </div>
        <div className="p-6">
          <Stage1Form
            activityId={activity.id}
            initialActivity={activity}
            onSuccess={onSuccess}
          />
        </div>
      </div>
    </div>
  )
}

export default function AdminAssistView() {
  const { user } = useAuth()
  const [activeTab, setActiveTab]       = useState('new')
  const [activities, setActivities]     = useState([])
  const [loading, setLoading]           = useState(true)
  const [successMsg, setSuccessMsg]     = useState('')
  const [selected, setSelected]         = useState(null)
  const [editing, setEditing]           = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    if (!user) return
    const q = query(
      collection(db, 'activities'),
      where('createdBy', '==', user.email),
    )
    const unsub = onSnapshot(q, snap => {
      const docs = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
      setActivities(docs)
      setLoading(false)
    }, err => {
      console.error(err)
      setLoading(false)
    })
    return unsub
  }, [user])

  function handleSuccess(organizerNames) {
    setSuccessMsg(
      `Activity saved. The following faculty have been notified to complete their sections: ${organizerNames.join(', ')}.`
    )
    setActiveTab('entries')
    setTimeout(() => setSuccessMsg(''), 8000)
  }

  function handleUpdateSuccess() {
    setEditing(null)
    setSuccessMsg('Activity updated successfully.')
    setTimeout(() => setSuccessMsg(''), 5000)
  }

  async function handleDelete() {
    if (!deleteConfirm) return
    setDeleteLoading(true)
    try {
      await deleteDoc(doc(db, 'activities', deleteConfirm.id))
      setDeleteConfirm(null)
      setSuccessMsg('Activity deleted.')
      setTimeout(() => setSuccessMsg(''), 4000)
    } catch (err) {
      console.error(err)
    } finally {
      setDeleteLoading(false)
    }
  }

  const tabs = [
    { id: 'new',     label: 'New Entry' },
    { id: 'entries', label: `My Entries (${activities.length})` },
  ]

  return (
    <div>
      <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

      {successMsg && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800 leading-relaxed">
          ✓ {successMsg}
        </div>
      )}

      {activeTab === 'new' && (
        <Stage1Form onSuccess={handleSuccess} />
      )}

      {activeTab === 'entries' && (
        <>
          {loading ? (
            <p className="text-gray-400 text-sm">Loading…</p>
          ) : activities.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-lg mb-1">No entries yet.</p>
              <p className="text-sm">Switch to the New Entry tab to create your first activity.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['Event Name', 'Date', 'Type', 'Month', 'Organizers', 'Status', 'Actions'].map(h => (
                      <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {activities.map(a => (
                    <tr
                      key={a.id}
                      onClick={() => setSelected(a)}
                      className="hover:bg-indigo-50 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-medium text-gray-900 max-w-xs truncate">{a.eventName}</td>
                      <td className="py-3 px-4 text-gray-600 whitespace-nowrap">{formatDate(a.startDate)}</td>
                      <td className="py-3 px-4 text-gray-600">{a.eventType}</td>
                      <td className="py-3 px-4 text-gray-600 whitespace-nowrap">{a.month}</td>
                      <td className="py-3 px-4 text-gray-600 max-w-xs truncate">
                        {(a.organizers || []).join(', ')}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={a.status} />
                      </td>
                      <td className="py-3 px-4">
                        <div
                          className="flex gap-2"
                          onClick={e => e.stopPropagation()}
                        >
                          <button
                            onClick={() => setEditing(a)}
                            className="px-3 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors whitespace-nowrap"
                          >
                            Update
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(a)}
                            className="px-3 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {selected && (
        <ActivityDetailView activity={selected} onClose={() => setSelected(null)} />
      )}

      {editing && (
        <EditModal
          activity={editing}
          onClose={() => setEditing(null)}
          onSuccess={handleUpdateSuccess}
        />
      )}

      {deleteConfirm && (
        <DeleteConfirmDialog
          activity={deleteConfirm}
          onConfirm={handleDelete}
          onCancel={() => setDeleteConfirm(null)}
          loading={deleteLoading}
        />
      )}
    </div>
  )
}
