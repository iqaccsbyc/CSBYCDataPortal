import { useState } from 'react'
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../context/AuthContext'
import { restoreAllCollectionsToPlaintext } from '../utils/restorePlaintext'

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

  // Decryption state
  const [restoring, setRestoring] = useState(false)
  const [restoreLog, setRestoreLog] = useState([])
  const [restoreDone, setRestoreDone] = useState(false)

  if (!userRoles?.includes('admin')) {
    return <div className="p-8 text-red-600 font-semibold text-center">Access Denied — Admin only.</div>
  }

  function addLog(msg) {
    setLog(prev => [...prev, { time: new Date().toLocaleTimeString(), msg }])
  }

  function addRestoreLog(msg) {
    setRestoreLog(prev => [...prev, { time: new Date().toLocaleTimeString(), msg }])
  }

  async function handleRunRestore() {
    setRestoring(true)
    setRestoreDone(false)
    setRestoreLog([])
    try {
      await restoreAllCollectionsToPlaintext(addRestoreLog)
      setRestoreDone(true)
    } catch (err) {
      addRestoreLog(`Error: ${err.message}`)
    } finally {
      setRestoring(false)
    }
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
    const facSnap = await getDocs(collection(db, 'faculty'))
    let facDel = 0
    for (const d of facSnap.docs) {
      await deleteDoc(doc(db, name, d.id))
      facDel++
    }

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
      addLog('--- Wiping collections ---')
      for (const col of FULL_WIPE) {
        await wipeCollection(col)
      }
      addLog('--- Wiping faculty & non-admin users ---')
      await wipeFacultyAndUsers()
      addLog('Done!')
      setDone(true)
    } catch (err) {
      addLog(`ERROR: ${err.message}`)
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      {/* SECTION 1: RESTORE DATABASE TO PLAINTEXT */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 font-bold text-lg">
            ✓
          </div>
          <div>
            <h2 className="text-lg font-bold text-blue-900">Restore Database to Clean Plaintext</h2>
            <p className="text-sm text-blue-700 mt-1">
              Safely decrypts all records across all collections (Activities, Publications, etc.) back to standard Firestore plaintext JSON. 
              <strong> Does not delete any data.</strong>
            </p>
          </div>
        </div>

        <button
          onClick={handleRunRestore}
          disabled={restoring}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
        >
          {restoring ? 'Restoring and Decrypting Database...' : restoreDone ? '✓ Plaintext Restoration Complete' : 'Run Database Plaintext Restoration'}
        </button>

        {restoreLog.length > 0 && (
          <div className="bg-gray-900 text-emerald-400 font-mono text-xs rounded-xl p-4 space-y-1 max-h-64 overflow-y-auto">
            {restoreLog.map((entry, i) => (
              <div key={i}>
                <span className="text-gray-500">[{entry.time}]</span> {entry.msg}
              </div>
            ))}
          </div>
        )}

        {restoreDone && (
          <div className="p-3 bg-emerald-100 border border-emerald-300 rounded-lg text-xs font-semibold text-emerald-800">
            ✓ Restoration finished! All collections are now clean, unencrypted plaintext.
          </div>
        )}
      </div>

      {/* SECTION 2: HARD DATA CLEANUP */}
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 shadow-sm space-y-4">
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
        </p>

        <div className="space-y-3 pt-2">
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
            ✓ Cleanup complete.
          </div>
        )}
      </div>
    </div>
  )
}
