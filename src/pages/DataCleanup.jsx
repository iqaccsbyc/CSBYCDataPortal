import { useState } from 'react'
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../context/AuthContext'

// Collections to fully wipe
const FULL_WIPE = [
  'activities',
  'departments',
  'placements',
  'students',
  'phdscholars',
  'disciplinaryReports',
  'programmes',
  'publications',
  'presentations',
  'participations',
  'iprOutcomes',
  'achievements',
  'projects',
  'consultancy',
  'incentives',
]

export default function DataCleanup() {
  const { userRoles } = useAuth()
  const [confirm, setConfirm]   = useState('')
  const [log, setLog]           = useState([])
  const [running, setRunning]   = useState(false)
  const [done, setDone]         = useState(false)

  if (!userRoles?.includes('admin')) {
    return <div className="p-8 text-red-600 font-semibold text-center">Access Denied — Admin only.</div>
  }

  function addLog(msg) {
    setLog(prev => [...prev, { time: new Date().toLocaleTimeString(), msg }])
  }

  async function wipeCollection(name) {
    const snap = await getDocs(collection(db, name))
    if (snap.empty) { addLog(`  ↳ ${name}: empty, skipped`); return 0 }
    let count = 0
    for (const d of snap.docs) {
      await deleteDoc(doc(db, name, d.id))
      count++
    }
    addLog(`  ↳ ${name}: deleted ${count} document(s)`)
    return count
  }

  async function wipeFacultyAndUsers() {
    // faculty — delete all docs whose roles array does NOT include 'admin'
    const facSnap = await getDocs(collection(db, 'faculty'))
    let facDel = 0
    for (const d of facSnap.docs) {
      const data = d.data()
      // Keep if facId is admin's (cross-check users for role)
      // We'll keep based on the parallel users collection check below
      // Simple heuristic: keep if doc has no email or has admin role in users
      // We'll handle after we load users
      await deleteDoc(doc(db, 'faculty', d.id))
      facDel++
    }

    // users — delete all non-admin docs
    const usersSnap = await getDocs(collection(db, 'users'))
    const adminDocs = []
    const nonAdminDocs = []
    for (const d of usersSnap.docs) {
      const data = d.data()
      const roles = data.roles || (data.role ? [data.role] : [])
      if (roles.includes('admin')) adminDocs.push(d)
      else nonAdminDocs.push(d)
    }

    for (const d of nonAdminDocs) {
      await deleteDoc(doc(db, 'users', d.id))
    }

    addLog(`  ↳ faculty: deleted ${facDel} document(s) (all — re-seed admin after)`)
    addLog(`  ↳ users: kept ${adminDocs.length} admin doc(s), deleted ${nonAdminDocs.length}`)

    return { facDel, adminKept: adminDocs.length, usersDel: nonAdminDocs.length }
  }

  async function handleRun() {
    if (confirm !== 'DELETE ALL') return
    setRunning(true)
    setLog([])
    setDone(false)

    try {
      addLog('Starting data cleanup…')

      // 1. Full-wipe collections
      addLog('--- Wiping collections ---')
      for (const col of FULL_WIPE) {
        await wipeCollection(col)
      }

      // 2. Selective wipe on faculty + users
      addLog('--- Cleaning faculty & users ---')
      const { facDel, adminKept, usersDel } = await wipeFacultyAndUsers()

      addLog('')
      addLog(`✓ Done. Total faculty deleted: ${facDel}. Admin users kept: ${adminKept}. Non-admin users deleted: ${usersDel}.`)
      addLog('You can now re-add departments and faculty from scratch.')
      setDone(true)
    } catch (err) {
      addLog(`✗ ERROR: ${err.message}`)
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      <div className="p-5 bg-red-50 border-2 border-red-300 rounded-xl">
        <h1 className="text-xl font-bold text-red-800 flex items-center gap-2">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          Data Cleanup — Fresh Start
        </h1>
        <p className="text-sm text-red-700 mt-2">
          This will <strong>permanently delete</strong> all documents in the following collections:
        </p>
        <ul className="mt-3 grid grid-cols-2 gap-1 text-sm text-red-800 font-mono">
          {FULL_WIPE.map(c => <li key={c} className="before:content-['•'] before:mr-1">{c}</li>)}
          <li className="before:content-['•'] before:mr-1">faculty <span className="text-red-500 font-sans">(all docs)</span></li>
          <li className="before:content-['•'] before:mr-1">users <span className="text-red-500 font-sans">(non-admin only)</span></li>
        </ul>
        <p className="text-sm text-red-700 mt-3">
          Only <strong>admin-role user documents</strong> in the <code>users</code> collection will be preserved.
          You will need to re-seed the admin's <code>faculty</code> doc manually afterwards.
        </p>
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-semibold text-gray-700">
          Type <code className="bg-gray-100 px-1 py-0.5 rounded text-red-700 font-mono">DELETE ALL</code> to confirm:
        </label>
        <input
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          placeholder="DELETE ALL"
          className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400"
          disabled={running || done}
        />
        <button
          onClick={handleRun}
          disabled={confirm !== 'DELETE ALL' || running || done}
          className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {running ? 'Deleting…' : done ? '✓ Cleanup Complete' : 'Run Cleanup'}
        </button>
      </div>

      {log.length > 0 && (
        <div className="bg-gray-900 text-green-400 font-mono text-xs rounded-xl p-4 space-y-1 max-h-80 overflow-y-auto">
          {log.map((entry, i) => (
            <div key={i}>
              <span className="text-gray-500">[{entry.time}]</span> {entry.msg}
            </div>
          ))}
        </div>
      )}

      {done && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800">
          ✓ Cleanup complete. Navigate to <a href="/" className="text-indigo-600 underline">Home</a> or{' '}
          <a href="/manage-faculty" className="text-indigo-600 underline">Manage Faculty</a> to start fresh.
        </div>
      )}
    </div>
  )
}
