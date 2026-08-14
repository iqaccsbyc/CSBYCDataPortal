import DateInput from '../../components/DateInput'
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import * as XLSX from 'xlsx'
import { collection, query, where, serverTimestamp, doc, deleteDoc, or } from 'firebase/firestore'
import { addDocEncrypted as addDoc, updateDocEncrypted as updateDoc, getDocsEncrypted as getDocs, onSnapshotEncrypted as onSnapshot } from '../../firebase/encryptedStore'
import { db } from '../../firebase/config'
import { useAuth } from '../../context/AuthContext'
import { DRIVE_FOLDER_IDS, APPS_SCRIPT_URL } from '../activity/constants'

import { deriveAcademicYear } from '../../utils/academicYear'
const PROJECT_TYPES = ['Internal (Seed-Money)', 'External']
const PROJECT_STATUSES = ['On-going', 'Completed']
const SDG_OPTIONS = Array.from({ length: 17 }, (_, i) => `SDG-${i + 1}`)

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
    <div className={`flex flex-col gap-2 p-4 rounded-xl border transition-colors ${
      isUploaded ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
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

export default function ProjectEntry() {
  const { user, userRoles, facId } = useAuth()
  const [activeTab, setActiveTab] = useState('new')
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  const [activeFaculty, setActiveFaculty] = useState([])
  const [loggedInFacName, setLoggedInFacName] = useState('')
  const [authorSuggestions, setAuthorSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  // View Modal State
  const [viewModalData, setViewModalData] = useState(null)

  // Admin Filters
  const [filterFac, setFilterFac] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterApprovalStatus, setFilterApprovalStatus] = useState('')

  const isElevated = ['admin', 'iqac', 'hod', 'adminassist', 'assochod'].some(r => userRoles?.includes(r))

  // Form State
  const initialForm = {
    id: null,
    projectType: 'Internal (Seed-Money)', 
    title: '',
    principalInvestigator: '', 
    coInvestigatorsList: '', 
    csbycCoInvestigators: [],
    fundingAgency: 'CHRIST University',
    amountSanctioned: '', 
    refNo: '', 
    startDate: '', 
    endDate: '',
    projectStatus: 'On-going',
    sdgsLinked: [], 
    proofLink: '', 
    proofAccepted: 'Pending', 
    revisionComments: ''
  }
  const [formData, setFormData] = useState(initialForm)

  const handleEdit = (entry) => {
    setFormData({ ...initialForm, ...entry })
    setActiveTab('new')
  }

  useEffect(() => {
    // Fetch Active Faculty for dropdown
    const fetchFac = async () => {
      const q = query(collection(db, 'faculty'), where('facStatus', '==', 'Active'))
      const snap = await getDocs(q)
      const list = snap.docs.map(d => ({ id: d.id, name: d.data().facName }))
      setActiveFaculty(list)
    }
    fetchFac()
  }, [])

  useEffect(() => {
    if (!facId) return
    const getMyName = async () => {
      const snap = await getDocs(query(collection(db, 'faculty'), where('facEmail', '==', user.email)))
      if (!snap.empty) {
        const name = snap.docs[0].data().facName
        setLoggedInFacName(name)
        if (!formData.id) {
          setFormData(prev => ({ ...prev, principalInvestigator: name }))
        }
      }
    }
    getMyName()
  }, [facId, user.email])

  useEffect(() => {
    if (!user || !userRoles) return
    let q
    if (isElevated) {
      q = collection(db, 'projects')
    } else {
      if (loggedInFacName) {
        q = query(
          collection(db, 'projects'),
          or(
            where('submittedBy', '==', user.email),
            where('csbycCoInvestigators', 'array-contains', loggedInFacName)
          )
        )
      } else {
        q = query(collection(db, 'projects'), where('submittedBy', '==', user.email))
      }
    }

    const unsub = onSnapshot(q, snap => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      // sort by newest
      docs.sort((a, b) => (b.submittedAt?.seconds || 0) - (a.submittedAt?.seconds || 0))
      setEntries(docs)
      setLoading(false)
    }, err => {
      console.error(err)
      setLoading(false)
    })
    return unsub
  }, [user, userRoles, isElevated, loggedInFacName])

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => {
      const updates = { [name]: type === 'checkbox' ? checked : value }
      
      // Auto-set funding agency for internal projects
      if (name === 'projectType' && value === 'Internal (Seed-Money)') {
        updates.fundingAgency = 'CHRIST University'
      } else if (name === 'projectType' && value === 'External' && prev.fundingAgency === 'CHRIST University') {
        updates.fundingAgency = ''
      }
      
      return { ...prev, ...updates }
    })
  }

  const handleAuthorsChange = (e) => {
    const value = e.target.value
    setFormData(prev => ({ ...prev, coInvestigatorsList: value }))

    const parts = value.split(',')
    const currentTerm = parts[parts.length - 1].trimStart()
    const existingAuthors = parts.slice(0, -1).map(p => p.trim())

    if (currentTerm.length > 0) {
      const matches = activeFaculty.filter(f =>
        f.name.toLowerCase().includes(currentTerm.toLowerCase()) &&
        !existingAuthors.includes(f.name)
      )
      setAuthorSuggestions(matches)
      setShowSuggestions(matches.length > 0)
    } else {
      setShowSuggestions(false)
    }
  }

  const handleSuggestionClick = (name) => {
    const parts = formData.coInvestigatorsList.split(',')
    parts.pop() // remove the currently typed fragment
    const prefix = parts.length > 0 ? parts.join(',') + ', ' : ''
    setFormData(prev => ({ ...prev, coInvestigatorsList: prefix + name + ', ' }))
    setShowSuggestions(false)
  }

  const handleMultiSelect = (name, value) => {
    setFormData(prev => {
      const current = prev[name]
      if (current.includes(value)) {
        return { ...prev, [name]: current.filter(item => item !== value) }
      } else {
        return { ...prev, [name]: [...current, value] }
      }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.projectType || !formData.title || !formData.principalInvestigator || !formData.startDate) {
      alert("Please fill all required fields.")
      return
    }

    setSubmitLoading(true)
    try {
      const authorNames = formData.coInvestigatorsList.split(',').map(s => s.trim()).filter(Boolean)
      const identifiedFaculties = activeFaculty
        .filter(fac => authorNames.includes(fac.name))
        .map(fac => fac.name)

      const payload = {
        ...formData,
        csbycCoInvestigators: identifiedFaculties,
        submittedBy: formData.id ? formData.submittedBy : (user?.email || 'unknown'),
        submittedByName: formData.id ? formData.submittedByName : (loggedInFacName || user?.email || 'unknown'),
        academicYear: deriveAcademicYear(formData.startDate)
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
        await addDoc(collection(db, 'projects'), payload)
        setSuccessMsg('Project entry submitted successfully!')
      } else {
        const docId = formData.id
        await updateDoc(doc(db, 'projects', docId), payload)
        setSuccessMsg('Project entry updated successfully!')
      }

      setFormData(initialForm)
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
      await updateDoc(doc(db, 'projects', id), {
        proofAccepted: status,
        revisionComments: comments || ''
      })
    } catch (err) {
      console.error(err)
      alert("Error updating status")
    }
  }

  const handleDeleteEntry = async (entry) => {
    if (!window.confirm(`Are you sure you want to delete "${entry.title || 'this entry'}"?`)) return
    
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
      await deleteDoc(doc(db, 'projects', entry.id))
      setSuccessMsg('Project deleted successfully.')
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
      'Project Type': e.projectType || '-',
      'Project Title': e.title || '-',
      'Principal Investigator': e.principalInvestigator || '-',
      'Co-Investigators': e.coInvestigatorsList || '-',
      'Funding Agency': e.fundingAgency || '-',
      'Amount Sanctioned': e.amountSanctioned || 0,
      'Ref No': e.refNo || '-',
      'Start Date': e.startDate || '-',
      'End Date': e.endDate || '-',
      'Project Status': e.projectStatus || '-',
      'Academic Year': e.academicYear || '-',
      'SDGs Linked': e.sdgsLinked?.join(', ') || '-',
      'Proof Link': e.proofLink || '-',
      'Approval Status': e.proofAccepted || '-'
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Projects")
    XLSX.writeFile(wb, `Projects_Export_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const tabs = [
    { id: 'new', label: formData.id ? 'Edit Entry' : 'New Entry' },
    { id: 'entries', label: `${isElevated ? 'All Entries' : 'My Entries'} (${entries.length})` },
  ]

  const filteredEntries = entries.filter(e => {
    if (filterFac && !e.submittedByName.toLowerCase().includes(filterFac.toLowerCase())) return false
    if (filterType && e.projectType !== filterType) return false
    if (filterStatus && e.projectStatus !== filterStatus) return false
    if (filterApprovalStatus && e.proofAccepted !== filterApprovalStatus) return false
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
        <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
        <p className="text-sm text-gray-500 mt-1">Manage funded project records.</p>
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
              <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Section 1: Project Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project Type <span className="text-red-500">*</span></label>
                  <select name="projectType" value={formData.projectType} onChange={handleInputChange} required className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3 border">
                    <option value="">Select Type</option>
                    {PROJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project Status <span className="text-red-500">*</span></label>
                  <select name="projectStatus" value={formData.projectStatus} onChange={handleInputChange} required className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3 border">
                    {PROJECT_STATUSES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project Title <span className="text-red-500">*</span></label>
                  <textarea name="title" value={formData.title} onChange={handleInputChange} required rows={2} className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3 border" />
                </div>
              </div>
            </section>

            {/* SECTION 2 */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Section 2: Investigators & Funding</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Principal Investigator <span className="text-red-500">*</span></label>
                  <input type="text" name="principalInvestigator" value={formData.principalInvestigator} onChange={handleInputChange} required className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3 border" />
                </div>
                
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Co-Investigator(s)</label>
                  <p className="text-xs text-gray-500 mb-2">List all Co-Is separated by comma (,). Start typing to select CS-BYC faculty.</p>
                  <textarea name="coInvestigatorsList" value={formData.coInvestigatorsList} onChange={handleAuthorsChange} rows={2} className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3 border" />

                  {showSuggestions && (
                    <div className="absolute z-10 w-full mt-1 bg-white shadow-lg rounded-md border border-gray-200 max-h-48 overflow-y-auto">
                      {authorSuggestions.map(fac => (
                        <div
                          key={fac.id}
                          className="px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer"
                          onClick={() => handleSuggestionClick(fac.name)}
                        >
                          {fac.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Funding Agency <span className="text-red-500">*</span></label>
                  <input type="text" name="fundingAgency" value={formData.fundingAgency} onChange={handleInputChange} required disabled={formData.projectType === 'Internal (Seed-Money)'} className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3 border disabled:bg-gray-100 disabled:text-gray-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount Sanctioned</label>
                  <input type="number" name="amountSanctioned" value={formData.amountSanctioned} onChange={handleInputChange} min="0" className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3 border" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reference No.</label>
                  <input type="text" name="refNo" value={formData.refNo} onChange={handleInputChange} className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3 border" />
                </div>
              </div>
            </section>

            {/* SECTION 3 */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Section 3: Timeline & SDGs</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date <span className="text-red-500">*</span></label>
                  <DateInput  name="startDate" value={formData.startDate} onChange={handleInputChange} required className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3 border" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <DateInput  name="endDate" value={formData.endDate} onChange={handleInputChange} className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3 border" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">SDGs Linked</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {SDG_OPTIONS.map(sdg => (
                      <label key={sdg} className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 p-2 rounded border border-gray-200">
                        <input type="checkbox" checked={formData.sdgsLinked.includes(sdg)} onChange={() => handleMultiSelect('sdgsLinked', sdg)} className="rounded text-indigo-600 focus:ring-indigo-500" />
                        {sdg}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* SECTION 4 */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Section 4: Documentation</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <FileUploadField
                    label="Proof Document"
                    folderId={DRIVE_FOLDER_IDS.project}
                    value={formData.proofLink}
                    onChange={(val) => setFormData(prev => ({ ...prev, proofLink: val }))}
                    filePrefix={formData.id || user?.email?.split('@')[0] || 'project'}
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
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Faculty Name</label>
                    <input type="text" placeholder="Search name..." value={filterFac} onChange={e => setFilterFac(e.target.value)} className="w-full text-sm rounded-md border-gray-300 py-1.5 px-3 border" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Project Type</label>
                    <select value={filterType} onChange={e => setFilterType(e.target.value)} className="w-full text-sm rounded-md border-gray-300 py-1.5 px-3 border">
                      <option value="">All</option>
                      {PROJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Project Status</label>
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full text-sm rounded-md border-gray-300 py-1.5 px-3 border">
                      <option value="">All</option>
                      {PROJECT_STATUSES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Approval Status</label>
                    <select value={filterApprovalStatus} onChange={e => setFilterApprovalStatus(e.target.value)} className="w-full text-sm rounded-md border-gray-300 py-1.5 px-3 border">
                      <option value="">All</option>
                      <option value="Pending">Pending</option>
                      <option value="Accepted">Accepted</option>
                      <option value="Revision Needed">Revision Needed</option>
                    </select>
                  </div>
                </div>
              </div>

            {loading ? (
              <div className="flex justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="text-center p-8 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-gray-500">No project entries found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project Info</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Funding & Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approval</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredEntries.map(entry => (
                      <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-sm font-semibold text-gray-900">{entry.title}</p>
                          <p className="text-xs text-gray-500 mt-1">{entry.projectType}</p>
                          <p className="text-xs text-indigo-600 mt-1">PI: {entry.principalInvestigator}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-900">{entry.fundingAgency}</p>
                          {entry.amountSanctioned && <p className="text-sm font-medium text-emerald-600">₹{entry.amountSanctioned}</p>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                           <span className={`px-2 py-1 text-xs font-medium rounded-md ${entry.projectStatus === 'Completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>{entry.projectStatus}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge status={entry.proofAccepted} />
                          {entry.proofAccepted === 'Revision Needed' && entry.revisionComments && (
                            <p className="text-xs text-red-500 mt-1 max-w-[150px] truncate" title={entry.revisionComments}>
                              {entry.revisionComments}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button onClick={() => setViewModalData(entry)} className="text-indigo-600 hover:text-indigo-900 mx-2">View</button>
                          {(!isElevated || entry.submittedBy === user.email) && (
                            <button onClick={() => handleEdit(entry)} className="text-blue-600 hover:text-blue-900 mx-2">Edit</button>
                          )}
                          {(isElevated || entry.submittedBy === user.email) && (
                            <button onClick={() => handleDeleteEntry(entry)} className="text-red-600 hover:text-red-900 mx-2">Delete</button>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white">
              <h3 className="text-xl font-bold text-gray-900">Project Details</h3>
              <button onClick={() => setViewModalData(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <div><span className="block text-xs font-medium text-gray-500 uppercase tracking-wider">Type</span><span className="mt-1 text-sm text-gray-900">{viewModalData.projectType}</span></div>
                <div><span className="block text-xs font-medium text-gray-500 uppercase tracking-wider">Status</span><span className="mt-1 text-sm text-gray-900">{viewModalData.projectStatus}</span></div>
                <div className="col-span-2"><span className="block text-xs font-medium text-gray-500 uppercase tracking-wider">Title</span><span className="mt-1 text-sm text-gray-900 font-semibold">{viewModalData.title}</span></div>
                <div><span className="block text-xs font-medium text-gray-500 uppercase tracking-wider">Principal Investigator</span><span className="mt-1 text-sm text-gray-900">{viewModalData.principalInvestigator}</span></div>
                <div><span className="block text-xs font-medium text-gray-500 uppercase tracking-wider">Co-Investigators</span><span className="mt-1 text-sm text-gray-900">{viewModalData.coInvestigatorsList || 'None'}</span></div>
                <div><span className="block text-xs font-medium text-gray-500 uppercase tracking-wider">Funding Agency</span><span className="mt-1 text-sm text-gray-900">{viewModalData.fundingAgency}</span></div>
                <div><span className="block text-xs font-medium text-gray-500 uppercase tracking-wider">Amount Sanctioned</span><span className="mt-1 text-sm text-emerald-600 font-medium">{viewModalData.amountSanctioned ? `₹${viewModalData.amountSanctioned}` : 'N/A'}</span></div>
                <div><span className="block text-xs font-medium text-gray-500 uppercase tracking-wider">Reference No.</span><span className="mt-1 text-sm text-gray-900">{viewModalData.refNo || 'N/A'}</span></div>
                <div><span className="block text-xs font-medium text-gray-500 uppercase tracking-wider">Academic Year</span><span className="mt-1 text-sm text-gray-900">{viewModalData.academicYear}</span></div>
                <div><span className="block text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</span><span className="mt-1 text-sm text-gray-900">{viewModalData.startDate}</span></div>
                <div><span className="block text-xs font-medium text-gray-500 uppercase tracking-wider">End Date</span><span className="mt-1 text-sm text-gray-900">{viewModalData.endDate || 'N/A'}</span></div>
                
                {viewModalData.sdgsLinked?.length > 0 && (
                  <div className="col-span-2">
                    <span className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">SDGs</span>
                    <div className="flex flex-wrap gap-2">
                      {viewModalData.sdgsLinked.map(s => <span key={s} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md">{s}</span>)}
                    </div>
                  </div>
                )}
                
                <div className="col-span-2">
                  <span className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Proof Document</span>
                  {viewModalData.proofLink ? (
                    <a href={viewModalData.proofLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                      View File
                    </a>
                  ) : (
                    <span className="text-sm text-gray-500 italic">No proof uploaded</span>
                  )}
                </div>
              </div>

              {isElevated && (
                <div className="mt-8 p-5 bg-gray-50 rounded-xl border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider">IQAC Review</h4>
                  <div className="flex items-center gap-3">
                    <button onClick={() => { updateProofStatus(viewModalData.id, 'Accepted'); setViewModalData(null) }} className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700">Accept Entry</button>
                    <button onClick={() => { updateProofStatus(viewModalData.id, 'Revision Needed'); setViewModalData(null) }} className="px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600">Request Revision</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
