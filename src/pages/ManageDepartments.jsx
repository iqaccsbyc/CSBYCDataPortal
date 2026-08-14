import { useState, useEffect } from 'react'
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc, query, where, Timestamp } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../context/AuthContext'
import { hasCampusAccess } from '../utils/roleUtils'

/* ── helpers ── */
const ASSIGNABLE_ROLES = [
  { key: 'hod',        label: 'HoD' },
  { key: 'assochod',   label: 'Assoc. HoD' },
  { key: 'coordinator',label: 'Coordinator' },
  { key: 'adminassist',label: 'Secretary' },
]

const BLANK_FORM = { deptCode: '', deptName: '', deptShortName: '', campus: '', established: '' }

function Badge({ color, children }) {
  const map = {
    blue:   'bg-blue-100 text-blue-800',
    green:  'bg-green-100 text-green-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    pink:   'bg-pink-100 text-pink-800',
    gray:   'bg-gray-100 text-gray-600',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${map[color] ?? map.gray}`}>
      {children}
    </span>
  )
}

function FacultyPicker({ label, color, value, onChange, facultyList }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const filtered = facultyList.filter(f =>
    !q || f.facName.toLowerCase().includes(q.toLowerCase()) || f.facEmail.toLowerCase().includes(q.toLowerCase())
  )
  const selected = facultyList.find(f => f.facEmail === value)
  return (
    <div className="relative">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full text-left border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white hover:border-indigo-400 transition-colors flex items-center justify-between gap-2"
      >
        <span className={selected ? 'text-gray-900' : 'text-gray-400'}>
          {selected ? selected.facName : 'Select faculty…'}
        </span>
        {selected && (
          <span
            onClick={e => { e.stopPropagation(); onChange('') }}
            className="text-gray-400 hover:text-red-500 text-base leading-none flex-shrink-0"
            title="Clear"
          >×</span>
        )}
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg">
          <div className="p-2 border-b border-gray-100">
            <input
              autoFocus
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-sm text-gray-400 text-center">No results</p>
            ) : filtered.map(f => (
              <button
                key={f.facEmail}
                type="button"
                onClick={() => { onChange(f.facEmail); setOpen(false); setQ('') }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 transition-colors ${value === f.facEmail ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700'}`}
              >
                <div className="font-medium">{f.facName}</div>
                <div className="text-xs text-gray-400">{f.facEmail}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Main Component ── */
export default function ManageDepartments() {
  const { userRoles } = useAuth()

  /* access guard */
  if (!hasCampusAccess(userRoles)) {
    return (
      <div className="p-8 text-center text-red-600 font-semibold">
        Access Denied. Campus-level roles only.
      </div>
    )
  }

  const [depts, setDepts]       = useState([])
  const [faculty, setFaculty]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')

  /* modal state */
  const [modal, setModal]       = useState(null)   // null | 'add' | 'edit' | 'assign' | 'view'
  const [target, setTarget]     = useState(null)   // dept being operated on
  const [form, setForm]         = useState(BLANK_FORM)
  const [saving, setSaving]     = useState(false)

  /* assignment state — map of roleKey → facEmail */
  const [assignments, setAssignments] = useState({})

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    try {
      const [dSnap, fSnap] = await Promise.all([
        getDocs(collection(db, 'departments')),
        getDocs(collection(db, 'faculty')),
      ])
      const deptList = dSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => a.deptName?.localeCompare(b.deptName))
      const facList  = fSnap.docs.map(d => d.data())
        .filter(f => f.facStatus === 'Active' || !f.facStatus)
        .sort((a, b) => a.facName?.localeCompare(b.facName))
      setDepts(deptList)
      setFaculty(facList)
    } catch (e) { console.error(e); setError('Failed to load data.') }
    finally { setLoading(false) }
  }

  function flash(msg, isErr = false) {
    if (isErr) setError(msg); else setSuccess(msg)
    setTimeout(() => { setError(''); setSuccess('') }, 5000)
  }

  function openAdd() {
    setForm(BLANK_FORM)
    setModal('add')
    setTarget(null)
  }

  function openEdit(dept) {
    setForm({
      deptCode:      dept.deptCode || dept.id,
      deptName:      dept.deptName || '',
      deptShortName: dept.deptShortName || '',
      campus:        dept.campus || '',
      established:   dept.established || '',
    })
    setModal('edit')
    setTarget(dept)
  }

  function openAssign(dept) {
    setTarget(dept)
    setAssignments(dept.assignments || {})
    setModal('assign')
  }

  function openView(dept) {
    setTarget(dept)
    setModal('view')
  }

  async function handleSaveDept(e) {
    e.preventDefault()
    if (!form.deptCode.trim() || !form.deptName.trim()) {
      return flash('Dept Code and Name are required.', true)
    }
    setSaving(true)
    try {
      const ref = doc(db, 'departments', form.deptCode.trim().toUpperCase())
      await setDoc(ref, {
        deptCode:      form.deptCode.trim().toUpperCase(),
        deptName:      form.deptName.trim(),
        deptShortName: form.deptShortName.trim(),
        campus:        form.campus.trim(),
        established:   form.established.trim(),
        updatedAt:     Timestamp.now(),
        ...(modal === 'add' ? { createdAt: Timestamp.now() } : {}),
      }, { merge: true })
      flash(modal === 'add' ? 'Department added.' : 'Department updated.')
      setModal(null)
      fetchAll()
    } catch (e) { console.error(e); flash('Save failed.', true) }
    finally { setSaving(false) }
  }

  async function handleDelete(dept) {
    if (!window.confirm(`Delete "${dept.deptName}"? This cannot be undone.`)) return
    try {
      await deleteDoc(doc(db, 'departments', dept.id))
      flash('Department deleted.')
      fetchAll()
    } catch (e) { console.error(e); flash('Delete failed.', true) }
  }

  async function handleSaveAssignments(e) {
    e.preventDefault()
    setSaving(true)
    try {
      /* 1. Update dept doc with assignments map */
      await updateDoc(doc(db, 'departments', target.id), { assignments, updatedAt: Timestamp.now() })

      /* 2. Sync roles on users docs:
            - Remove old role from previous assignee (if changed)
            - Add role to new assignee */
      const prev = target.assignments || {}
      for (const { key } of ASSIGNABLE_ROLES) {
        const oldEmail = prev[key]
        const newEmail = assignments[key]
        if (oldEmail && oldEmail !== newEmail) {
          // fetch old user doc and remove this role
          const oldSnap = await getDocs(query(collection(db, 'users'), where('facEmail', '==', oldEmail)))
          for (const ud of oldSnap.docs) {
            const roles = (ud.data().roles || []).filter(r => r !== key)
            await updateDoc(ud.ref, { roles })
          }
        }
        if (newEmail && newEmail !== oldEmail) {
          // fetch new user doc and add this role
          const newSnap = await getDocs(query(collection(db, 'users'), where('facEmail', '==', newEmail)))
          for (const ud of newSnap.docs) {
            const roles = [...new Set([...(ud.data().roles || []), key])]
            await updateDoc(ud.ref, { roles, deptCode: target.id })
          }
        }
      }
      flash('Assignments saved & roles updated.')
      setModal(null)
      fetchAll()
    } catch (e) { console.error(e); flash('Failed to save assignments.', true) }
    finally { setSaving(false) }
  }

  function getAssigneeName(dept, roleKey) {
    const email = dept.assignments?.[roleKey]
    if (!email) return null
    return faculty.find(f => f.facEmail === email)?.facName || email
  }

  /* ── Render ── */
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="mb-2">
        <a href="/" className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
          <span>&larr;</span> Back
        </a>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Departments</h1>
          <p className="text-sm text-gray-500 mt-1">Add, edit, and assign key roles for each department.</p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Department
        </button>
      </div>

      {error   && <div className="p-4 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">{error}</div>}
      {success && <div className="p-4 rounded-lg bg-green-50 text-green-700 text-sm border border-green-200">✓ {success}</div>}

      {/* ── Table ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Code', 'Department Name', 'Campus', 'Key Roles', 'Actions'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-gray-400">Loading…</td></tr>
              ) : depts.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-gray-400">No departments yet. Click "Add Department" to create one.</td></tr>
              ) : depts.map(dept => (
                <tr key={dept.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4 font-mono font-semibold text-indigo-700 whitespace-nowrap">{dept.deptCode || dept.id}</td>
                  <td className="px-5 py-4">
                    <div className="font-medium text-gray-900">{dept.deptName}</div>
                    {dept.deptShortName && <div className="text-xs text-gray-400">{dept.deptShortName}</div>}
                  </td>
                  <td className="px-5 py-4 text-gray-500 whitespace-nowrap">{dept.campus || '—'}</td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {ASSIGNABLE_ROLES.map(({ key, label }) => {
                        const name = getAssigneeName(dept, key)
                        return name ? (
                          <span key={key} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                            <span className="text-indigo-400">{label}:</span> {name}
                          </span>
                        ) : null
                      })}
                      {!ASSIGNABLE_ROLES.some(({ key }) => dept.assignments?.[key]) && (
                        <span className="text-xs text-gray-400 italic">No assignments</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <button onClick={() => openView(dept)}   className="text-xs font-medium text-gray-600 hover:text-indigo-700 px-2 py-1 rounded hover:bg-indigo-50 transition-colors">View</button>
                      <button onClick={() => openEdit(dept)}   className="text-xs font-medium text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded hover:bg-indigo-50 transition-colors">Edit</button>
                      <button onClick={() => openAssign(dept)} className="text-xs font-medium text-green-600 hover:text-green-800 px-2 py-1 rounded hover:bg-green-50 transition-colors">Assign Roles</button>
                      <button onClick={() => handleDelete(dept)} className="text-xs font-medium text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition-colors">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add / Edit Modal ── */}
      {(modal === 'add' || modal === 'edit') && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">{modal === 'add' ? 'Add Department' : 'Edit Department'}</h2>
              <button onClick={() => setModal(null)} className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 text-xl font-light">×</button>
            </div>
            <form onSubmit={handleSaveDept} className="px-6 py-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dept Code *</label>
                  <input
                    required value={form.deptCode}
                    onChange={e => setForm(f => ({ ...f, deptCode: e.target.value.toUpperCase() }))}
                    disabled={modal === 'edit'}
                    placeholder="e.g. CS-BYC"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-gray-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Short Name</label>
                  <input
                    value={form.deptShortName}
                    onChange={e => setForm(f => ({ ...f, deptShortName: e.target.value }))}
                    placeholder="e.g. CS"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department Name *</label>
                <input
                  required value={form.deptName}
                  onChange={e => setForm(f => ({ ...f, deptName: e.target.value }))}
                  placeholder="Department of Computer Science - BYC"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Campus</label>
                  <input
                    value={form.campus}
                    onChange={e => setForm(f => ({ ...f, campus: e.target.value }))}
                    placeholder="e.g. Yeshwanthpur"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Established</label>
                  <input
                    value={form.established}
                    onChange={e => setForm(f => ({ ...f, established: e.target.value }))}
                    placeholder="e.g. 2010"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setModal(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-60">
                  {saving ? 'Saving…' : modal === 'add' ? 'Create Department' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Assign Roles Modal ── */}
      {modal === 'assign' && target && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Assign Roles</h2>
                <p className="text-sm text-gray-500 mt-0.5">{target.deptName}</p>
              </div>
              <button onClick={() => setModal(null)} className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 text-xl font-light">×</button>
            </div>
            <form onSubmit={handleSaveAssignments} className="px-6 py-6 space-y-5">
              <p className="text-xs text-gray-500 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Selecting a faculty member will <strong>add</strong> that role to their user account. Clearing a selection will <strong>remove</strong> the role from the previous assignee.
              </p>
              {ASSIGNABLE_ROLES.map(({ key, label }) => (
                <FacultyPicker
                  key={key}
                  label={label}
                  value={assignments[key] || ''}
                  onChange={email => setAssignments(a => ({ ...a, [key]: email }))}
                  facultyList={faculty.filter(f => f.deptCode === target.id || f.deptCode === target.deptCode)}
                />
              ))}
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setModal(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-60">
                  {saving ? 'Saving…' : 'Save Assignments'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── View Modal ── */}
      {modal === 'view' && target && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Department Details</h2>
              <button onClick={() => setModal(null)} className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 text-xl font-light">×</button>
            </div>
            <div className="px-6 py-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-xs font-semibold text-gray-400 uppercase">Code</p><p className="font-mono font-bold text-indigo-700 mt-0.5">{target.deptCode || target.id}</p></div>
                <div><p className="text-xs font-semibold text-gray-400 uppercase">Short Name</p><p className="text-gray-700 mt-0.5">{target.deptShortName || '—'}</p></div>
                <div className="col-span-2"><p className="text-xs font-semibold text-gray-400 uppercase">Full Name</p><p className="text-gray-900 font-medium mt-0.5">{target.deptName}</p></div>
                <div><p className="text-xs font-semibold text-gray-400 uppercase">Campus</p><p className="text-gray-700 mt-0.5">{target.campus || '—'}</p></div>
                <div><p className="text-xs font-semibold text-gray-400 uppercase">Established</p><p className="text-gray-700 mt-0.5">{target.established || '—'}</p></div>
              </div>
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-semibold text-gray-400 uppercase mb-3">Key Role Assignments</p>
                <div className="space-y-2">
                  {ASSIGNABLE_ROLES.map(({ key, label }) => {
                    const email = target.assignments?.[key]
                    const fac = email ? faculty.find(f => f.facEmail === email) : null
                    return (
                      <div key={key} className="flex items-center gap-3 text-sm">
                        <span className="w-28 text-xs font-medium text-gray-500 flex-shrink-0">{label}</span>
                        {fac ? (
                          <span className="text-gray-900">{fac.facName} <span className="text-gray-400 text-xs">({fac.facEmail})</span></span>
                        ) : (
                          <span className="text-gray-400 italic text-xs">Not assigned</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button onClick={() => { setModal(null); openAssign(target) }} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700">Assign Roles</button>
                <button onClick={() => { setModal(null); openEdit(target) }} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">Edit</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
