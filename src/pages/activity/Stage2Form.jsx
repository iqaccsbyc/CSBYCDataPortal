import DateInput from '../../components/DateInput'
import { useState } from 'react'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../../context/AuthContext'
import StatusBadge from '../../components/StatusBadge'
import { DRIVE_FOLDERS, DRIVE_FOLDER_IDS, APPS_SCRIPT_URL } from './constants'
import Stage1Form from './Stage1Form'

const INPUT = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-colors'

function SectionHeader({ number, title }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
        {number}
      </span>
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{title}</h3>
      <div className="flex-1 border-t border-gray-200" />
    </div>
  )
}

function Label({ children, required, hint }) {
  return (
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
      {hint && <span className="ml-2 text-xs font-normal text-gray-400">{hint}</span>}
    </label>
  )
}

function FileUploadField({ label, folderId, value, onChange, activityId, fileType, allowLink }) {
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
          const filename = `${activityId}_${fileType}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
          
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
            placeholder="Paste Drive or Flickr link here..."
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

function MultiFileUploadField({ label, folderId, values, onChange, activityId, fileType, allowLink, maxFiles = 3 }) {
  const handleAdd = (newVal) => onChange([...values, newVal])
  const handleUpdate = (index, newVal) => onChange(values.map((v, i) => i === index ? newVal : v))
  const handleRemove = (index) => onChange(values.filter((_, i) => i !== index))

  return (
    <div className="space-y-3 p-4 rounded-xl border border-gray-200 bg-gray-50/50">
      <p className="text-sm font-medium text-gray-800">{label} <span className="text-gray-400 font-normal ml-1">({values.length}/{maxFiles})</span></p>
      
      <div className="space-y-3">
        {values.map((val, i) => (
          <FileUploadField
            key={val}
            label={`${label} ${i + 1}`}
            folderId={folderId}
            value={val}
            onChange={(newVal) => {
              if (newVal) handleUpdate(i, newVal)
              else handleRemove(i)
            }}
            activityId={activityId}
            fileType={`${fileType}_${i+1}`}
            allowLink={allowLink}
          />
        ))}
        {values.length < maxFiles && (
          <FileUploadField
            key={`new_${values.length}`}
            label={values.length > 0 ? `Add another ${label.toLowerCase()}...` : `Add ${label.toLowerCase()}...`}
            folderId={folderId}
            value=""
            onChange={handleAdd}
            activityId={activityId}
            fileType={`${fileType}_${values.length+1}`}
            allowLink={allowLink}
          />
        )}
      </div>
    </div>
  )
}

function wordCount(text) {
  return text.trim() ? text.trim().split(/\s+/).length : 0
}

function formatDate(str) {
  if (!str) return '—'
  const [y, m, d] = str.split('-')
  return `${d}/${m}/${y}`
}

function formFromActivity(a) {
  const toArray = (val) => Array.isArray(val) ? val : (val ? [val] : [])
  return {
    totalParticipants:  a.totalParticipants != null ? String(a.totalParticipants) : '',
    christStudents:     a.christStudents    != null ? String(a.christStudents)    : '',
    christFaculty:      a.christFaculty     != null ? String(a.christFaculty)     : '',
    outsideStudents:    a.outsideStudents   != null ? String(a.outsideStudents)   : '',
    outsideFaculty:     a.outsideFaculty    != null ? String(a.outsideFaculty)    : '',
    eventBrief:         a.eventBrief        || '',
    photosUploaded:    toArray(a.photosDriveLink),
    reportUploaded:    toArray(a.reportDriveLink),
    nfaUploaded:       toArray(a.nfaDriveLink || a.nfaBillsDriveLink),
    billsUploaded:     toArray(a.billsDriveLink || a.nfaBillsDriveLink),
    posterUploaded:    toArray(a.posterDriveLink),
    funding:            a.funding           || '',
    billsSubmittedDate: a.billsSubmittedDate|| '',
    approvedAmount:     a.approvedAmount    != null ? String(a.approvedAmount)    : '',
    actualSpent:        a.actualSpent       != null ? String(a.actualSpent)       : '',
  }
}

export default function Stage2Form({ activity, activityId, onClose, onSuccess, isUpdate, mode }) {
  const { user } = useAuth()
  const [isEditingStage1, setIsEditingStage1] = useState(false)
  const isEditing = isUpdate || mode === 'update' || mode === 'approve' || activity.status === 'under_revision'
  const [form, setForm] = useState(() => formFromActivity(activity))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [revisionNote, setRevisionNote] = useState('')

  function handleChange(e) {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
  }

  const briefWords = wordCount(form.eventBrief)

  const liveTotal =
    (Number(form.christStudents)  || 0) +
    (Number(form.christFaculty)   || 0) +
    (Number(form.outsideStudents) || 0) +
    (Number(form.outsideFaculty)  || 0)

  const totalEntered   = form.totalParticipants !== ''
  const totalMismatch  = totalEntered && liveTotal !== (Number(form.totalParticipants) || 0)

  async function handleSubmit(e, specificMode) {
    if (e) e.preventDefault()
    setError('')
    
    const currentMode = specificMode || mode || (isUpdate ? 'update' : 'complete')

    if (currentMode === 'request_revision') {
      if (!revisionNote.trim()) return setError('Please provide revision suggestions.')
    } else {
      if (!form.totalParticipants) return setError('Total No. of Participants is required.')
      if (totalMismatch) return setError(`Participant breakdown (${liveTotal}) does not match Total (${form.totalParticipants}). Please correct the numbers.`)
      if (!form.eventBrief.trim()) return setError('Event brief is required.')
      if (briefWords < 50) return setError(`Event brief needs at least 50 words. Currently: ${briefWords}.`)
    }

    setSubmitting(true)
    
    let nextStatus = 'approval_pending'
    if (currentMode === 'approve') nextStatus = 'completed'
    else if (currentMode === 'request_revision') nextStatus = 'under_revision'
    else if (currentMode === 'update') nextStatus = activity.status

    let newRevisionHistory = activity.revisionHistory || []
    if (currentMode === 'request_revision') {
      newRevisionHistory = [
        ...newRevisionHistory, 
        { note: revisionNote.trim(), by: user.email, at: new Date().toISOString() }
      ]
    }

    try {
      await updateDoc(doc(db, 'activities', activityId), {
        totalParticipants:  Number(form.totalParticipants) || 0,
        christStudents:     Number(form.christStudents)    || 0,
        christFaculty:      Number(form.christFaculty)     || 0,
        outsideStudents:    Number(form.outsideStudents)   || 0,
        outsideFaculty:     Number(form.outsideFaculty)    || 0,
        eventBrief:        form.eventBrief.trim(),
        photosDriveLink:   form.photosUploaded,
        reportDriveLink:   form.reportUploaded,
        nfaDriveLink:      form.nfaUploaded,
        billsDriveLink:    form.billsUploaded,
        posterDriveLink:   form.posterUploaded,
        funding:        form.funding,
        approvedAmount: form.funding === 'No Expenditure' ? 0 : (Number(form.approvedAmount) || 0),
        actualSpent:        form.funding === 'No Expenditure' ? 0 : (Number(form.actualSpent) || 0),
        billsSubmittedDate: form.funding === 'No Expenditure' ? '' : form.billsSubmittedDate,
        status:      nextStatus,
        revisionHistory: newRevisionHistory,
        ...(currentMode === 'update' || currentMode === 'request_revision'
          ? { updatedBy: user.email, updatedAt: serverTimestamp() }
          : { completedBy: user.email, completedAt: serverTimestamp() }
        ),
      })
      onSuccess()
    } catch (err) {
      console.error(err)
      setError('Failed to submit. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-y-auto py-8 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl">

        {isEditingStage1 ? (
          <>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Update Stage 1 Entries</h2>
              <button
                type="button"
                onClick={() => setIsEditingStage1(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 text-xl font-light transition-colors flex-shrink-0"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <Stage1Form
                activityId={activityId}
                initialActivity={activity}
                onSuccess={() => setIsEditingStage1(false)}
              />
            </div>
          </>
        ) : (
          <>
            {/* Modal header */}
            <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200">
              <div className="flex-1 min-w-0 pr-4">
                <h2 className="text-lg font-bold text-gray-900">
                  {mode === 'approve' ? 'Verify & Approve Report' : 
                   (isUpdate || mode === 'update') ? 'Update Report' : 'Complete Entry'}
                </h2>
                <p className="text-sm text-gray-500 mt-0.5 truncate">{activity.eventName}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 text-xl font-light transition-colors flex-shrink-0"
          >
            ×
          </button>
        </div>

        {/* Revision History */}
        {activity.revisionHistory?.length > 0 && (
          <div className="px-6 py-4 bg-amber-50 border-b border-amber-200">
            <h3 className="text-sm font-semibold text-amber-900 mb-2">Revision History</h3>
            <div className="space-y-3">
              {activity.revisionHistory.map((rev, i) => (
                <div key={i} className="bg-white/60 p-3 rounded-lg border border-amber-100 text-sm">
                  <p className="text-gray-800">{rev.note}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    By {rev.by} on {new Date(rev.at).toLocaleString('en-GB')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stage 1 summary (read-only context) */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Event Summary — Stage 1
            </p>
            <button
              type="button"
              onClick={() => setIsEditingStage1(true)}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              Edit Stage 1
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-2 gap-x-4 text-sm">
            <div>
              <span className="text-gray-400">Date: </span>
              <span className="text-gray-700">
                {formatDate(activity.startDate)}
                {activity.endDate !== activity.startDate ? ` – ${formatDate(activity.endDate)}` : ''}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Type: </span>
              <span className="text-gray-700">{activity.eventType}</span>
            </div>
            <div>
              <span className="text-gray-400">Mode: </span>
              <span className="text-gray-700">{activity.physicalOnline}</span>
            </div>
            {activity.venue && (
              <div>
                <span className="text-gray-400">Venue: </span>
                <span className="text-gray-700">{activity.venue}</span>
              </div>
            )}
            <div>
              <span className="text-gray-400">Participants: </span>
              <span className="text-gray-700">{activity.totalParticipants}</span>
            </div>
            <div className="sm:col-span-3">
              <span className="text-gray-400">Organizers: </span>
              <span className="text-gray-700">{(activity.organizers || []).join(', ')}</span>
            </div>
          </div>

          {/* Classification tags */}
          {(activity.sdgLinks?.length > 0 || activity.naacCriteria || activity.focusArea) && (
            <div className="mt-3 flex flex-wrap gap-1">
              {activity.sdgLinks?.map(s => (
                <span key={s} className="bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded font-medium">{s}</span>
              ))}
              {activity.focusArea && (
                <span className="bg-green-100 text-green-700 text-xs px-1.5 py-0.5 rounded font-medium">{activity.focusArea}</span>
              )}
              {activity.naacCriteria && (
                <span className="bg-purple-100 text-purple-700 text-xs px-1.5 py-0.5 rounded font-medium">{activity.naacCriteria}</span>
              )}
            </div>
          )}
        </div>

        {/* Stage 2 form */}
        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-8">

          {/* Section 4: Participants */}
          <div>
            <SectionHeader number="4" title="Participants" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              <div className="sm:col-span-2">
                <Label required>Total No. of Participants</Label>
                <input type="number" name="totalParticipants" value={form.totalParticipants}
                  onChange={handleChange} min="0" className={INPUT} placeholder="0" />
              </div>

              <div>
                <Label>No. of CHRIST Students</Label>
                <input type="number" name="christStudents" value={form.christStudents}
                  onChange={handleChange} min="0" className={INPUT} placeholder="0" />
              </div>
              <div>
                <Label>No. of CHRIST Faculty</Label>
                <input type="number" name="christFaculty" value={form.christFaculty}
                  onChange={handleChange} min="0" className={INPUT} placeholder="0" />
              </div>
              <div>
                <Label>No. of Outside Students</Label>
                <input type="number" name="outsideStudents" value={form.outsideStudents}
                  onChange={handleChange} min="0" className={INPUT} placeholder="0" />
              </div>
              <div>
                <Label>No. of Outside Faculty</Label>
                <input type="number" name="outsideFaculty" value={form.outsideFaculty}
                  onChange={handleChange} min="0" className={INPUT} placeholder="0" />
              </div>

              {(form.christStudents || form.christFaculty || form.outsideStudents || form.outsideFaculty) ? (
                <div className={`sm:col-span-2 rounded-lg px-4 py-3 text-sm flex items-center justify-between ${
                  totalMismatch ? 'bg-amber-50 border border-amber-300 text-amber-800' : 'bg-green-50 border border-green-200 text-green-800'
                }`}>
                  <span>Breakdown total: <strong>{liveTotal}</strong></span>
                  {totalMismatch && (
                    <span className="text-xs font-medium">
                      Mismatch with Total ({form.totalParticipants}) — please fix
                    </span>
                  )}
                  {!totalMismatch && totalEntered && (
                    <span className="text-xs font-medium">Matches total ✓</span>
                  )}
                </div>
              ) : null}
            </div>
          </div>

          {/* Section 5: Documentation */}
          <div>
            <SectionHeader number="5" title="Documentation" />
            <div className="space-y-4">
              <div>
                <Label required hint={`${briefWords} word${briefWords !== 1 ? 's' : ''}`}>
                  Brief of the Event
                </Label>
                <textarea
                  name="eventBrief"
                  value={form.eventBrief}
                  onChange={handleChange}
                  rows={5}
                  className={INPUT}
                  placeholder="Write a summary of what happened during the event (minimum 50 words)…"
                />
                <p className={`text-xs mt-1 ${briefWords === 0 ? 'text-gray-400' : briefWords < 50 ? 'text-amber-600' : 'text-green-600'}`}>
                  {briefWords < 50
                    ? `${briefWords} words — need ${50 - briefWords} more`
                    : `${briefWords} words ✓`}
                </p>
              </div>

              <MultiFileUploadField
                label="Event Photos"
                folderId={DRIVE_FOLDER_IDS.photos}
                values={form.photosUploaded}
                onChange={val => setForm(f => ({ ...f, photosUploaded: val }))}
                activityId={activityId}
                fileType="photos"
                allowLink={true}
              />
              <MultiFileUploadField
                label="Event Report"
                folderId={DRIVE_FOLDER_IDS.report}
                values={form.reportUploaded}
                onChange={val => setForm(f => ({ ...f, reportUploaded: val }))}
                activityId={activityId}
                fileType="report"
              />
              <MultiFileUploadField
                label="NFA"
                folderId={DRIVE_FOLDER_IDS.nfa}
                values={form.nfaUploaded}
                onChange={val => setForm(f => ({ ...f, nfaUploaded: val }))}
                activityId={activityId}
                fileType="nfa"
              />
              <MultiFileUploadField
                label="Bills"
                folderId={DRIVE_FOLDER_IDS.bills}
                values={form.billsUploaded}
                onChange={val => setForm(f => ({ ...f, billsUploaded: val }))}
                activityId={activityId}
                fileType="bills"
              />
              <MultiFileUploadField
                label="Event Poster"
                folderId={DRIVE_FOLDER_IDS.poster}
                values={form.posterUploaded}
                onChange={val => setForm(f => ({ ...f, posterUploaded: val }))}
                activityId={activityId}
                fileType="poster"
              />
            </div>
          </div>

          {/* Section 6: Financials */}
          <div>
            <SectionHeader number="6" title="Financials" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              <div className="sm:col-span-2">
                <Label>Funding Source</Label>
                <select name="funding" value={form.funding} onChange={handleChange} className={INPUT}>
                  <option value="">Select source…</option>
                  <option value="CHRIST">CHRIST</option>
                  <option value="External">External</option>
                  <option value="No Expenditure">No Expenditure</option>
                </select>
              </div>

              <div>
                <Label>Approved Amount (₹)</Label>
                <input
                  type="number" name="approvedAmount" value={form.funding === 'No Expenditure' ? '' : form.approvedAmount}
                  onChange={handleChange} min="0"
                  disabled={form.funding === 'No Expenditure'}
                  className={`${INPUT} disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed`}
                  placeholder={form.funding === 'No Expenditure' ? 'N/A' : '0'}
                />
              </div>

              <div>
                <Label>Actual Spent (₹)</Label>
                <input
                  type="number" name="actualSpent" value={form.funding === 'No Expenditure' ? '' : form.actualSpent}
                  onChange={handleChange} min="0"
                  disabled={form.funding === 'No Expenditure'}
                  className={`${INPUT} disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed`}
                  placeholder={form.funding === 'No Expenditure' ? 'N/A' : '0'}
                />
              </div>

              <div className="sm:col-span-2">
                <Label>Bills Submitted Date</Label>
                <DateInput
                   name="billsSubmittedDate"
                  value={form.funding === 'No Expenditure' ? '' : form.billsSubmittedDate}
                  onChange={handleChange}
                  disabled={form.funding === 'No Expenditure'}
                  className={`${INPUT} disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed`}
                />
              </div>
            </div>
          </div>

          {/* Section 7: Verification (If Approving) */}
          {mode === 'approve' && (
            <div>
              <SectionHeader number="7" title="Verification & Revision" />
              <div>
                <Label>Revision Suggestions</Label>
                <textarea
                  value={revisionNote}
                  onChange={e => setRevisionNote(e.target.value)}
                  rows={3}
                  className={INPUT}
                  placeholder="If you are requesting a revision, please provide details here..."
                />
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 rounded-lg transition-colors"
            >
              Cancel
            </button>
            {mode === 'approve' ? (
              <>
                <button
                  type="button"
                  onClick={(e) => handleSubmit(e, 'request_revision')}
                  disabled={submitting}
                  className="flex-1 bg-amber-100 hover:bg-amber-200 text-amber-800 font-semibold py-3 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Processing…' : 'Request Revisions'}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Approving…' : 'Approve & Complete'}
                </button>
              </>
            ) : (
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting…' : ((isUpdate || mode === 'update') ? 'Update Report' : 'Submit for Approval')}
              </button>
            )}
          </div>
        </form>
          </>
        )}
      </div>
    </div>
  )
}
