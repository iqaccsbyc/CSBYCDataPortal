import DateInput from '../components/DateInput'
import { useState, useEffect } from 'react'
import { collection, doc, deleteDoc, Timestamp, query, where } from 'firebase/firestore'
import { getDocsEncrypted as getDocs, setDocEncrypted as setDoc } from '../firebase/encryptedStore'
import { db } from '../firebase/config'
import { useAuth } from '../context/AuthContext'
import { ROLE_OPTIONS, hasCampusAccess } from '../utils/roleUtils'
import TagsInput from '../components/TagsInput'
import * as XLSX from 'xlsx'

export default function ManageFaculty() {
  const { userRoles, deptCode: myDeptCode } = useAuth()
  const isCampus = hasCampusAccess(userRoles)
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [depts, setDepts] = useState([])

  // ── Filters ──────────────────────────────────────────────────
  const [filterDept,   setFilterDept]   = useState('all')
  const [filterRole,   setFilterRole]   = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterSearch, setFilterSearch] = useState('')

  // Campus roles can filter by dept; dept roles are locked to their own dept
  const filteredData = data.filter(item => {
    if (!isCampus && myDeptCode && item.deptCode && item.deptCode !== myDeptCode) return false
    if (isCampus && filterDept !== 'all' && item.deptCode !== filterDept) return false
    if (filterRole   !== 'all' && !(item.roles || []).includes(filterRole)) return false
    if (filterStatus !== 'all' && (item.facStatus || 'Active') !== filterStatus) return false
    if (filterSearch) {
      const q = filterSearch.toLowerCase()
      if (!item.facName?.toLowerCase().includes(q) &&
          !item.facEmail?.toLowerCase().includes(q) &&
          !item.facId?.toLowerCase().includes(q)) return false
    }
    return true
  })

  function handleExport() {
    const rows = filteredData.map(item => ({
      'Faculty ID':       item.facId || '',
      'Name':             item.facName || '',
      'Designation':      item.facDesig || '',
      'Gender':           item.facGender || '',
      'Department':       item.deptCode || '',
      'Official Email':   item.facEmail || '',
      'Personal Email':   item.facPEmail || '',
      'Mobile':           item.facMob || '',
      'Status':           item.facStatus || 'Active',
      'Date of Joining':  item.facDOJ || '',
      'Exp Outside (Yrs)':item.facExpOutside || '',
      'Roles':            (item.roles || []).join(', '),
      'Remarks':          item.Remarks || '',
      'ORCID iD':         item.orcidId || '',
      'SCOPUS ID':        item.scopusId || '',
      'LinkedIn Profile': item.linkedIn || '',
      'Individual Web':   item.website || '',
      'Institutional Web':item.institutionalWebsite || '',
      'Specializations':  (item.specializations || []).join(', ')
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Faculty')
    const suffix = filterDept !== 'all' ? `_${filterDept}` : ''
    XLSX.writeFile(wb, `Faculty${suffix}_${new Date().toISOString().slice(0,10)}.xlsx`)
  }

  useEffect(() => {
    fetchData()
    if (isCampus) {
      getDocs(collection(db, 'departments')).then(snap => {
        setDepts(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.deptName?.localeCompare(b.deptName)))
      })
    }
  }, [])
    
  const initialFormState = {
    facId: '',
    facName: '',
    facDesig: '',
    facGender: 'Male',
    facDOB: '',
    facCity: '',
    facTAddress: '',
    facPAddress: '',
    facEmail: '',
    facPEmail: '',
    facMob: '',
    facStatus: 'Active',
    facDOJ: '',
    facExpOutside: '',
    roles: ['faculty'],
    deptCode: myDeptCode || '',
    Remarks: '',
    orcidId: '',
    scopusId: '',
    linkedIn: '',
    website: '',
    institutionalWebsite: '',
    specializations: []
  }
  const [formData, setFormData] = useState(initialFormState)

  async function fetchData() {
    setLoading(true)
    setError('')
    try {
      let facSnapshot;
      let usersSnapshot;

      if (isCampus) {
        facSnapshot = await getDocs(collection(db, 'faculty'))
        usersSnapshot = await getDocs(collection(db, 'users'))
      } else if (myDeptCode) {
        const facQ = query(collection(db, 'faculty'), where('deptCode', '==', myDeptCode))
        const userQ = query(collection(db, 'users'), where('deptCode', '==', myDeptCode))
        facSnapshot = await getDocs(facQ)
        usersSnapshot = await getDocs(userQ)
      } else {
        setData([])
        setLoading(false)
        return
      }

      const usersMap = {}
      usersSnapshot.forEach(doc => {
        usersMap[doc.id] = doc.data()
      })

      const combinedData = facSnapshot.docs.map(doc => {
        const facData = doc.data()
        const userEntry = usersMap[facData.facEmail]
        const userRoles = userEntry?.roles || (userEntry?.role ? [userEntry.role] : ['faculty'])
        return {
          ...facData,
          roles: userRoles,
          isActive: userEntry?.isActive ?? true
        }
      })
      
      setData(combinedData)
    } catch (err) {
      console.error(err)
      setError('Failed to fetch data.')
    } finally {
      setLoading(false)
    }
  }

  function handleOpenModal(entry = null) {
    if (entry) {
      setIsEditMode(true)
      setFormData({ ...entry, deptCode: entry.deptCode || myDeptCode || '' })
    } else {
      setIsEditMode(false)
      setFormData({ ...initialFormState, deptCode: myDeptCode || '' })
    }
    setIsModalOpen(true)
  }

  function handleCloseModal() {
    setIsModalOpen(false)
    setFormData(initialFormState)
  }

  function handleInputChange(e) {
    const { name, value, type, selectedOptions } = e.target
    if (type === 'select-multiple') {
      const values = Array.from(selectedOptions, option => option.value)
      setFormData(prev => ({ ...prev, [name]: values }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  async function handleSave(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    try {
      const now = Timestamp.now()
      const facRef = doc(db, 'faculty', formData.facId)
      const userRef = doc(db, 'users', formData.facEmail)

      const facData = {
        facId: formData.facId,
        facName: formData.facName,
        facDesig: formData.facDesig,
        facGender: formData.facGender || '',
        facDOB: formData.facDOB || '',
        facCity: formData.facCity || '',
        facTAddress: formData.facTAddress || '',
        facPAddress: formData.facPAddress || '',
        facEmail: formData.facEmail,
        facPEmail: formData.facPEmail || '',
        facMob: formData.facMob || '',
        facStatus: formData.facStatus || 'Active',
        facDOJ: formData.facDOJ || '',
        facExpOutside: formData.facExpOutside || '',
        Remarks: formData.Remarks || '',
        orcidId: formData.orcidId || '',
        scopusId: formData.scopusId || '',
        linkedIn: formData.linkedIn || '',
        website: formData.website || '',
        institutionalWebsite: formData.institutionalWebsite || '',
        specializations: formData.specializations || [],
        deptCode: formData.deptCode || myDeptCode || '',
        createdAt: formData.createdAt || now
      }

      const userData = {
        facId: formData.facId,
        facEmail: formData.facEmail,
        roles: formData.roles,
        deptCode: formData.deptCode || myDeptCode || '',
        isActive: true,
        createdAt: formData.createdAt || now
      }

      await setDoc(facRef, facData)
      await setDoc(userRef, userData)
      
      setSuccess(`Successfully ${isEditMode ? 'updated' : 'added'} faculty member.`)
      handleCloseModal()
      fetchData()
    } catch (err) {
      console.error(err)
      setError('Failed to save data.')
    }
  }

  async function handleDelete(facId, facEmail) {
    if (!window.confirm('Are you sure you want to delete this faculty member? This will remove their profile and portal access.')) return
    
    setError('')
    setSuccess('')
    try {
      await deleteDoc(doc(db, 'faculty', facId))
      await deleteDoc(doc(db, 'users', facEmail))
      setSuccess('Faculty member deleted successfully.')
      fetchData()
    } catch (err) {
      console.error(err)
      setError('Failed to delete data.')
    }
  }

  function handleDownloadTemplate() {
    const headers = [
      'facId', 'facName', 'facDesig', 'facGender', 'facDOB', 
      'facCity', 'facTAddress', 'facPAddress', 'facEmail', 
      'facPEmail', 'facMob', 'facStatus', 'facDOJ', 'facExpOutside', 'roles', 'Remarks',
      'orcidId', 'scopusId', 'linkedIn', 'website', 'institutionalWebsite', 'specializations'
    ]
    const example = [
      'FAC999', 'John Doe', 'Assistant Professor', 'Male', '1990-01-01',
      'Bengaluru', 'Temp Address', 'Perm Address', 'john.doe@christuniversity.in',
      'john@gmail.com', '9876543210', 'Active', '2020-06-01', '5', 'faculty,hod', 'On Leave, Visiting',
      '0000-0000-0000-0000', '', 'https://linkedin.com/in/johndoe', '', '', 'Machine Learning, Data Science'
    ]
    const ws = XLSX.utils.aoa_to_sheet([headers, example])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Template')
    XLSX.writeFile(wb, 'Faculty_Bulk_Upload_Template.xlsx')
  }

  function handleFileUpload(e) {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result
        const wb = XLSX.read(bstr, { type: 'binary' })
        const wsname = wb.SheetNames[0]
        const ws = wb.Sheets[wsname]
        const data = XLSX.utils.sheet_to_json(ws)

        setLoading(true)
        let successCount = 0
        let errorCount = 0
        let lastErrorMessage = 'Unknown error';

        const now = Timestamp.now()

        for (const rawRow of data) {
          // Normalize row keys to lower case and trim to fix Excel header issues
          const row = {}
          for (const key in rawRow) {
            row[key.trim().toLowerCase()] = rawRow[key]
          }

          const rawId = row.facid || row['faculty id'] || row.id;
          const facId = rawId ? String(rawId).trim() : `FAC${Math.floor(10000 + Math.random() * 90000)}`;
          
          const rawEmail = row.facemail || row['official email'] || row.email;

          if (!rawEmail) {
            errorCount++
            continue
          }

          try {
            const cleanEmail = String(rawEmail).trim().toLowerCase()
            const facRef = doc(db, 'faculty', facId)
            const userRef = doc(db, 'users', cleanEmail)
            
            const facData = {
              facId: facId,
              facName: String(row.facname || row.name || '').trim(),
              facDesig: String(row.facdesig || row.designation || '').trim(),
              facGender: String(row.facgender || row.gender || 'Male').trim(),
              facDOB: row.facdob ? String(row.facdob).trim() : '',
              facCity: String(row.faccity || row.city || '').trim(),
              facTAddress: String(row.factaddress || '').trim(),
              facPAddress: String(row.facpaddress || '').trim(),
              facEmail: cleanEmail,
              facPEmail: String(row.facpemail || row['personal email'] || '').trim(),
              facMob: String(row.facmob || row.mobile || '').trim(),
              facStatus: String(row.facstatus || row.status || 'Active').trim(),
              facDOJ: row.facdoj ? String(row.facdoj).trim() : '',
              facExpOutside: String(row.facexpoutside || row['exp outside (yrs)'] || '').trim(),
              Remarks: String(row.remarks || '').trim(),
              orcidId: String(row.orcidid || row['orcid id'] || '').trim(),
              scopusId: String(row.scopusid || row['scopus id'] || '').trim(),
              linkedIn: String(row.linkedin || row['linkedin profile'] || '').trim(),
              website: String(row.website || row['individual web'] || '').trim(),
              institutionalWebsite: String(row.institutionalwebsite || row['institutional web'] || '').trim(),
              specializations: (row.specializations ? String(row.specializations).split(',').map(s => s.trim()).filter(s => s) : []),
              deptCode: myDeptCode || '',
              createdAt: now
            }

            let parsedRoles = ['faculty']
            const rolesStr = row.roles || row.role;
            if (rolesStr) {
              parsedRoles = String(rolesStr).split(',').map(r => r.trim()).filter(r => r)
            }

            const userData = {
              facId: facId,
              facEmail: cleanEmail,
              roles: parsedRoles,
              deptCode: myDeptCode || '',
              isActive: true,
              createdAt: now
            }

            await setDoc(facRef, facData)
            await setDoc(userRef, userData)
            successCount++
          } catch (e) {
            console.error('Row insert error:', e)
            errorCount++
            lastErrorMessage = e.message;
          }
        }
        setSuccess(`Bulk upload complete. Successfully imported ${successCount} records. ${errorCount > 0 ? `Failed: ${errorCount}. Last error: ${lastErrorMessage}` : ''}`)
        fetchData()
      } catch (err) {
        console.error(err)
        setError('Failed to parse file.')
        setLoading(false)
      }
      e.target.value = '' // Reset input
    }
    reader.readAsBinaryString(file)
  }

  const authorizedRoles = [
    'admin', 'hod', 'assochod', 'adminassist',
    'director', 'assocdirector', 'campusadmin', 'dean', 'assocdean',
    'campusiqaccoordinator', 'campusiqaccoreteam', 'deansoffice'
  ]


  if (!authorizedRoles.some(r => userRoles.includes(r))) {
    return (
      <div className="p-8 text-center text-red-600 font-semibold">
        Access Denied. You do not have permission to view this page.
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="mb-2">
        <a href="/" className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
          <span>&larr;</span> Back to Main Dashboard
        </a>
      </div>
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Faculty</h1>
          <p className="text-sm text-gray-500 mt-1">Add, update, or remove faculty members and manage their system access.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleDownloadTemplate}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Template
          </button>
          
          <label className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 cursor-pointer">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Bulk Upload
            <input type="file" accept=".csv, .xlsx" className="hidden" onChange={handleFileUpload} />
          </label>

          <button
            onClick={() => handleOpenModal()}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Faculty
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
          {error}
        </div>
      )}
      
      {success && (
        <div className="p-4 rounded-lg bg-green-50 text-green-700 text-sm border border-green-200">
          {success}
        </div>
      )}

      {/* ── Filter & Export Bar ──────────────────────────────── */}
      <div className="flex flex-wrap items-end gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl">
        {/* Text search */}
        <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Search</label>
          <input
            value={filterSearch}
            onChange={e => setFilterSearch(e.target.value)}
            placeholder="Name, email or ID…"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
          />
        </div>

        {/* Dept filter — Campus roles only */}
        {isCampus && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Department</label>
            <select
              value={filterDept}
              onChange={e => setFilterDept(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white min-w-[180px]"
            >
              <option value="all">All Departments</option>
              {depts.map(d => <option key={d.id} value={d.id}>{d.deptName || d.id}</option>)}
            </select>
          </div>
        )}

        {/* Dept badge for dept roles */}
        {!isCampus && myDeptCode && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Department</label>
            <div className="border border-indigo-200 bg-indigo-50 rounded-lg px-3 py-2 text-sm font-medium text-indigo-700">
              {myDeptCode}
            </div>
          </div>
        )}

        {/* Role filter */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</label>
          <select
            value={filterRole}
            onChange={e => setFilterRole(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white min-w-[160px]"
          >
            <option value="all">All Roles</option>
            {ROLE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>

        {/* Status filter */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</label>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
          >
            <option value="all">All</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        {/* Result count */}
        <div className="flex flex-col gap-1 self-end">
          <span className="text-xs text-gray-400 pb-2">
            {filteredData.length} of {data.length} records
          </span>
        </div>

        {/* Reset */}
        {(filterDept !== 'all' || filterRole !== 'all' || filterStatus !== 'all' || filterSearch) && (
          <button
            onClick={() => { setFilterDept('all'); setFilterRole('all'); setFilterStatus('all'); setFilterSearch('') }}
            className="self-end text-xs text-gray-500 hover:text-indigo-600 underline pb-2"
          >
            Reset
          </button>
        )}

        {/* Export */}
        <button
          onClick={handleExport}
          disabled={filteredData.length === 0}
          className="self-end inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export Excel
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name & Designation</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dept</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                <td colSpan="7" className="px-6 py-10 text-center text-gray-500">Loading data...</td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                <td colSpan="7" className="px-6 py-10 text-center text-gray-500">No faculty entries match the filters.</td>
                </tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.facId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.facId}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="font-medium text-gray-900">{item.facName}</div>
                      <div className="text-gray-500 text-xs">{item.facDesig}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.facEmail}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {item.deptCode || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex flex-wrap gap-1">
                        {(item.roles || []).map(r => (
                          <span key={r} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {ROLE_OPTIONS.find(opt => opt.value === r)?.label || r}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {item.Remarks ? item.Remarks.split(',').filter(r => r.trim()).map((r, i) => (
                          <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            {r.trim()}
                          </span>
                        )) : <span className="text-sm text-gray-500">-</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => handleOpenModal(item)} className="text-indigo-600 hover:text-indigo-900 mr-4">Edit</button>
                      <button onClick={() => handleDelete(item.facId, item.facEmail)} className="text-red-600 hover:text-red-900">Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-lg font-bold text-gray-900">
                {isEditMode ? 'Edit Faculty Member' : 'Add New Faculty Member'}
              </h3>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-500">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleSave} className="px-6 py-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Faculty ID *</label>
                  <input required type="text" name="facId" value={formData.facId} onChange={handleInputChange} disabled={isEditMode} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-100" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Full Name *</label>
                  <input required type="text" name="facName" value={formData.facName} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Official Email *</label>
                  <input required type="email" name="facEmail" value={formData.facEmail} onChange={handleInputChange} disabled={isEditMode} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-100" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">System Roles * (Ctrl/Cmd+Click to select multiple)</label>
                  <select required multiple name="roles" value={formData.roles} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" size="4">
                    {ROLE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
                {/* Department */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Department *</label>
                  {isCampus ? (
                    <select
                      required
                      name="deptCode"
                      value={formData.deptCode}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      <option value="">Select department…</option>
                      {depts.map(d => (
                        <option key={d.id} value={d.id}>{d.deptName || d.id}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="mt-1 px-3 py-2 rounded-md text-sm font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {myDeptCode || '—'}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Designation</label>
                  <input type="text" name="facDesig" value={formData.facDesig} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select name="facStatus" value={formData.facStatus} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Gender</label>
                  <select name="facGender" value={formData.facGender} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                  <DateInput  name="facDOB" value={formData.facDOB} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date of Joining (CHRIST)</label>
                  <DateInput  name="facDOJ" value={formData.facDOJ} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Experience Outside (Years)</label>
                  <input type="number" step="0.1" name="facExpOutside" value={formData.facExpOutside} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Mobile Number</label>
                  <input type="text" name="facMob" value={formData.facMob} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Personal Email</label>
                  <input type="email" name="facPEmail" value={formData.facPEmail} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">City</label>
                  <input type="text" name="facCity" value={formData.facCity} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                </div>
                <div className="md:col-span-2 lg:col-span-3">
                  <label className="block text-sm font-medium text-gray-700">Remarks (Comma separated)</label>
                  <input type="text" name="Remarks" value={formData.Remarks || ''} onChange={handleInputChange} placeholder="e.g. On Leave, Visiting Faculty" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                  {formData.Remarks && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {formData.Remarks.split(',').filter(r => r.trim()).map((r, i) => (
                        <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-800">
                          {r.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Temporary Address</label>
                  <textarea name="facTAddress" rows={2} value={formData.facTAddress} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Permanent Address</label>
                  <textarea name="facPAddress" rows={2} value={formData.facPAddress} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                </div>
              </div>

              {/* Professional IDs & Links */}
              <div>
                <h4 className="text-sm font-bold text-gray-700 mb-3 border-b pb-1">Professional IDs & Links</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">ORCID iD</label>
                    <input type="text" name="orcidId" value={formData.orcidId || ''} onChange={handleInputChange} placeholder="0000-0000-0000-0000" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">SCOPUS ID</label>
                    <input type="text" name="scopusId" value={formData.scopusId || ''} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">LinkedIn Profile URL</label>
                    <input type="url" name="linkedIn" value={formData.linkedIn || ''} onChange={handleInputChange} placeholder="https://linkedin.com/in/..." className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Individual Website</label>
                    <input type="url" name="website" value={formData.website || ''} onChange={handleInputChange} placeholder="https://" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Institutional Website (Profile)</label>
                    <input type="url" name="institutionalWebsite" value={formData.institutionalWebsite || ''} onChange={handleInputChange} placeholder="https://" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                  </div>
                </div>
              </div>

              {/* Specializations */}
              <div>
                <h4 className="text-sm font-bold text-gray-700 mb-3 border-b pb-1">Specializations</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tags (Press Enter or Comma to add)</label>
                  <TagsInput 
                    tags={formData.specializations || []} 
                    onChange={(newTags) => setFormData(prev => ({ ...prev, specializations: newTags }))} 
                    placeholder="e.g. Machine Learning, Cloud Computing"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button type="button" onClick={handleCloseModal} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">
                  {isEditMode ? 'Save Changes' : 'Add Faculty'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
