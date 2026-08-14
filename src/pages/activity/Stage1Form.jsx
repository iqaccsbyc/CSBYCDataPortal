import DateInput from '../../components/DateInput'
import { useState, useEffect } from 'react'
import { collection, doc, query, where, serverTimestamp } from 'firebase/firestore'
import { addDocEncrypted as addDoc, setDocEncrypted as setDoc, getDocsEncrypted as getDocs } from '../../firebase/encryptedStore'
import { db } from '../../firebase/config'
import { useAuth } from '../../context/AuthContext'
import FacultyMultiSelect from '../../components/FacultyMultiSelect'
import {
  EVENT_TYPES, SDG_OPTIONS,
  FOCUS_AREAS, PRIORITY_AREAS, NAAC_CRITERIA,
  deriveMonth, calcDays,
} from './constants'
import { deriveAcademicYear } from '../../utils/academicYear'

const INPUT = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-colors'
const INFO  = 'w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-600'

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

const INITIAL_FORM = {
  eventName: '',
  startDate: '',
  endDate: '',
  eventType: '',
  physicalOnline: 'Physical',
  venue: '',
  resourcePersons: '',
  resourceCategory: '',
  sdgLinks: [],
  focusArea: '',
  priorityArea: '',
  naacCriteria: '',
  aqarCriteria: '',
  posterUrl: '',
}

function formFromActivity(a) {
  return {
    eventName:        a.eventName        || '',
    startDate:        a.startDate        || '',
    endDate:          a.endDate          || '',
    eventType:        a.eventType        || '',
    physicalOnline:   a.physicalOnline   || 'Physical',
    venue:            a.venue            || '',
    resourcePersons:  a.resourcePersons  || '',
    resourceCategory: a.resourceCategory || '',
    sdgLinks:         a.sdgLinks         || [],
    focusArea:    Array.isArray(a.focusArea)    ? (a.focusArea[0]    || '') : (a.focusArea    || ''),
    priorityArea: Array.isArray(a.priorityArea) ? (a.priorityArea[0] || '') : (a.priorityArea || ''),
    naacCriteria: Array.isArray(a.naacCriteria) ? (a.naacCriteria[0] || '') : (a.naacCriteria || ''),
    aqarCriteria:     a.aqarCriteria     || '',
    posterUrl:        a.posterUrl        || '',
  }
}

