import DateInput from '../components/DateInput'
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, doc, deleteDoc, query, where } from 'firebase/firestore';
import { getDocsEncrypted as getDocs, setDocEncrypted as setDoc, getDocEncrypted as getDoc } from '../firebase/encryptedStore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { hasCampusAccess } from '../utils/roleUtils';
import * as XLSX from 'xlsx';
import { DRIVE_FOLDER_IDS, APPS_SCRIPT_URL, calcDays } from './activity/constants';

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

const INITIAL_FORM_STATE = {
  regNo: '',
  studentName: '',
  batch: '',
  programme: '',
  mobile: '',
  christEmail: '',
  personalEmail: '',
  placementType: '',
  source: '',
  startDate: '',
  endDate: '',
  duration: '',
  salary: '',
  salaryType: 'CTC',
  position: '',
  company: '',
  spocName: '',
  spocEmail: '',
  spocMobile: '',
  offerLetterProof: '',
  completionLetterProof: ''
};

export default function ManagePlacements() {
  const { user, userRoles, deptCode } = useAuth();
  const isCampus = hasCampusAccess(userRoles);
  const [placements, setPlacements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modals & Forms
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewData, setViewData] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [isEditing, setIsEditing] = useState(false);
  const [fetchingStudent, setFetchingStudent] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProgramme, setFilterProgramme] = useState('');
  const [filterBatch, setFilterBatch] = useState('');
  const [filterUgPg, setFilterUgPg] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch department programmes first for filtering if not campus
      let progNames = [];
      if (!isCampus && deptCode) {
        const progQ = query(collection(db, 'programmes'), where('departmentCode', '==', deptCode));
        const progSnap = await getDocs(progQ);
        progNames = progSnap.docs.map(d => d.data().ProgrammeName || d.data().name || d.id);
      }

      let snap;
      if (isCampus) {
        snap = await getDocs(collection(db, 'placements'));
      } else if (progNames.length > 0 && progNames.length <= 30) {
        const q = query(collection(db, 'placements'), where('programme', 'in', progNames));
        snap = await getDocs(q);
      } else {
        snap = await getDocs(collection(db, 'placements'));
      }

      let data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Secondary filter if not campus and couldn't use 'in' query
      if (!isCampus && (progNames.length === 0 || progNames.length > 30)) {
        data = data.filter(p => progNames.includes(p.programme));
      }

      setPlacements(data.sort((a, b) => (a.regNo || '').localeCompare(b.regNo || '')));
    } catch (err) {
      console.error(err);
      setError('Failed to fetch data.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStudentDetails = async () => {
    if (!formData.regNo) return;
    setFetchingStudent(true);
    try {
      const docRef = doc(db, 'students', formData.regNo.trim());
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const student = docSnap.data();
        setFormData(prev => ({
          ...prev,
          studentName: student.studentName || '',
          batch: student.batch || '',
          programme: student.programme || '',
          mobile: student.mobile || '',
          christEmail: student.christEmail || '',
          personalEmail: student.personalEmail || '',
        }));
      } else {
        alert("Student not found. Please ensure the Reg No is correct.");
        setFormData(prev => ({
          ...prev,
          studentName: '',
          batch: '',
          programme: '',
          mobile: '',
          christEmail: '',
          personalEmail: '',
        }));
      }
    } catch (err) {
      console.error(err);
      alert("Failed to fetch student details.");
    } finally {
      setFetchingStudent(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'startDate' || name === 'endDate') {
        if (updated.startDate && updated.endDate) {
          updated.duration = `${calcDays(updated.startDate, updated.endDate)} days`;
        } else {
          updated.duration = '';
        }
      }
      return updated;
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.regNo || !formData.studentName || !formData.placementType || !formData.company) {
      alert("Please fill all required fields (Reg No, Placement Type, Company). Ensure student details are fetched.");
      return;
    }
    
    // Auto-generate doc ID if new
    const docId = isEditing && formData.id ? formData.id : `PL_${formData.regNo}_${Date.now()}`;
    const payload = { ...formData, id: docId, lastUpdatedBy: user?.email };

    try {
      await setDoc(doc(db, 'placements', docId), payload);
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Failed to save placement.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this record?')) {
      try {
        await deleteDoc(doc(db, 'placements', id));
        fetchData();
      } catch (err) {
        console.error(err);
        alert("Failed to delete placement.");
      }
    }
  };

  const openAddModal = () => {
    setFormData(INITIAL_FORM_STATE);
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setFormData(item);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const openViewModal = (item) => {
    setViewData(item);
    setIsViewModalOpen(true);
  };

  const handleExport = () => {
    const sData = filteredPlacements.map(s => ({
      "Reg No": s.regNo,
      "Name": s.studentName,
      "Batch": s.batch,
      "Programme": s.programme,
      "Mobile": s.mobile,
      "Email": s.christEmail || s.personalEmail,
      "Placement Type": s.placementType,
      "Source": s.source,
      "Start Date": s.startDate ? s.startDate.split('-').reverse().join('/') : '-',
      "End Date": s.endDate ? s.endDate.split('-').reverse().join('/') : '-',
      "Duration": s.duration,
      "Salary": s.salary ? `${s.salary} (${s.salaryType})` : '-',
      "Position": s.position,
      "Company": s.company,
      "SPOC Name": s.spocName,
      "SPOC Email": s.spocEmail,
      "SPOC Mobile": s.spocMobile,
      "Offer Letter Proof": s.offerLetterProof || '-',
      "Completion Letter Proof": s.completionLetterProof || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(sData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Placements");
    XLSX.writeFile(wb, "Department_Placements_Export.xlsx");
  };

  const filteredPlacements = placements.filter(s => {
    const q = searchQuery.toLowerCase();
    const matchSearch = (s.studentName || '').toLowerCase().includes(q) || (s.regNo || '').toLowerCase().includes(q) || (s.company || '').toLowerCase().includes(q);
    const matchProg = filterProgramme ? s.programme === filterProgramme : true;
    const matchBatch = filterBatch ? s.batch === filterBatch : true;
    
    let matchUgPg = true;
    if (filterUgPg) {
      const isUg = (s.programme || '').toUpperCase().startsWith('B');
      if (filterUgPg === 'UG') matchUgPg = isUg;
      if (filterUgPg === 'PG') matchUgPg = !isUg;
    }

    return matchSearch && matchProg && matchBatch && matchUgPg;
  });

  const uniqueBatches = [...new Set(placements.map(s => s.batch).filter(Boolean))].sort().reverse();
  const uniqueProgrammes = [...new Set(placements.map(s => s.programme).filter(Boolean))].sort();

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <div className="mb-2">
          <Link to="/" className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1 w-max">
            <span>&larr;</span> Back to Dashboard
          </Link>
        </div>

        {/* Header */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Placement Entry</h1>
            <p className="text-sm text-gray-500 mt-1">Manage student placements, internships, and summer internships</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={openAddModal}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 shadow-sm"
            >
              + Add Record
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-md hover:bg-emerald-700 shadow-sm flex items-center gap-2"
            >
              Export
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Search Name/RegNo/Company</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3 border"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Filter by Programme</label>
            <select
              value={filterProgramme}
              onChange={(e) => setFilterProgramme(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3 border"
            >
              <option value="">All Programmes</option>
              {uniqueProgrammes.map((p, i) => <option key={i} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Filter by Level</label>
            <select
              value={filterUgPg}
              onChange={(e) => setFilterUgPg(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3 border"
            >
              <option value="">UG + PG</option>
              <option value="UG">UG Only</option>
              <option value="PG">PG Only</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Filter by Batch</label>
            <select
              value={filterBatch}
              onChange={(e) => setFilterBatch(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3 border"
            >
              <option value="">All Batches</option>
              {uniqueBatches.map((b, i) => <option key={i} value={b}>{b}</option>)}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto" style={{ maxHeight: '600px' }}>
            <table className="min-w-full text-sm text-left border-collapse">
              <thead className="bg-gray-50 text-gray-700 sticky top-0 z-10 shadow-sm border-b border-gray-200 font-semibold uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">Reg No</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Salary</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr><td colSpan="6" className="text-center py-8 text-gray-500">Loading records...</td></tr>
                ) : filteredPlacements.length === 0 ? (
                  <tr><td colSpan="6" className="text-center py-8 text-gray-500">No records found.</td></tr>
                ) : (
                  filteredPlacements.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-indigo-700">{item.regNo}</td>
                      <td className="px-4 py-3 font-medium">
                        {item.studentName}
                        <div className="text-xs text-gray-500 font-normal">{item.programme} ({item.batch})</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${item.placementType === 'Placement' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                          {item.placementType}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium">{item.company}</td>
                      <td className="px-4 py-3">{item.salary ? `${item.salary} (${item.salaryType})` : '-'}</td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button onClick={() => openViewModal(item)} className="text-indigo-600 hover:text-indigo-900 font-medium text-xs">View</button>
                        <button onClick={() => openEditModal(item)} className="text-blue-600 hover:text-blue-900 font-medium text-xs">Edit</button>
                        <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-900 font-medium text-xs">Del</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 text-sm text-gray-600">
            Showing {filteredPlacements.length} records
          </div>
        </div>

      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setIsModalOpen(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
              <form onSubmit={handleSave}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 max-h-[80vh] overflow-y-auto">
                  <h3 className="text-lg leading-6 font-bold text-gray-900 border-b pb-2 mb-4">
                    {isEditing ? 'Edit Record' : 'Add New Record'}
                  </h3>
                  
                  <div className="space-y-6">
                    {/* Student Info Section */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <h4 className="text-sm font-bold text-gray-700 mb-3">1. Student Details</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2 flex items-end gap-3">
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700">Student Reg No *</label>
                            <input required type="text" name="regNo" value={formData.regNo} onChange={handleInputChange} disabled={isEditing} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border disabled:bg-gray-100" />
                          </div>
                          {!isEditing && (
                            <button type="button" onClick={fetchStudentDetails} disabled={fetchingStudent || !formData.regNo} className="mb-px px-4 py-2 bg-indigo-100 text-indigo-700 font-medium rounded-md hover:bg-indigo-200 disabled:opacity-50 border border-indigo-200 text-sm h-[38px]">
                              {fetchingStudent ? 'Fetching...' : 'Fetch Details'}
                            </button>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-gray-500">Name</label>
                          <div className="mt-1 font-medium text-gray-900 bg-white px-3 py-2 border rounded-md min-h-[38px]">{formData.studentName || '-'}</div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500">Programme & Batch</label>
                          <div className="mt-1 font-medium text-gray-900 bg-white px-3 py-2 border rounded-md min-h-[38px]">
                            {formData.programme && formData.batch ? `${formData.programme} (${formData.batch})` : '-'}
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500">Contact Number</label>
                          <div className="mt-1 font-medium text-gray-900 bg-white px-3 py-2 border rounded-md min-h-[38px]">{formData.mobile || '-'}</div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500">Email Address</label>
                          <div className="mt-1 font-medium text-gray-900 bg-white px-3 py-2 border rounded-md min-h-[38px] break-all">{formData.christEmail || formData.personalEmail || '-'}</div>
                        </div>
                      </div>
                    </div>

                    {/* Placement Details Section */}
                    <div>
                      <h4 className="text-sm font-bold text-gray-700 mb-3 border-b pb-2">2. Placement Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Placement Type *</label>
                          <select required name="placementType" value={formData.placementType} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border">
                            <option value="">Select Type</option>
                            <option value="Placement">Placement</option>
                            <option value="Internship">Internship</option>
                            <option value="Summer Internship">Summer Internship</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Source</label>
                          <select name="source" value={formData.source} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border">
                            <option value="">Select Source</option>
                            <option value="Campus">Campus</option>
                            <option value="Own">Own</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Start Date</label>
                          <DateInput  name="startDate" value={formData.startDate} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border" />
                        </div>
                        
                        {(formData.placementType === 'Internship' || formData.placementType === 'Summer Internship') && (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">End Date</label>
                              <DateInput  name="endDate" value={formData.endDate} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border" />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700">Calculated Duration</label>
                              <input type="text" readOnly value={formData.duration} placeholder="Calculated automatically..." className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm sm:text-sm py-2 px-3 border text-gray-600" />
                            </div>
                          </>
                        )}
                        
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Salary Details</label>
                          <div className="flex gap-4 items-center">
                            <input type="text" name="salary" value={formData.salary} onChange={handleInputChange} placeholder="Amount (e.g. 5,00,000)" className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border" />
                            <div className="flex gap-4">
                              <label className="inline-flex items-center">
                                <input type="radio" name="salaryType" value="CTC" checked={formData.salaryType === 'CTC'} onChange={handleInputChange} className="text-indigo-600 focus:ring-indigo-500" />
                                <span className="ml-2 text-sm text-gray-700">CTC</span>
                              </label>
                              <label className="inline-flex items-center">
                                <input type="radio" name="salaryType" value="Stipend" checked={formData.salaryType === 'Stipend'} onChange={handleInputChange} className="text-indigo-600 focus:ring-indigo-500" />
                                <span className="ml-2 text-sm text-gray-700">Stipend</span>
                              </label>
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Position</label>
                          <input type="text" name="position" value={formData.position} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Company / Organization *</label>
                          <input required type="text" name="company" value={formData.company} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border" />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Name of SPOC</label>
                          <input type="text" name="spocName" value={formData.spocName} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Email ID of SPOC</label>
                          <input type="email" name="spocEmail" value={formData.spocEmail} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border" />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700">Mobile Number of SPOC</label>
                          <input type="text" name="spocMobile" value={formData.spocMobile} onChange={handleInputChange} className="mt-1 block w-full md:w-1/2 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border" />
                        </div>
                      </div>
                    </div>

                    {/* Proofs Section */}
                    <div>
                      <h4 className="text-sm font-bold text-gray-700 mb-3 border-b pb-2">3. Proof Documentation</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FileUploadField
                          label="Offer Letter Proof"
                          folderId={DRIVE_FOLDER_IDS.placement}
                          value={formData.offerLetterProof}
                          onChange={(val) => setFormData(prev => ({ ...prev, offerLetterProof: val }))}
                          filePrefix={formData.regNo || 'unknown'}
                          fileType="offer"
                          allowLink={true}
                        />
                        <FileUploadField
                          label="Completion Letter Proof"
                          folderId={DRIVE_FOLDER_IDS.placement}
                          value={formData.completionLetterProof}
                          onChange={(val) => setFormData(prev => ({ ...prev, completionLetterProof: val }))}
                          filePrefix={formData.regNo || 'unknown'}
                          fileType="completion"
                          allowLink={true}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-gray-200">
                  <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 sm:ml-3 sm:w-auto sm:text-sm">
                    {isEditing ? 'Update Record' : 'Save Record'}
                  </button>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {isViewModalOpen && viewData && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setIsViewModalOpen(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between border-b pb-4 mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{viewData.studentName}</h3>
                    <p className="text-sm text-indigo-600 font-medium">{viewData.regNo} &bull; {viewData.programme} ({viewData.batch})</p>
                  </div>
                  <span className={`px-3 py-1 text-xs font-bold rounded-full ${viewData.placementType === 'Placement' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                    {viewData.placementType}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                  <div className="col-span-2 md:col-span-1"><span className="text-gray-500 block text-xs uppercase tracking-wider">Company</span> <p className="font-medium text-gray-900 mt-1">{viewData.company || '-'}</p></div>
                  <div className="col-span-2 md:col-span-1"><span className="text-gray-500 block text-xs uppercase tracking-wider">Position</span> <p className="font-medium text-gray-900 mt-1">{viewData.position || '-'}</p></div>
                  
                  <div><span className="text-gray-500 block text-xs uppercase tracking-wider">Source</span> <p className="font-medium text-gray-900 mt-1">{viewData.source || '-'}</p></div>
                  <div><span className="text-gray-500 block text-xs uppercase tracking-wider">Salary</span> <p className="font-medium text-gray-900 mt-1">{viewData.salary ? `${viewData.salary} (${viewData.salaryType})` : '-'}</p></div>

                  <div><span className="text-gray-500 block text-xs uppercase tracking-wider">Start Date</span> <p className="font-medium text-gray-900 mt-1">{viewData.startDate ? viewData.startDate.split('-').reverse().join('/') : '-'}</p></div>
                  {(viewData.placementType === 'Internship' || viewData.placementType === 'Summer Internship') && (
                    <>
                      <div><span className="text-gray-500 block text-xs uppercase tracking-wider">End Date</span> <p className="font-medium text-gray-900 mt-1">{viewData.endDate ? viewData.endDate.split('-').reverse().join('/') : '-'}</p></div>
                      <div><span className="text-gray-500 block text-xs uppercase tracking-wider">Duration</span> <p className="font-medium text-gray-900 mt-1">{viewData.duration || '-'}</p></div>
                    </>
                  )}
                  
                  <div className="col-span-2 border-t pt-4 mt-2">
                    <span className="text-gray-500 block text-xs font-bold uppercase tracking-wider mb-2">SPOC Details</span> 
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div><span className="text-gray-400 block text-[10px] uppercase">Name</span><p className="font-medium">{viewData.spocName || '-'}</p></div>
                      <div><span className="text-gray-400 block text-[10px] uppercase">Email</span><p className="font-medium truncate">{viewData.spocEmail || '-'}</p></div>
                      <div><span className="text-gray-400 block text-[10px] uppercase">Mobile</span><p className="font-medium">{viewData.spocMobile || '-'}</p></div>
                    </div>
                  </div>

                  <div className="col-span-2 border-t pt-4 mt-2">
                    <span className="text-gray-500 block text-xs font-bold uppercase tracking-wider mb-2">Proofs</span> 
                    <div className="flex gap-4">
                      {viewData.offerLetterProof ? (
                        <a href={viewData.offerLetterProof} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline flex items-center gap-1">
                          📄 Offer Letter
                        </a>
                      ) : <span className="text-gray-400">No Offer Letter</span>}
                      
                      {viewData.completionLetterProof ? (
                        <a href={viewData.completionLetterProof} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline flex items-center gap-1">
                          📄 Completion Letter
                        </a>
                      ) : <span className="text-gray-400">No Completion Letter</span>}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-gray-200">
                <button type="button" onClick={() => setIsViewModalOpen(false)} className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:ml-3 sm:w-auto sm:text-sm">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
