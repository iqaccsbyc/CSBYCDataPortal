import DateInput from '../../components/DateInput'
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import * as XLSX from 'xlsx'
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, getDocs, deleteDoc } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../../context/AuthContext'
import { DRIVE_FOLDER_IDS, APPS_SCRIPT_URL } from '../activity/constants'
import { deriveAcademicYear, getMonthStr } from '../../utils/academicYear'
const ACHIEVEMENT_TYPES = [
  'Best Paper Award', 'First Prize', 'Second Prize', 'Third Prize',
  'Consolation Prize', 'Special Recognition', 'Fellowship', 'Scholarship',
  'Medal', 'Certificate of Excellence', 'Rank / Topper',
  'Sports Achievement', 'Cultural Achievement', 'Other'
]

const LEVELS = ['International', 'National', 'State', 'Institution', 'University']

function Tabs({ tabs, active, onChange }) {
  return (
    <div className="border-b border-gray-200 mb-6">
      <nav className="flex gap-6">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${active === t.id
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

function StatusBadge({ status }) {
  if (status === 'Accepted') return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-md">Accepted</span>
  if (status === 'Revision Needed') return <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-800 rounded-md">Revision Needed</span>
  return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-md">Pending</span>
}

function FileUploadField({ label, folderId, value, onChange, filePrefix, fileType, allowLink }) {
  const [uploading, setUploading] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState('')
  const [isLinkMode, setIsLinkMode] = useState(false)
  const [linkInput, setLinkInput] = useState('')

  async function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file) return

    if (file.size > 15 * 1024 * 1024) {
      setError('File is too large. Maximum size is 15MB.')
      return
    }

    setUploading(true)
    setError('')

    try {
      const reader = new FileReader()
      reader.onload = async (event) => {
        try {
          const base64Data = event.target.result.split(',')[1]
          const filename = `${filePrefix}_${fileType}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`

          const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({
              folderId: folderId,
              filename: filename,
              mimeType: file.type || 'application/octet-stream',
              fileData: base64Data
            }),
            headers: {
              'Content-Type': 'text/plain;charset=utf-8',
            }
          })

          const result = await response.json()
          if (result.success) {
            onChange(result.fileUrl)
          } else {
            setError(result.error || 'Upload failed')
          }
        } catch (err) {
          setError('Failed to process file')
        } finally {
          setUploading(false)
        }
      }
      reader.onerror = () => {
        setError('Failed to read file')
        setUploading(false)
      }
      reader.readAsDataURL(file)
    } catch (err) {
      setError('Unexpected error occurred')
      setUploading(false)
    }
  }

  async function handleRemove() {
    setRemoving(true)
    setError('')
    try {
      const match = value.match(/\/d\/([a-zA-Z0-9_-]+)/)
      if (match && match[1]) {
        const fileId = match[1]
        await fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          body: JSON.stringify({ action: 'delete', fileId: fileId }),
          headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        })
      }
    } catch (err) {
      console.error('Failed to delete file from Drive:', err)
    } finally {
      setRemoving(false)
      onChange('')
    }
  }

  const isUploaded = !!value

  return (
    <div className={`flex flex-col gap-2 p-4 rounded-xl border transition-colors ${isUploaded ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
      }`}>
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-800">{label}</p>
          {error ? (
            <p className="text-xs text-red-500 mt-0.5 truncate">{error}</p>
          ) : isUploaded ? (
            <p className="text-xs text-green-600 mt-0.5 truncate">
              <a href={value} target="_blank" rel="noopener noreferrer" className="hover:underline">View Uploaded File/Link ↗</a>
            </p>
          ) : (
            <p className="text-xs text-gray-400 mt-0.5 truncate">Select a file {allowLink && 'or paste a link'}</p>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {uploading ? (
            <span className="text-sm font-medium text-indigo-600 animate-pulse">Uploading...</span>
          ) : isUploaded ? (
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-green-700">Saved ✓</span>
              <button
                type="button"
                onClick={handleRemove}
                disabled={removing}
                className="text-xs text-red-600 hover:text-red-800 ml-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {removing ? 'Removing...' : 'Remove'}
              </button>
            </div>
          ) : !isLinkMode ? (
            <div className="flex items-center gap-2">
              {allowLink && (
                <button
                  type="button"
                  onClick={() => setIsLinkMode(true)}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:underline px-2"
                >
                  Paste Link Instead
                </button>
              )}
              <label className="px-4 py-2 text-sm font-medium text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-200 rounded-lg transition-colors cursor-pointer shadow-sm whitespace-nowrap">
                Browse File
                <input type="file" onChange={handleFileChange} className="hidden" />
              </label>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsLinkMode(false)}
              className="text-xs font-medium text-gray-500 hover:text-gray-700 hover:underline px-2"
            >
              Cancel Link
            </button>
          )}
        </div>
      </div>

      {allowLink && isLinkMode && !isUploaded && (
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200">
          <input
            type="url"
            value={linkInput}
            onChange={e => setLinkInput(e.target.value)}
            placeholder="Paste Drive or external link here..."
            className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-colors"
          />
          <button
            type="button"
            onClick={() => {
              if (linkInput.trim()) {
                onChange(linkInput.trim())
                setLinkInput('')
                setIsLinkMode(false)
              }
            }}
            disabled={!linkInput.trim()}
            className="px-4 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50"
          >
            Save Link
          </button>
        </div>
      )}
    </div>
  )
}

