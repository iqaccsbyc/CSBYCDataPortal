import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, doc, deleteDoc, writeBatch, query, where } from 'firebase/firestore';
import { getDocsEncrypted as getDocs, setDocEncrypted as setDoc } from '../firebase/encryptedStore';
import { encryptData } from '../utils/encryption';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { hasCampusAccess } from '../utils/roleUtils';
import * as XLSX from 'xlsx';
import { PROGRAMMES as FALLBACK_PROGRAMMES } from './activity/constants';

const INITIAL_FORM_STATE = {
  regNo: '',
  studentName: '',
  batch: '',
  programme: '',
  section: '',
  mobile: '',
  christEmail: '',
  personalEmail: '',
  address: '',
  city: '',
  state: '',
  nri: 'No',
  nationality: 'Indian',
  gender: 'Male',
  Status: 'Onroll',
  Remarks: '',
  parentMobile: '',
  parentEmail: ''
};

export default function ManageStudents() {
  const { userRoles, deptCode } = useAuth();
  const isCampus = hasCampusAccess(userRoles);
  const [students, setStudents] = useState([]);
  const [programmes, setProgrammes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modals & Forms
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewData, setViewData] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingBulk, setUploadingBulk] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProgramme, setFilterProgramme] = useState('');
  const [filterBatch, setFilterBatch] = useState('');

  const hasAccess = userRoles?.some(r => ['admin', 'hod', 'assochod', 'coordinator', 'adminassist', 'faculty'].includes(r)) || isCampus;
  const canEdit = userRoles?.some(r => ['admin', 'hod', 'assochod', 'coordinator', 'adminassist'].includes(r)) || isCampus;

  useEffect(() => {
    if (hasAccess) {
      fetchData();
    } else {
      setIsLoading(false);
    }
  }, [hasAccess]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch Programmes
      let progSnap;
      if (isCampus) {
        progSnap = await getDocs(collection(db, 'programmes'));
      } else if (deptCode) {
        const q = query(collection(db, 'programmes'), where('departmentCode', '==', deptCode));
        progSnap = await getDocs(q);
      } else {
        setProgrammes([]);
        setStudents([]);
        setIsLoading(false);
        return;
      }

      let progs = [];
      let progNames = [];
      if (!progSnap.empty) {
        progs = progSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        progNames = progs.map(p => p.ProgrammeName || p.name || p.id);
      } else if (isCampus) {
        // Fallback seeding only for campus admin
        console.log("Seeding programmes collection...");
        const batch = writeBatch(db);
        FALLBACK_PROGRAMMES.forEach(prog => {
          const docRef = doc(db, 'programmes', prog.replace(/[^a-zA-Z0-9]/g, '_')); 
          batch.set(docRef, {
            ProgrammeName: prog,
            progcode: prog,
            departmentCode: 'CS-BYC'
          });
        });
        await batch.commit();
        progNames = FALLBACK_PROGRAMMES;
      }
      setProgrammes(progNames);

      // Fetch Students
      // Since students don't have deptCode yet, we fetch all and filter by programme in frontend for now,
      // or we can use where('programme', 'in', progNames) if progNames.length <= 30
      let stuSnap;
      if (isCampus) {
        stuSnap = await getDocs(collection(db, 'students'));
      } else if (progNames.length > 0 && progNames.length <= 30) {
        const q = query(collection(db, 'students'), where('programme', 'in', progNames));
        stuSnap = await getDocs(q);
      } else {
        // If too many programmes or none, fetch all and filter in frontend (less efficient but safe)
        stuSnap = await getDocs(collection(db, 'students'));
      }

      let stuData = stuSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Strict filtering for department roles if not using 'in' query
      if (!isCampus && (progNames.length === 0 || progNames.length > 30)) {
        stuData = stuData.filter(s => progNames.includes(s.programme));
      }

      setStudents(stuData.sort((a, b) => (a.regNo || '').localeCompare(b.regNo || '')));
    } catch (err) {
      console.error(err);
      setError('Failed to fetch data.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'regNo') {
      let batch = formData.batch;
      if (value.length >= 2 && !isNaN(value.substring(0, 2))) {
        const year = parseInt(value.substring(0, 2), 10);
        batch = `20${year}-${year + 1}`;
      }
      setFormData(prev => ({ ...prev, regNo: value, batch }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSaveStudent = async (e) => {
    e.preventDefault();
    if (!formData.regNo || !formData.studentName) {
      alert("Reg No and Name are required!");
      return;
    }
    try {
      // Use RegNo as the document ID to ensure uniqueness
      const docRef = doc(db, 'students', formData.regNo.trim());
      await setDoc(docRef, formData);
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Failed to save student.");
    }
  };

  const handleDelete = async (regNo) => {
    if (window.confirm(`Are you sure you want to delete student ${regNo}?`)) {
      try {
        await deleteDoc(doc(db, 'students', regNo));
        fetchData();
      } catch (err) {
        console.error(err);
        alert("Failed to delete student.");
      }
    }
  };

  const openAddModal = () => {
    setFormData(INITIAL_FORM_STATE);
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const openEditModal = (student) => {
    setFormData({
      ...student,
      Status: student.Status || (student.onroll === 'Yes' ? 'Onroll' : student.onroll === 'No' ? 'Discontinued' : 'Onroll'),
      Remarks: student.Remarks || '',
      parentMobile: student.parentMobile || '',
      parentEmail: student.parentEmail || ''
    });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const openViewModal = (student) => {
    setViewData(student);
    setIsViewModalOpen(true);
  };

  // Bulk Upload Logic
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingBulk(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          alert("Excel file is empty.");
          setUploadingBulk(false);
          return;
        }

        const batch = writeBatch(db);
        let count = 0;

        data.forEach(row => {
          // Map standard column names or variations
          const regNo = String(row['Reg No'] || row['Register Number'] || row['regNo'] || '').trim();
          if (!regNo) return; // skip rows without Reg No

          const studentName = String(row['Name'] || row['Student Name'] || row['studentName'] || '').trim();
          let batchYear = String(row['Batch'] || row['batch'] || '').trim();
          
          if (!batchYear && regNo.length >= 2 && !isNaN(regNo.substring(0, 2))) {
            const y = parseInt(regNo.substring(0, 2), 10);
            batchYear = `20${y}-${y + 1}`;
          }

          const studentData = {
            regNo: regNo,
            studentName: studentName,
            batch: batchYear,
            programme: String(row['Programme'] || row['programme'] || ''),
            section: String(row['Section'] || row['section'] || ''),
            mobile: String(row['Mobile'] || row['mobile'] || ''),
            christEmail: String(row['CHRIST Email'] || row['christEmail'] || ''),
            personalEmail: String(row['Personal Email'] || row['personalEmail'] || ''),
            address: String(row['Address'] || row['address'] || ''),
            city: String(row['City'] || row['city'] || ''),
            state: String(row['State'] || row['state'] || ''),
            nri: String(row['NRI'] || row['nri'] || 'No'),
            nationality: String(row['Nationality'] || row['nationality'] || 'Indian'),
            gender: String(row['Gender'] || row['gender'] || 'Male'),
            Status: String(row['Status'] || row['status'] || row['Onroll'] || row['onroll'] || 'Onroll'),
            Remarks: String(row['Remarks'] || row['remarks'] || ''),
            parentMobile: String(row['Parent Mobile'] || row['parentMobile'] || ''),
            parentEmail: String(row['Parent Email'] || row['parentEmail'] || '')
          };

          const docRef = doc(db, 'students', regNo);
          batch.set(docRef, studentData);
          count++;
        });

        if (count > 0) {
          await batch.commit();
          alert(`Successfully imported ${count} students.`);
          fetchData();
        } else {
          alert("No valid rows with 'Reg No' found in the file.");
        }
      } catch (err) {
        console.error(err);
        alert("Error parsing or uploading file. Ensure it's a valid Excel format.");
      } finally {
        setUploadingBulk(false);
        e.target.value = null; // reset file input
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleExport = () => {
    const sData = filteredStudents.map(s => ({
      "Reg No": s.regNo,
      "Name": s.studentName,
      "Batch": s.batch,
      "Programme": s.programme,
      "Section": s.section,
      "Mobile": s.mobile,
      "CHRIST Email": s.christEmail,
      "Personal Email": s.personalEmail,
      "Address": s.address,
      "City": s.city,
      "State": s.state,
      "NRI": s.nri,
      "Nationality": s.nationality,
      "Gender": s.gender,
      "Status": s.Status || (s.onroll === 'Yes' ? 'Onroll' : s.onroll === 'No' ? 'Discontinued' : 'Onroll'),
      "Remarks": s.Remarks || '',
      "Parent Mobile": s.parentMobile || '',
      "Parent Email": s.parentEmail || ''
    }));

    const ws = XLSX.utils.json_to_sheet(sData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, "Department_Students_Export.xlsx");
  };

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center py-20 p-4">
        <div className="bg-red-50 text-red-700 p-6 rounded-lg max-w-md w-full shadow border border-red-200">
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p>Your roles do not have permission to manage students.</p>
        </div>
      </div>
    );
  }

  const filteredStudents = students.filter(s => {
    const q = searchQuery.toLowerCase();
    const matchSearch = s.studentName.toLowerCase().includes(q) || s.regNo.toLowerCase().includes(q);
    const matchProg = filterProgramme ? s.programme === filterProgramme : true;
    const matchBatch = filterBatch ? s.batch === filterBatch : true;
    return matchSearch && matchProg && matchBatch;
  });

  const uniqueBatches = [...new Set(students.map(s => s.batch).filter(Boolean))].sort().reverse();

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <div className="mb-2">
          <Link to="/" className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1 w-max">
            <span>&larr;</span> Back to Dashboard
          </Link>
        </div>

        {/* Header */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Student Management</h1>
            <p className="text-sm text-gray-500 mt-1">Manage departmental student records</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {canEdit && (
              <button
                onClick={openAddModal}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 shadow-sm"
              >
                + Add Student
              </button>
            )}
            {canEdit && (
              <div className="relative">
                <input 
                  type="file" 
                  id="bulkUpload" 
                  className="hidden" 
                  accept=".xlsx, .xls, .csv" 
                  onChange={handleFileUpload} 
                  disabled={uploadingBulk}
                />
                <label 
                  htmlFor="bulkUpload" 
                  className={`px-4 py-2 ${uploadingBulk ? 'bg-gray-400' : 'bg-emerald-600 hover:bg-emerald-700'} text-white text-sm font-medium rounded-md shadow-sm cursor-pointer inline-block`}
                >
                  {uploadingBulk ? 'Uploading...' : 'Bulk Upload (Excel)'}
                </label>
              </div>
            )}
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 shadow-sm flex items-center gap-2"
            >
              Export
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Search Name / Reg No</label>
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
              {programmes.map((p, i) => <option key={i} value={p}>{p}</option>)}
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
                  <th className="px-4 py-3">Programme</th>
                  <th className="px-4 py-3">Batch</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr><td colSpan="6" className="text-center py-8 text-gray-500">Loading students...</td></tr>
                ) : filteredStudents.length === 0 ? (
                  <tr><td colSpan="6" className="text-center py-8 text-gray-500">No students found.</td></tr>
                ) : (
                  filteredStudents.map(student => (
                    <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-indigo-700">{student.regNo}</td>
                      <td className="px-4 py-3 font-medium">{student.studentName}</td>
                      <td className="px-4 py-3">{student.programme}</td>
                      <td className="px-4 py-3">{student.batch}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${student.Status === 'Onroll' || student.onroll === 'Yes' ? 'bg-green-100 text-green-800' : student.Status === 'Completed' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>
                          {student.Status || (student.onroll === 'Yes' ? 'Onroll' : student.onroll === 'No' ? 'Discontinued' : 'Onroll')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button onClick={() => openViewModal(student)} className="text-indigo-600 hover:text-indigo-900 font-medium text-xs">View</button>
                        {canEdit && (
                          <>
                            <button onClick={() => openEditModal(student)} className="text-blue-600 hover:text-blue-900 font-medium text-xs">Edit</button>
                            <button onClick={() => handleDelete(student.regNo)} className="text-red-600 hover:text-red-900 font-medium text-xs">Del</button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 text-sm text-gray-600">
            Showing {filteredStudents.length} students
          </div>
        </div>

      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setIsModalOpen(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <form onSubmit={handleSaveStudent}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg leading-6 font-bold text-gray-900 border-b pb-2 mb-4">
                    {isEditing ? 'Edit Student' : 'Add New Student'}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Reg No *</label>
                      <input required type="text" name="regNo" value={formData.regNo} onChange={handleInputChange} disabled={isEditing} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border disabled:bg-gray-100" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Student Name *</label>
                      <input required type="text" name="studentName" value={formData.studentName} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Batch (Auto-calculated)</label>
                      <input type="text" name="batch" value={formData.batch} readOnly className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border bg-gray-100 text-gray-600" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Programme *</label>
                      <select required name="programme" value={formData.programme} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border">
                        <option value="">Select Programme</option>
                        {programmes.map((p, i) => <option key={i} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Section</label>
                      <input type="text" name="section" value={formData.section} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Mobile</label>
                      <input type="text" name="mobile" value={formData.mobile} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">CHRIST Email</label>
                      <input type="email" name="christEmail" value={formData.christEmail} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Personal Email</label>
                      <input type="email" name="personalEmail" value={formData.personalEmail} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Parent Mobile</label>
                      <input type="text" name="parentMobile" value={formData.parentMobile || ''} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Parent Email</label>
                      <input type="email" name="parentEmail" value={formData.parentEmail || ''} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Address</label>
                      <input type="text" name="address" value={formData.address} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">City</label>
                      <input type="text" name="city" value={formData.city} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">State</label>
                      <input type="text" name="state" value={formData.state} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Nationality</label>
                      <input type="text" name="nationality" value={formData.nationality} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Gender</label>
                      <select name="gender" value={formData.gender} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border">
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">NRI</label>
                      <select name="nri" value={formData.nri} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border">
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Status</label>
                      <select name="Status" value={formData.Status || 'Onroll'} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border">
                        <option value="Onroll">Onroll</option>
                        <option value="Completed">Completed</option>
                        <option value="Discontinued">Discontinued</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Remarks (Comma separated)</label>
                      <input type="text" name="Remarks" value={formData.Remarks || ''} onChange={handleInputChange} placeholder="e.g. Needs Attention, Fee Pending" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border" />
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
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-gray-200">
                  <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 sm:ml-3 sm:w-auto sm:text-sm">
                    {isEditing ? 'Update Student' : 'Save Student'}
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
                  <span className={`px-3 py-1 text-xs font-bold rounded-full ${viewData.Status === 'Onroll' || viewData.onroll === 'Yes' ? 'bg-green-100 text-green-800' : viewData.Status === 'Completed' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>
                    {viewData.Status || (viewData.onroll === 'Yes' ? 'Onroll' : viewData.onroll === 'No' ? 'Discontinued' : 'Onroll')}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6 text-sm">
                  <div><span className="text-gray-500 block text-xs uppercase tracking-wider">Section</span> <p className="font-medium text-gray-900 mt-1">{viewData.section || '-'}</p></div>
                  <div><span className="text-gray-500 block text-xs uppercase tracking-wider">Gender</span> <p className="font-medium text-gray-900 mt-1">{viewData.gender || '-'}</p></div>
                  <div><span className="text-gray-500 block text-xs uppercase tracking-wider">Mobile</span> <p className="font-medium text-gray-900 mt-1">{viewData.mobile || '-'}</p></div>
                  <div className="col-span-2 md:col-span-1"><span className="text-gray-500 block text-xs uppercase tracking-wider">CHRIST Email</span> <p className="font-medium text-gray-900 mt-1 break-all">{viewData.christEmail || '-'}</p></div>
                  <div className="col-span-2 md:col-span-2"><span className="text-gray-500 block text-xs uppercase tracking-wider">Personal Email</span> <p className="font-medium text-gray-900 mt-1 break-all">{viewData.personalEmail || '-'}</p></div>
                  
                  <div><span className="text-gray-500 block text-xs uppercase tracking-wider">Parent Mobile</span> <p className="font-medium text-gray-900 mt-1">{viewData.parentMobile || '-'}</p></div>
                  <div className="col-span-2 md:col-span-2"><span className="text-gray-500 block text-xs uppercase tracking-wider">Parent Email</span> <p className="font-medium text-gray-900 mt-1 break-all">{viewData.parentEmail || '-'}</p></div>

                  <div className="col-span-2 md:col-span-3 border-t pt-4 mt-2">
                    <span className="text-gray-500 block text-xs uppercase tracking-wider">Address</span> 
                    <p className="font-medium text-gray-900 mt-1">{viewData.address || '-'}</p>
                  </div>
                  <div><span className="text-gray-500 block text-xs uppercase tracking-wider">City</span> <p className="font-medium text-gray-900 mt-1">{viewData.city || '-'}</p></div>
                  <div><span className="text-gray-500 block text-xs uppercase tracking-wider">State</span> <p className="font-medium text-gray-900 mt-1">{viewData.state || '-'}</p></div>
                  <div><span className="text-gray-500 block text-xs uppercase tracking-wider">Nationality / NRI</span> <p className="font-medium text-gray-900 mt-1">{viewData.nationality || '-'} / {viewData.nri === 'Yes' ? 'NRI' : 'Non-NRI'}</p></div>
                  <div className="col-span-2 md:col-span-3 border-t pt-4 mt-2">
                    <span className="text-gray-500 block text-xs uppercase tracking-wider">Remarks</span>
                    {viewData.Remarks ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {viewData.Remarks.split(',').filter(r => r.trim()).map((r, i) => (
                          <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-800">
                            {r.trim()}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="font-medium text-gray-900 mt-1">-</p>
                    )}
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