export default function Stage1Form({ onSuccess, activityId, initialActivity }) {
  const { user, deptCode } = useAuth()
  const isEditing = !!activityId

  const [form, setForm]               = useState(() =>
    initialActivity ? formFromActivity(initialActivity) : INITIAL_FORM
  )
  const [selectedFaculty, setSelectedFaculty] = useState([])
  const [submitting, setSubmitting]   = useState(false)
  const [error, setError]             = useState('')

  useEffect(() => {
    if (!initialActivity?.organizerEmails?.length) return
    getDocs(query(collection(db, 'faculty'), where('deptCode', '==', 'CS-BYC')))
      .then(snap => {
        const all = snap.docs.map(d => d.data())
        const matched = initialActivity.organizerEmails
          .map(email => all.find(f => f.facEmail === email))
          .filter(Boolean)
          .map(f => ({ facId: f.facId, facName: f.facName, facEmail: f.facEmail }))
        setSelectedFaculty(matched)
      })
  }, [])

  function set(name, value) {
    setForm(f => ({ ...f, [name]: value }))
  }

  function handleChange(e) {
    set(e.target.name, e.target.value)
  }

  function toggleArray(field, value) {
    setForm(f => ({
      ...f,
      [field]: f[field].includes(value)
        ? f[field].filter(v => v !== value)
        : [...f[field], value],
    }))
  }

  function handleRadio(field, value) {
    set(field, form[field] === value ? '' : value)
  }

  const noOfDays = calcDays(form.startDate, form.endDate)
  const month    = deriveMonth(form.startDate)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.eventName.trim())       return setError('Event name is required.')
    if (!form.startDate)              return setError('Start date is required.')
    if (!form.endDate)                return setError('End date is required.')
    if (!form.eventType)              return setError('Event type is required.')
    if (selectedFaculty.length === 0) return setError('At least one organizer is required.')

    const payload = {
      eventName:        form.eventName.trim(),
      startDate:        form.startDate,
      endDate:          form.endDate,
      noOfDays,
      month,
      academicYear:     deriveAcademicYear(form.startDate),
      eventType:        form.eventType,
      physicalOnline:   form.physicalOnline,
      venue:            form.physicalOnline === 'Physical' ? form.venue.trim() : '',
      organizers:       selectedFaculty.map(f => f.facName),
      organizerEmails:  selectedFaculty.map(f => f.facEmail),
      resourcePersons:  form.resourcePersons.trim(),
      resourceCategory: form.resourceCategory.trim(),
      sdgLinks:         form.sdgLinks,
      focusArea:        form.focusArea,
      priorityArea:     form.priorityArea,
      naacCriteria:     form.naacCriteria,
      aqarCriteria:     form.aqarCriteria.trim(),
      posterUrl:        form.posterUrl.trim(),
      deptCode:         deptCode || 'CS-BYC',
    }

    setSubmitting(true)
    try {
      if (isEditing) {
        if (!activityId) throw new Error('Activity ID is missing.')
        await setDoc(doc(db, 'activities', activityId), {
          ...payload,
          updatedAt: serverTimestamp(),
        }, { merge: true })
      } else {
        await addDoc(collection(db, 'activities'), {
          ...payload,
          dataEntryEmail: user.email,
          status:         'pending_faculty',
          createdBy:      user.email,
          createdAt:      serverTimestamp(),
        })
        setForm(INITIAL_FORM)
        setSelectedFaculty([])
      }
      onSuccess(selectedFaculty.map(f => f.facName))
    } catch (err) {
      console.error(err)
      setError(err.message || err.code || 'Failed to save. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-10">

      {/* ── Section 1: Event Details ── */}
      <div>
        <SectionHeader number="1" title="Event Details" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          <div className="sm:col-span-2">
            <Label required>Name of the Event</Label>
            <input name="eventName" value={form.eventName} onChange={handleChange}
              className={INPUT} placeholder="Enter event name" />
          </div>

          <div>
            <Label required>Starting Date</Label>
            <DateInput name="startDate"  value={form.startDate}
              onChange={handleChange} className={INPUT} />
          </div>
          <div>
            <Label required>Ending Date</Label>
            <DateInput name="endDate"  value={form.endDate}
              min={form.startDate} onChange={handleChange} className={INPUT} />
          </div>

          <div>
            <Label hint="auto-calculated">No. of Days</Label>
            <div className={INFO}>{noOfDays > 0 ? noOfDays : '—'}</div>
          </div>
          <div>
            <Label hint="auto-derived from start date">Month</Label>
            <div className={INFO}>{month || '—'}</div>
          </div>

          <div className="sm:col-span-2">
            <Label required>Type of Event</Label>
            <select name="eventType" value={form.eventType} onChange={handleChange} className={INPUT}>
              <option value="">Select event type…</option>
              {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <Label required>Mode</Label>
            <div className="flex gap-6 mt-2">
              {['Physical', 'Online'].map(opt => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                  <input type="radio" name="physicalOnline" value={opt}
                    checked={form.physicalOnline === opt} onChange={handleChange}
                    className="accent-indigo-600 w-4 h-4" />
                  {opt}
                </label>
              ))}
            </div>
          </div>

          {form.physicalOnline === 'Physical' && (
            <div>
              <Label>Venue</Label>
              <input name="venue" value={form.venue} onChange={handleChange}
                className={INPUT} placeholder="Enter venue" />
            </div>
          )}
        </div>
      </div>

      {/* ── Section 2: People ── */}
      <div>
        <SectionHeader number="2" title="People" />
        <div className="space-y-4">
          <div>
            <Label required>Organizers</Label>
            <FacultyMultiSelect selected={selectedFaculty} onChange={setSelectedFaculty} />
            {selectedFaculty.length > 0 && (
              <p className="text-xs text-gray-400 mt-1.5">
                Official emails: {selectedFaculty.map(f => f.facEmail).join(', ')}
              </p>
            )}
          </div>

          <div>
            <Label>Data Entry By</Label>
            <div className={INFO}>{user?.email}</div>
          </div>

          <div>
            <Label hint="one per line: Name, Designation, Organisation">Resource Person(s)</Label>
            <textarea name="resourcePersons" value={form.resourcePersons}
              onChange={handleChange} rows={3} className={INPUT}
              placeholder="Dr. Rajan Iyer, Professor, IIT Bengaluru" />
          </div>

          <div>
            <Label>Category of Resource Persons</Label>
            <input name="resourceCategory" value={form.resourceCategory}
              onChange={handleChange} className={INPUT}
              placeholder="e.g. Industry Expert, Academician" />
          </div>
        </div>
      </div>

      {/* ── Section 3: Classification ── */}
      <div>
        <SectionHeader number="3" title="Classification" />
        <div className="space-y-6">

          <div>
            <Label hint="select all that apply">SDG Links</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 mt-2">
              {SDG_OPTIONS.map(sdg => (
                <label key={sdg.id} className="flex items-start gap-2 text-sm cursor-pointer group">
                  <input type="checkbox" checked={form.sdgLinks.includes(sdg.id)}
                    onChange={() => toggleArray('sdgLinks', sdg.id)}
                    className="mt-0.5 accent-indigo-600 flex-shrink-0 w-4 h-4" />
                  <span className="text-gray-700 group-hover:text-indigo-700 transition-colors">
                    <span className="font-semibold">{sdg.id}</span> {sdg.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label hint="select one · click again to deselect">Strategic Plan Focus Area</Label>
            <div className="flex flex-wrap gap-6 mt-2">
              {FOCUS_AREAS.map(fa => (
                <label key={fa} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="focusArea"
                    checked={form.focusArea === fa}
                    onChange={() => handleRadio('focusArea', fa)}
                    onClick={() => { if (form.focusArea === fa) set('focusArea', '') }}
                    className="accent-indigo-600 w-4 h-4"
                  />
                  <span className="font-semibold text-gray-700">{fa}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label hint="select one · click again to deselect">Strategic Plan Priority Area</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mt-2">
              {PRIORITY_AREAS.map(pa => (
                <label key={pa.id} className="flex items-start gap-2 text-sm cursor-pointer group">
                  <input
                    type="radio"
                    name="priorityArea"
                    checked={form.priorityArea === pa.id}
                    onChange={() => handleRadio('priorityArea', pa.id)}
                    onClick={() => { if (form.priorityArea === pa.id) set('priorityArea', '') }}
                    className="mt-0.5 accent-indigo-600 flex-shrink-0 w-4 h-4"
                  />
                  <span className="text-gray-700 group-hover:text-indigo-700 transition-colors">
                    <span className="font-semibold">{pa.id}</span> {pa.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label hint="select one · click again to deselect">NAAC Criteria</Label>
            <div className="flex flex-wrap gap-6 mt-2">
              {NAAC_CRITERIA.map(c => (
                <label key={c} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="naacCriteria"
                    checked={form.naacCriteria === c}
                    onChange={() => handleRadio('naacCriteria', c)}
                    onClick={() => { if (form.naacCriteria === c) set('naacCriteria', '') }}
                    className="accent-indigo-600 w-4 h-4"
                  />
                  <span className="font-semibold text-gray-700">{c}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label>AQAR Criteria</Label>
            <input name="aqarCriteria" value={form.aqarCriteria} onChange={handleChange}
              className={INPUT} placeholder="e.g. 2.3.1, 5.1.2-B" />
          </div>
        </div>
      </div>

      {/* Submit */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {submitting
          ? (isEditing ? 'Updating…' : 'Saving…')
          : (isEditing ? 'Update Entry' : 'Save & Notify Faculty')}
      </button>
    </form>
  )
}
