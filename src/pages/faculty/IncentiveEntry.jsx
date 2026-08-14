import DateInput from '../../components/DateInput'
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import * as XLSX from 'xlsx'
import { collection, query, where, serverTimestamp, doc, deleteDoc } from 'firebase/firestore'
import { addDocEncrypted as addDoc, updateDocEncrypted as updateDoc, onSnapshotEncrypted as onSnapshot } from '../../firebase/encryptedStore'
import { db } from '../../firebase/config'
import { useAuth } from '../../context/AuthContext'
import { DRIVE_FOLDER_IDS, APPS_SCRIPT_URL } from '../activity/constants'
import { deriveAcademicYear } from '../../utils/academicYear'
const INCENTIVE_NATURES = ['Conference Participation', 'Publication', 'Book', 'Professional Membership', 'Project']
const SEMESTERS = ['ODD', 'EVEN']

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


export default function IncentiveEntry() {
  const { user, userRoles } = useAuth()
  const [activeTab, setActiveTab] = useState('new')
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  // View Modal State
  const [viewModalData, setViewModalData] = useState(null)

  // Admin Filters
  const [filterFac, setFilterFac] = useState('')
  const [filterNature, setFilterNature] = useState('')
  const [filterSem, setFilterSem] = useState('')
  const [filterApprovalStatus, setFilterApprovalStatus] = useState('')

  const isElevated = ['admin', 'iqac', 'hod', 'adminassist', 'assochod', 'coreteam'].some(r => userRoles?.includes(r))

  // Form State
  const initialForm = {
    id: null,
    natureOfIncentive: 'Conference Participation',
    amount: '',
    dateOfReceipt: '',
    semester: 'ODD',
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
    if (!user || !userRoles) return
    let q
    if (isElevated) {
      q = collection(db, 'incentives')
    } else {
      q = query(collection(db, 'incentives'), where('submittedBy', '==', user.email))
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
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.natureOfIncentive || !formData.amount || !formData.dateOfReceipt || !formData.semester) {
      alert("Please fill all required fields.")
      return
    }

    setSubmitLoading(true)
    try {
      const payload = {
        ...formData,
        submittedBy: formData.id ? formData.submittedBy : (user?.email || 'unknown'),
        academicYear: deriveAcademicYear(formData.dateOfReceipt)
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
        await addDoc(collection(db, 'incentives'), payload)
        setSuccessMsg('Incentive entry submitted successfully!')
      } else {
        const docId = formData.id
        await updateDoc(doc(db, 'incentives', docId), payload)
        setSuccessMsg('Incentive entry updated successfully!')
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
      await updateDoc(doc(db, 'incentives', id), {
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
      await deleteDoc(doc(db, 'incentives', entry.id))
      setSuccessMsg('Entry deleted successfully.')
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
      'Submitted By': e.submittedBy || '-',
      'Nature of Incentive': e.natureOfIncentive || '-',
      'Amount (₹)': e.amount || 0,
      'Date of Receipt': e.dateOfReceipt || '-',
      'Semester': e.semester || '-',
      'Academic Year': e.academicYear || '-',
      'Proof Link': e.proofLink || '-',
      'Approval Status': e.proofAccepted || '-'
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Financial Incentives")
    XLSX.writeFile(wb, `Financial_Incentives_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const tabs = [
    { id: 'new', label: formData.id ? 'Edit Entry' : 'New Entry' },
    { id: 'entries', label: `${isElevated ? 'All Entries' : 'My Entries'} (${entries.length})` },
  ]

  const filteredEntries = entries.filter(e => {
    if (filterFac && !e.submittedBy.toLowerCase().includes(filterFac.toLowerCase())) return false
    if (filterNature && e.natureOfIncentive !== filterNature) return false
    if (filterSem && e.semester !== filterSem) return false
    if (filterApprovalStatus && e.proofAccepted !== filterApprovalStatus) return false
    return true
  })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-4">
        <Link to="/faculty-entry" className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
          <span>&larr;</span> Back to Dashboard
        </Link>
      </div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Financial Incentives</h1>
        <p className="text-sm text-gray-500 mt-1">Manage financial incentive records.</p>
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
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Incentive Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nature of Incentive <span className="text-red-500">*</span></label>
                  <select name="natureOfIncentive" value={formData.natureOfIncentive} onChange={handleInputChange} required className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3 border">
                    {INCENTIVE_NATURES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) <span className="text-red-500">*</span></label>
                  <input type="number" name="amount" value={formData.amount} onChange={handleInputChange} min="0" required className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3 border" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of Receipt <span className="text-red-500">*</span></label>
                  <DateInput  name="dateOfReceipt" value={formData.dateOfReceipt} onChange={handleInputChange} required className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3 border" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Semester <span className="text-red-500">*</span></label>
                  <select name="semester" value={formData.semester} onChange={handleInputChange} required className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3 border">
                    {SEMESTERS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Documentation</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <FileUploadField
                    label="Proof Document (Google Drive Link)"
                    folderId={DRIVE_FOLDER_IDS.incentive}
                    value={formData.proofLink}
                    onChange={(val) => setFormData(prev => ({ ...prev, proofLink: val }))}
                    filePrefix={formData.id || user?.email?.split('@')[0] || 'incentive'}
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
                    <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Faculty Email</label>
                    <input type="text" placeholder="Search email..." value={filterFac} onChange={e => setFilterFac(e.target.value)} className="w-full text-sm rounded-md border-gray-300 py-1.5 px-3 border" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Nature</label>
                    <select value={filterNature} onChange={e => setFilterNature(e.target.value)} className="w-full text-sm rounded-md border-gray-300 py-1.5 px-3 border">
                      <option value="">All</option>
                      {INCENTIVE_NATURES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Semester</label>
                    <select value={filterSem} onChange={e => setFilterSem(e.target.value)} className="w-full text-sm rounded-md border-gray-300 py-1.5 px-3 border">
                      <option value="">All</option>
                      {SEMESTERS.map(t => <option key={t} value={t}>{t}</option>)}
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
                <p className="text-gray-500">No incentive entries found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Incentive Details</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount & Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Academic Info</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approval</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredEntries.map(entry => (
                      <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-sm font-semibold text-gray-900">{entry.natureOfIncentive}</p>
                          <p className="text-xs text-indigo-600 mt-1">By: {entry.submittedBy}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-emerald-600">₹{entry.amount}</p>
                          <p className="text-xs text-gray-500 mt-1">{entry.dateOfReceipt}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-900">Sem: {entry.semester}</p>
                          <p className="text-xs text-gray-500 mt-1">AY: {entry.academicYear}</p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge status={entry.proofAccepted} />
                          {entry.proofAccepted === 'Revision Needed' && entry.revisionComments && (
                            <p className="text-xs text-red-500 mt-1 max-w-[150px] truncate" title={entry.revisionComments}>
                              {entry.revisionComments}
                            </p>
                          )}
                          {isElevated && entry.proofAccepted === 'Pending' && (
                            <div className="mt-2 flex gap-2">
                              <button onClick={() => updateProofStatus(entry.id, 'Accepted')} className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded hover:bg-green-100">Approve</button>
                              <button onClick={() => updateProofStatus(entry.id, 'Revision Needed')} className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded hover:bg-amber-100">Revise</button>
                            </div>
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
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white">
              <h3 className="text-xl font-bold text-gray-900">Incentive Details</h3>
              <button onClick={() => setViewModalData(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <div className="col-span-2"><span className="block text-xs font-medium text-gray-500 uppercase tracking-wider">Nature of Incentive</span><span className="mt-1 text-sm text-gray-900 font-semibold">{viewModalData.natureOfIncentive}</span></div>
                <div><span className="block text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</span><span className="mt-1 text-sm text-emerald-600 font-bold">₹{viewModalData.amount}</span></div>
                <div><span className="block text-xs font-medium text-gray-500 uppercase tracking-wider">Date of Receipt</span><span className="mt-1 text-sm text-gray-900">{viewModalData.dateOfReceipt}</span></div>
                <div><span className="block text-xs font-medium text-gray-500 uppercase tracking-wider">Semester</span><span className="mt-1 text-sm text-gray-900">{viewModalData.semester}</span></div>
                <div><span className="block text-xs font-medium text-gray-500 uppercase tracking-wider">Academic Year</span><span className="mt-1 text-sm text-gray-900">{viewModalData.academicYear}</span></div>
                <div><span className="block text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted By</span><span className="mt-1 text-sm text-gray-900">{viewModalData.submittedBy}</span></div>
                <div><span className="block text-xs font-medium text-gray-500 uppercase tracking-wider">Approval Status</span><span className="mt-1 text-sm text-gray-900"><StatusBadge status={viewModalData.proofAccepted} /></span></div>
                
                {viewModalData.proofLink && (
                  <div className="col-span-2 mt-4 pt-4 border-t border-gray-100">
                    <span className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Proof Document</span>
                    <a href={viewModalData.proofLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                      View Linked Proof
                    </a>
                  </div>
                )}
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button onClick={() => setViewModalData(null)} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