export default function Achievements() {
  const { user, userRoles, facId } = useAuth()
  const [activeTab, setActiveTab] = useState('new')
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  const [loggedInFacName, setLoggedInFacName] = useState('')
  const [viewModalData, setViewModalData] = useState(null)

  // Filters
  const [filterFac, setFilterFac] = useState('')
  const [filterFor, setFilterFor] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterLevel, setFilterLevel] = useState('')
  const [filterMonth, setFilterMonth] = useState('')

  const isElevated = ['admin', 'iqac', 'hod', 'adminassist', 'assochod'].some(r => userRoles?.includes(r))

  const initialForm = {
    id: null,
    achievementFor: 'Faculty',
    facName: '', facEmail: '', designation: '', employeeId: '',
    studentName: '', classProgramme: '', registerNumber: '', studentEmail: '',
    date: '', achievementDate: '', achievementType: '', eventName: '',
    honourPosition: '', organizedBy: '', level: '',
    proofLink: '', proofAccepted: 'Pending', revisionComments: ''
  }
  const [formData, setFormData] = useState(initialForm)
  const [facProfile, setFacProfile] = useState(null)

  const handleEdit = (entry) => {
    setFormData({ ...initialForm, ...entry })
    setActiveTab('new')
  }

  useEffect(() => {
    if (!facId) return
    const getMyData = async () => {
      const snap = await getDocs(query(collection(db, 'faculty'), where('facEmail', '==', user.email)))
      if (!snap.empty) {
        const data = snap.docs[0].data()
        setFacProfile(data)
        const name = data.facName || ''
        setLoggedInFacName(name)
        setFormData(prev => ({ 
          ...prev, 
          facName: name, 
          facEmail: user.email,
          designation: data.designation || data.facDesignation || '',
          employeeId: data.empId || data.employeeId || data.facEmpId || ''
        }))
      }
    }
    getMyData()
  }, [facId, user.email])

  useEffect(() => {
    if (!user || !userRoles) return
    let q
    if (isElevated) {
      q = collection(db, 'achievements')
    } else {
      q = query(collection(db, 'achievements'), where('submittedBy', '==', user.email))
    }

    const unsub = onSnapshot(q, snap => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      docs.sort((a, b) => (b.submittedAt?.seconds || 0) - (a.submittedAt?.seconds || 0))
      setEntries(docs)
      setLoading(false)
    }, err => {
      console.error(err)
      setLoading(false)
    })
    return unsub
  }, [user, userRoles, isElevated])

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => {
      const next = { ...prev, [name]: type === 'checkbox' ? checked : value }
      
      // If switching to Faculty, ensure fac details are populated
      if (name === 'achievementFor' && value === 'Faculty' && facProfile) {
        next.facName = facProfile.facName || ''
        next.facEmail = user.email
        next.designation = facProfile.designation || facProfile.facDesignation || ''
        next.employeeId = facProfile.empId || facProfile.employeeId || facProfile.facEmpId || ''
      }
      return next
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    setSubmitLoading(true)
    try {
      const payload = {
        ...formData,
        submittedBy: formData.id ? formData.submittedBy : (user?.email || 'unknown'),
        submittedByName: formData.id ? formData.submittedByName : (loggedInFacName || user?.email || 'unknown'),
        academicYear: deriveAcademicYear(formData.date),
        month: getMonthStr(formData.date)
      }

      delete payload.id;
      Object.keys(payload).forEach(key => {
        if (payload[key] === undefined) delete payload[key];
      });

      if (!formData.id) {
        payload.submittedAt = serverTimestamp()
        if (!isElevated) {
          payload.proofAccepted = 'Pending'
          payload.revisionComments = ''
        }
        await addDoc(collection(db, 'achievements'), payload)
        setSuccessMsg('Achievement entry submitted successfully!')
      } else {
        const docId = formData.id
        await updateDoc(doc(db, 'achievements', docId), payload)
        setSuccessMsg('Achievement entry updated successfully!')
      }

      setFormData({ 
        ...initialForm, 
        facName: loggedInFacName, 
        facEmail: user.email,
        designation: facProfile?.designation || facProfile?.facDesignation || '',
        employeeId: facProfile?.empId || facProfile?.employeeId || facProfile?.facEmpId || ''
      })
      setActiveTab('entries')
      setTimeout(() => setSuccessMsg(''), 5000)
    } catch (err) {
      console.error(err)
      alert("Error submitting entry: " + err.message)
    } finally {
      setSubmitLoading(false)
    }
  }

  const updateProofStatus = async (id, status) => {
    const comments = status === 'Revision Needed' ? prompt("Enter revision comments:") : ''
    if (status === 'Revision Needed' && comments === null) return

    try {
      await updateDoc(doc(db, 'achievements', id), {
        proofAccepted: status,
        revisionComments: comments || ''
      })
    } catch (err) {
      console.error(err)
      alert("Error updating status")
    }
  }

  const handleDeleteEntry = async (entry) => {
    if (!window.confirm(`Are you sure you want to delete this entry?`)) return

    try {
      if (entry.proofLink) {
        const match = entry.proofLink.match(/\/d\/([a-zA-Z0-9_-]+)/)
        if (match && match[1]) {
          const fileId = match[1]
          await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'delete', fileId: fileId }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
          }).catch(console.error)
        }
      }
      await deleteDoc(doc(db, 'achievements', entry.id))
      setSuccessMsg('Achievement deleted successfully.')
      setTimeout(() => setSuccessMsg(''), 5000)
    } catch (err) {
      console.error('Error deleting entry:', err)
      alert("Error deleting entry: " + err.message)
    }
  }

  const handleExport = () => {
    if (filteredEntries.length === 0) {
      alert("No entries to export.")
      return
    }

    const exportData = filteredEntries.map((e, index) => ({
      'S.No': index + 1,
      'Submitted By': e.submittedByName || '-',
      'Month': e.month || '-',
      'Achievement For': e.achievementFor || '-',
      'Name': e.achievementFor === 'Faculty' ? e.facName : e.studentName,
      'Designation / Class': e.achievementFor === 'Faculty' ? e.designation : e.classProgramme,
      'Employee ID / Reg No': e.achievementFor === 'Faculty' ? e.employeeId : e.registerNumber,
      'Email': e.achievementFor === 'Faculty' ? e.facEmail : e.studentEmail,
      'Date of Achievement': e.achievementDate || '-',
      'Achievement Type': e.achievementType || '-',
      'Event / Competition': e.eventName || '-',
      'Honour / Position': e.honourPosition || '-',
      'Organised By': e.organizedBy || '-',
      'Level': e.level || '-',
      'Proof Link': e.proofLink || '-',
      'Proof Status': e.proofAccepted || '-'
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Achievements")
    XLSX.writeFile(wb, `Achievements_Export_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const tabs = [
    { id: 'new', label: formData.id ? 'Edit Entry' : 'New Entry' },
    { id: 'entries', label: `${isElevated ? 'All Entries' : 'My Entries'} (${entries.length})` },
  ]

  const filteredEntries = entries.filter(e => {
    if (filterFac && !e.submittedByName.toLowerCase().includes(filterFac.toLowerCase())) return false
    if (filterFor && e.achievementFor !== filterFor) return false
    if (filterType && e.achievementType !== filterType) return false
    if (filterLevel && e.level !== filterLevel) return false
    if (filterMonth && e.month !== filterMonth) return false
    return true
  })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-4">
        <Link to="/" className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
          <span>&larr;</span> Back to Dashboard
        </Link>
      </div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Achievements</h1>
        <p className="text-sm text-gray-500 mt-1">Manage awards and recognitions for faculty and students.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
        <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

        {successMsg && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800">
            ✓ {successMsg}
          </div>
        )}

        {activeTab === 'new' && (
          <form onSubmit={handleSubmit} className="space-y-10">
            {/* SECTION 1 */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Section 1: Whose Achievement?</h2>
              <div className="mb-6">
                <div className="flex gap-6">
                  <label className="inline-flex items-center cursor-pointer">
                    <input type="radio" name="achievementFor" value="Faculty" checked={formData.achievementFor === 'Faculty'} onChange={handleInputChange} className="text-indigo-600 focus:ring-indigo-500 h-4 w-4" />
                    <span className="ml-2 text-sm font-medium text-gray-700">Faculty</span>
                  </label>
                  <label className="inline-flex items-center cursor-pointer">
                    <input type="radio" name="achievementFor" value="Student" checked={formData.achievementFor === 'Student'} onChange={handleInputChange} className="text-indigo-600 focus:ring-indigo-500 h-4 w-4" />
                    <span className="ml-2 text-sm font-medium text-gray-700">Student</span>
                  </label>
                </div>
              </div>

              {formData.achievementFor === 'Faculty' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Faculty Name <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.facName} readOnly className="w-full rounded-lg border-gray-300 shadow-sm bg-gray-100 text-gray-600 text-sm py-2 px-3 border cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                    <input type="text" value={formData.designation} readOnly className="w-full rounded-lg border-gray-300 shadow-sm bg-gray-100 text-gray-600 text-sm py-2 px-3 border cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                    <input type="text" value={formData.employeeId} readOnly className="w-full rounded-lg border-gray-300 shadow-sm bg-gray-100 text-gray-600 text-sm py-2 px-3 border cursor-not-allowed" />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-blue-50 p-4 rounded-xl border border-blue-100">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Student Name <span className="text-red-500">*</span></label>
                    <input type="text" name="studentName" value={formData.studentName} onChange={handleInputChange} required className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3 border" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Class / Programme <span className="text-red-500">*</span></label>
                    <input type="text" name="classProgramme" value={formData.classProgramme} onChange={handleInputChange} required placeholder="e.g. 5MDS A" className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3 border" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Register Number <span className="text-red-500">*</span></label>
                    <input type="text" name="registerNumber" value={formData.registerNumber} onChange={handleInputChange} required className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3 border" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Student Email</label>
                    <input type="email" name="studentEmail" value={formData.studentEmail} onChange={handleInputChange} className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3 border" />
                  </div>
                </div>
              )}
            </section>

            {/* SECTION 2 */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Section 2: Achievement Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date <span className="text-red-500">*</span></label>
                  <DateInput  name="date" value={formData.date} onChange={handleInputChange} required className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3 border" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date(s) of Achievement <span className="text-red-500">*</span></label>
                  <DateInput  name="achievementDate" value={formData.achievementDate} onChange={handleInputChange} required className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3 border" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Achievement Type <span className="text-red-500">*</span></label>
                  <select name="achievementType" value={formData.achievementType} onChange={handleInputChange} required className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3 border">
                    <option value="">Select Type</option>
                    {ACHIEVEMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Level <span className="text-red-500">*</span></label>
                  <select name="level" value={formData.level} onChange={handleInputChange} required className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3 border">
                    <option value="">Select Level</option>
                    {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Event / Competition Name <span className="text-red-500">*</span></label>
                  <input type="text" name="eventName" value={formData.eventName} onChange={handleInputChange} required placeholder="e.g. National Level Hackathon" className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3 border" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Honour / Position received <span className="text-red-500">*</span></label>
                  <input type="text" name="honourPosition" value={formData.honourPosition} onChange={handleInputChange} required placeholder="e.g. First Prize, Gold Medal" className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3 border" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Organised by <span className="text-red-500">*</span></label>
                  <input type="text" name="organizedBy" value={formData.organizedBy} onChange={handleInputChange} required placeholder="Institution or body that gave the award" className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3 border" />
                </div>
              </div>
            </section>

            {/* SECTION 3 */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Section 3: Documentation</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <FileUploadField
                    label="Proof Document"
                    folderId={DRIVE_FOLDER_IDS.achievement}
                    value={formData.proofLink}
                    onChange={(val) => setFormData(prev => ({ ...prev, proofLink: val }))}
                    filePrefix={formData.id || user?.email?.split('@')[0] || 'achieve'}
                    fileType="proof"
                    allowLink={true}
                  />
                </div>
              </div>
            </section>

            <div className="pt-4 flex justify-end">
              <button type="submit" disabled={submitLoading} className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg shadow hover:bg-indigo-700 disabled:opacity-50">
                {submitLoading ? 'Submitting...' : 'Submit Entry'}
              </button>
            </div>
          </form>
        )}

        {activeTab === 'entries' && (
          <div>
            <div className="mb-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold text-gray-700">Filter Entries</h3>
                <button onClick={handleExport} className="px-4 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors shadow-sm flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                  Export .xlsx
                </button>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 grid grid-cols-1 md:grid-cols-5 gap-4">
                {isElevated && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Submitted By</label>
                    <input type="text" placeholder="Search name..." value={filterFac} onChange={e => setFilterFac(e.target.value)} className="w-full text-sm rounded-md border-gray-300 py-1.5 px-3 border" />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">For</label>
                  <select value={filterFor} onChange={e => setFilterFor(e.target.value)} className="w-full text-sm rounded-md border-gray-300 py-1.5 px-3 border">
                    <option value="">All</option>
                    <option value="Faculty">Faculty</option>
                    <option value="Student">Student</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Type</label>
                  <select value={filterType} onChange={e => setFilterType(e.target.value)} className="w-full text-sm rounded-md border-gray-300 py-1.5 px-3 border">
                    <option value="">All Types</option>
                    {ACHIEVEMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Level</label>
                  <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)} className="w-full text-sm rounded-md border-gray-300 py-1.5 px-3 border">
                    <option value="">All Levels</option>
                    {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Month</label>
                  <input type="text" placeholder="e.g. Jun-26" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="w-full text-sm rounded-md border-gray-300 py-1.5 px-3 border" />
                </div>
              </div>
            </div>

            {loading ? (
              <p className="text-gray-400 text-sm text-center py-12">Loading entries...</p>
            ) : filteredEntries.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <p className="text-lg">No entries found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="min-w-full text-sm text-left">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="py-3 px-4 font-semibold text-gray-500 whitespace-nowrap">Month</th>
                      <th className="py-3 px-4 font-semibold text-gray-500">For</th>
                      <th className="py-3 px-4 font-semibold text-gray-500">Name</th>
                      <th className="py-3 px-4 font-semibold text-gray-500">Achievement Type</th>
                      <th className="py-3 px-4 font-semibold text-gray-500">Event</th>
                      <th className="py-3 px-4 font-semibold text-gray-500">Level</th>
                      <th className="py-3 px-4 font-semibold text-gray-500">Proof Status</th>
                      <th className="py-3 px-4 font-semibold text-gray-500 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredEntries.map(e => (
                      <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4 text-gray-600 whitespace-nowrap">{e.month}</td>
                        <td className="py-3 px-4 text-gray-600">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${e.achievementFor === 'Faculty' ? 'bg-indigo-50 text-indigo-700' : 'bg-blue-50 text-blue-700'}`}>
                            {e.achievementFor}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-gray-900 whitespace-nowrap">
                          {e.achievementFor === 'Faculty' ? e.facName : e.studentName}
                        </td>
                        <td className="py-3 px-4 text-gray-600">{e.achievementType}</td>
                        <td className="py-3 px-4 text-gray-900 max-w-xs truncate" title={e.eventName}>
                          {e.eventName?.length > 40 ? e.eventName.substring(0, 40) + '...' : e.eventName}
                        </td>
                        <td className="py-3 px-4 text-gray-600">{e.level}</td>
                        <td className="py-3 px-4">
                          <StatusBadge status={e.proofAccepted} />
                        </td>
                        <td className="py-3 px-4 flex justify-end gap-2">
                          <button onClick={() => setViewModalData(e)} className="px-2 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded">View</button>
                          {!isElevated && e.proofAccepted === 'Pending' && (
                            <>
                              <button onClick={() => handleEdit(e)} className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded">Update</button>
                              <button onClick={() => handleDeleteEntry(e)} className="px-2 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded">Delete</button>
                            </>
                          )}
                          {isElevated && (
                            <>
                              <button onClick={() => updateProofStatus(e.id, 'Accepted')} className="px-2 py-1 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded">Accept</button>
                              <button onClick={() => updateProofStatus(e.id, 'Revision Needed')} className="px-2 py-1 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded">Revise</button>
                              <button onClick={() => handleEdit(e)} className="px-2 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded">Update</button>
                              <button onClick={() => handleDeleteEntry(e)} className="px-2 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded">Delete</button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* VIEW MODAL */}
      {viewModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Achievement Details</h3>
              <button onClick={() => setViewModalData(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Whose Achievement?</h4>
                {viewModalData.achievementFor === 'Faculty' ? (
                  <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-4 rounded-lg">
                    <div><span className="text-gray-500">For:</span> <p className="font-medium text-indigo-600">Faculty</p></div>
                    <div><span className="text-gray-500">Name:</span> <p className="font-medium">{viewModalData.facName}</p></div>
                    <div><span className="text-gray-500">Designation:</span> <p className="font-medium">{viewModalData.designation}</p></div>
                    <div><span className="text-gray-500">Employee ID:</span> <p className="font-medium">{viewModalData.employeeId}</p></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 text-sm bg-blue-50 p-4 rounded-lg">
                    <div><span className="text-gray-500">For:</span> <p className="font-medium text-blue-600">Student</p></div>
                    <div><span className="text-gray-500">Name:</span> <p className="font-medium">{viewModalData.studentName}</p></div>
                    <div><span className="text-gray-500">Class/Prog:</span> <p className="font-medium">{viewModalData.classProgramme}</p></div>
                    <div><span className="text-gray-500">Register No:</span> <p className="font-medium">{viewModalData.registerNumber}</p></div>
                    {viewModalData.studentEmail && <div className="col-span-2"><span className="text-gray-500">Email:</span> <p className="font-medium">{viewModalData.studentEmail}</p></div>}
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Achievement Details</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-gray-500">Type:</span> <p className="font-medium">{viewModalData.achievementType}</p></div>
                  <div><span className="text-gray-500">Level:</span> <p className="font-medium">{viewModalData.level}</p></div>
                  <div className="col-span-2"><span className="text-gray-500">Event Name:</span> <p className="font-medium">{viewModalData.eventName}</p></div>
                  <div className="col-span-2"><span className="text-gray-500">Honour/Position:</span> <p className="font-medium">{viewModalData.honourPosition}</p></div>
                  <div className="col-span-2"><span className="text-gray-500">Organised By:</span> <p className="font-medium">{viewModalData.organizedBy}</p></div>
                  <div><span className="text-gray-500">Month:</span> <p className="font-medium">{viewModalData.month}</p></div>
                  <div><span className="text-gray-500">Date:</span> <p className="font-medium">{viewModalData.achievementDate}</p></div>
                </div>
              </div>

              {viewModalData.proofLink && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Proof Document</h4>
                  <a href={viewModalData.proofLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                    View Document
                  </a>
                </div>
              )}

              {viewModalData.revisionComments && (
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <h4 className="text-sm font-semibold text-amber-800 mb-1">Revision Comments</h4>
                  <p className="text-sm text-amber-900">{viewModalData.revisionComments}</p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500">
                  Submitted by {viewModalData.submittedByName} on {viewModalData.submittedAt?.toDate ? viewModalData.submittedAt.toDate().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Unknown'}
                </div>
                <StatusBadge status={viewModalData.proofAccepted} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
