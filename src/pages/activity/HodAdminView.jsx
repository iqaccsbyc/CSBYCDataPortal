import { useState, useEffect } from 'react'
import { collection } from 'firebase/firestore'
import { onSnapshotEncrypted as onSnapshot, getDocsEncrypted as getDocs } from '../../firebase/encryptedStore'
import { db } from '../../firebase/config'
import { useAuth } from '../../context/AuthContext'
import { getAccessLevel } from '../../utils/roleUtils'
import { ACADEMIC_YEARS, getCurrentAcademicYear } from '../../utils/academicYear'
import StatusBadge from '../../components/StatusBadge'
import ActivityDetailView from '../../components/ActivityDetailView'
import Stage2Form from './Stage2Form'

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

export default function HodAdminView() {
  const { userRoles, deptCode } = useAuth()
  const accessLevel = getAccessLevel(userRoles)  // 'campus' | 'department' | 'individual'
  const isCampus = accessLevel === 'campus'

  // ── Filters ────────────────────────────────────────────────────
  const [selectedAY, setSelectedAY]     = useState(getCurrentAcademicYear())
  const [selectedDept, setSelectedDept] = useState('all')   // only used by campus roles
  const [deptOptions, setDeptOptions]   = useState([])

  // ── Data & UI ──────────────────────────────────────────────────
  const [activities, setActivities] = useState([])
  const [loading, setLoading]       = useState(true)
  const [activeTab, setActiveTab]   = useState('all')
  const [selected, setSelected]     = useState(null)
  const [completing, setCompleting] = useState(null)
  const [updating, setUpdating]     = useState(null)
  const [successMsg, setSuccessMsg] = useState('')

  // Load departments (for campus-role dropdown)
  useEffect(() => {
    if (!isCampus) return
    getDocs(collection(db, 'departments')).then(snap => {
      const opts = snap.docs.map(d => ({ code: d.id, name: d.data().deptName || d.id }))
      setDeptOptions(opts)
    }).catch(console.error)
  }, [isCampus])

  // Live activities listener
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'activities'), snap => {
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
  }, [])

  // ── Filtered list ──────────────────────────────────────────────
  const filtered = activities.filter(a => {
    // AY filter
    if (selectedAY !== 'all' && a.academicYear !== selectedAY) return false
    // Dept filter
    if (isCampus) {
      if (selectedDept !== 'all' && a.deptCode !== selectedDept) return false
    } else {
      // Department roles only see their own dept
      if (deptCode && a.deptCode && a.deptCode !== deptCode) return false
    }
    return true
  })

  const pending   = filtered.filter(a => a.status === 'pending_faculty' || a.status === 'approval_pending' || a.status === 'under_revision')
  const completed = filtered.filter(a => a.status === 'completed')
  const list      = activeTab === 'all'       ? filtered
                  : activeTab === 'pending'   ? pending
                  : completed

  const tabs = [
    { id: 'all',       label: `All (${filtered.length})` },
    { id: 'pending',   label: `Pending (${pending.length})` },
    { id: 'completed', label: `Completed (${completed.length})` },
  ]

  function handleCompleteSuccess() {
    setCompleting(null)
    setSuccessMsg('Activity marked as completed.')
    setTimeout(() => setSuccessMsg(''), 5000)
  }

  function handleUpdateSuccess() {
    setUpdating(null)
    setSuccessMsg('Report updated successfully.')
    setTimeout(() => setSuccessMsg(''), 5000)
  }

  return (
    <div>
      {/* ── Filter Bar ──────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end gap-4 mb-6 p-4 bg-gray-50 border border-gray-200 rounded-xl">
        {/* AY Filter — visible to all roles */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Academic Year
          </label>
          <select
            value={selectedAY}
            onChange={e => setSelectedAY(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white min-w-[140px]"
          >
            <option value="all">All Years</option>
            {[...ACADEMIC_YEARS].reverse().map(ay => (
              <option key={ay} value={ay}>{ay}</option>
            ))}
          </select>
        </div>

        {/* Dept Filter — only for Campus roles */}
        {isCampus && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Department
            </label>
            <select
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white min-w-[200px]"
            >
              <option value="all">All Departments</option>
              {deptOptions.map(d => (
                <option key={d.code} value={d.code}>{d.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Dept badge — for Department roles (read-only context) */}
        {!isCampus && deptCode && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Department
            </label>
            <div className="border border-indigo-200 bg-indigo-50 rounded-lg px-3 py-2 text-sm font-medium text-indigo-700">
              {deptCode}
            </div>
          </div>
        )}

        {/* Reset */}
        {(selectedAY !== getCurrentAcademicYear() || selectedDept !== 'all') && (
          <button
            onClick={() => { setSelectedAY(getCurrentAcademicYear()); setSelectedDept('all') }}
            className="text-xs text-gray-500 hover:text-indigo-600 underline self-end pb-2"
          >
            Reset filters
          </button>
        )}
      </div>

      {/* ── Summary cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-indigo-50 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-indigo-700">{filtered.length}</div>
          <div className="text-sm font-medium text-indigo-600 mt-0.5">Total</div>
        </div>
        <div className="bg-amber-50 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-amber-700">{pending.length}</div>
          <div className="text-sm font-medium text-amber-600 mt-0.5">Pending</div>
        </div>
        <div className="bg-green-50 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-green-700">{completed.length}</div>
          <div className="text-sm font-medium text-green-600 mt-0.5">Completed</div>
        </div>
      </div>

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
          <p className="text-lg">No activities found.</p>
          <p className="text-sm mt-1">Try adjusting the filters above.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['S.No', 'Event Name', 'Date', 'Type', 'AY', isCampus ? 'Dept' : 'Month', 'Organizers', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {list.map((a, i) => (
                <tr
                  key={a.id}
                  onClick={() => setSelected(a)}
                  className="hover:bg-indigo-50 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-4 text-gray-400 text-xs">{i + 1}</td>
                  <td className="py-3 px-4 font-medium text-gray-900 max-w-xs">
                    <span className="line-clamp-2">{a.eventName}</span>
                  </td>
                  <td className="py-3 px-4 text-gray-600 whitespace-nowrap">{formatDate(a.startDate)}</td>
                  <td className="py-3 px-4 text-gray-600 max-w-32">
                    <span className="line-clamp-1">{a.eventType}</span>
                  </td>
                  <td className="py-3 px-4 text-gray-600 whitespace-nowrap text-xs">
                    {a.academicYear || '—'}
                  </td>
                  <td className="py-3 px-4 text-gray-600 whitespace-nowrap text-xs">
                    {isCampus
                      ? (a.deptCode || '—')
                      : (a.month || '—')
                    }
                  </td>
                  <td className="py-3 px-4 text-gray-600 max-w-40">
                    <span className="line-clamp-1">{(a.organizers || []).join(', ')}</span>
                  </td>

                  <td className="py-3 px-4">
                    <StatusBadge status={a.status} />
                  </td>
                  <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                    {(a.status === 'pending_faculty' || a.status === 'under_revision') && (
                      <button
                        onClick={() => setCompleting(a)}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors whitespace-nowrap"
                      >
                        Complete Report
                      </button>
                    )}
                    {a.status === 'approval_pending' && (
                      <button
                        onClick={() => setCompleting(a)}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-md transition-colors whitespace-nowrap"
                      >
                        Verify / Approve
                      </button>
                    )}
                    {a.status === 'completed' && (
                      <button
                        onClick={() => setUpdating(a)}
                        className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors whitespace-nowrap"
                      >
                        Update Report
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <ActivityDetailView activity={selected} onClose={() => setSelected(null)} />
      )}

      {completing && (
        <Stage2Form
          activity={activities.find(a => a.id === completing.id) || completing}
          activityId={completing.id}
          onClose={() => setCompleting(null)}
          onSuccess={handleCompleteSuccess}
          mode={completing.status === 'approval_pending' ? 'approve' : 'complete'}
        />
      )}

      {updating && (
        <Stage2Form
          activity={activities.find(a => a.id === updating.id) || updating}
          activityId={updating.id}
          onClose={() => setUpdating(null)}
          onSuccess={handleUpdateSuccess}
          mode="update"
        />
      )}
    </div>
  )
}
