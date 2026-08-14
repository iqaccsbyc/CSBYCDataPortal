import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, doc, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import * as XLSX from 'xlsx';

const INITIAL_WORK = { companyName: '', designation: '', fromYear: '', toYear: '' };

const INITIAL_FINANCIAL = { amount: '', date: '', purpose: '' };
const INITIAL_ACADEMIC = { description: '' };

const INITIAL_FORM_STATE = {
  fullName: '',
  email: '',
  phone: '',
  website: '',
  linkedin: '',
  batch: '',
  programme: '',
  specializations: '',
  workHistory: [INITIAL_WORK],
  financialContributions: [],
  academicContributions: [],
};

// Generate batches from 2022 to 2032 in ascending order
const BATCHES = Array.from({ length: 11 }, (_, i) => String(2022 + i));

export default function ManageAlumni() {
  const { userRoles } = useAuth();
  const [alumni, setAlumni] = useState([]);
  const [programmes, setProgrammes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modals & Forms
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewData, setViewData] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [isEditing, setIsEditing] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProgramme, setFilterProgramme] = useState('');
  const [filterBatch, setFilterBatch] = useState('');

  // Determine permissions
  const canEdit = userRoles?.some(r => ['admin', 'hod', 'assochod', 'coordinator', 'adminassist', 'campusalumniteam', 'deptalumniteam'].includes(r));
  const hasAccess = true; // All authenticated users (faculty) can view

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch Programmes for dropdown
      const progSnap = await getDocs(collection(db, 'programmes'));
      const progs = progSnap.docs.map(d => {
        const data = d.data();
        return data.ProgrammeName || data.name || d.id;
      });
      setProgrammes([...new Set(progs)].sort());

      // Fetch Alumni
      const alSnap = await getDocs(query(collection(db, 'alumni')));
      const alData = alSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAlumni(alData.sort((a, b) => a.fullName.localeCompare(b.fullName)));
    } catch (err) {
      console.error("Failed to fetch data:", err);
      alert("Failed to load alumni data.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleWorkChange = (index, field, value) => {
    const updatedWork = [...formData.workHistory];
    updatedWork[index] = { ...updatedWork[index], [field]: value };
    setFormData(prev => ({ ...prev, workHistory: updatedWork }));
  };

  const addWorkEntry = () => {
    // Add new entry at the top so latest is at the top
    setFormData(prev => ({ ...prev, workHistory: [{ ...INITIAL_WORK }, ...prev.workHistory] }));
  };

  const removeWorkEntry = (index) => {
    const updatedWork = [...formData.workHistory];
    updatedWork.splice(index, 1);
    setFormData(prev => ({ ...prev, workHistory: updatedWork }));
  };

  const handleFinancialChange = (index, field, value) => {
    const updated = [...(formData.financialContributions || [])];
    updated[index] = { ...updated[index], [field]: value };
    setFormData(prev => ({ ...prev, financialContributions: updated }));
  };

  const addFinancialEntry = () => {
    setFormData(prev => ({ ...prev, financialContributions: [...(prev.financialContributions || []), { ...INITIAL_FINANCIAL }] }));
  };

  const removeFinancialEntry = (index) => {
    const updated = [...(formData.financialContributions || [])];
    updated.splice(index, 1);
    setFormData(prev => ({ ...prev, financialContributions: updated }));
  };

  const handleAcademicChange = (index, value) => {
    const updated = [...(formData.academicContributions || [])];
    updated[index] = { ...updated[index], description: value };
    setFormData(prev => ({ ...prev, academicContributions: updated }));
  };

  const addAcademicEntry = () => {
    setFormData(prev => ({ ...prev, academicContributions: [...(prev.academicContributions || []), { ...INITIAL_ACADEMIC }] }));
  };

  const removeAcademicEntry = (index) => {
    const updated = [...(formData.academicContributions || [])];
    updated.splice(index, 1);
    setFormData(prev => ({ ...prev, academicContributions: updated }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.fullName || !formData.batch || !formData.programme) {
      alert("Name, Batch, and Programme are required.");
      return;
    }
    try {
      const docId = isEditing ? formData.id : Date.now().toString(); // Use timestamp as ID for new
      const docRef = doc(db, 'alumni', docId);
      
      const saveData = {
        ...formData,
        id: docId,
        updatedAt: new Date().toISOString()
      };

      await setDoc(docRef, saveData);
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Failed to save alumni record.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this alumni record?")) {
      try {
        await deleteDoc(doc(db, 'alumni', id));
        fetchData();
      } catch (err) {
        console.error(err);
        alert("Failed to delete record.");
      }
    }
  };

  const openAddModal = () => {
    setFormData(INITIAL_FORM_STATE);
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const openEditModal = (alumnus) => {
    setFormData({
      ...INITIAL_FORM_STATE,
      ...alumnus,
      workHistory: alumnus.workHistory?.length ? alumnus.workHistory : [INITIAL_WORK],
      financialContributions: alumnus.financialContributions || [],
      academicContributions: alumnus.academicContributions || []
    });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const openViewModal = (alumnus) => {
    setViewData(alumnus);
    setIsViewModalOpen(true);
  };

  const handleExport = () => {
    const exportData = filteredAlumni.map(a => {
      // Primary work (topmost)
      const primaryWork = a.workHistory?.[0] || {};
      
      return {
        "Full Name": a.fullName,
        "Email": a.email,
        "Phone": a.phone,
        "Website/Repo": a.website || '',
        "LinkedIn": a.linkedin || '',
        "Batch": a.batch,
        "Programme": a.programme,
        "Specializations": a.specializations,
        "Current Company": primaryWork.companyName || '',
        "Current Designation": primaryWork.designation || '',
        "Work From Year": primaryWork.fromYear || '',
        "Work To Year": primaryWork.toYear || '',
        "All Companies": a.workHistory?.map(w => `${w.companyName} (${w.designation})`).join(' | ') || '',
        "Total Financial Contributions": a.financialContributions?.length || 0,
        "Total Academic Contributions": a.academicContributions?.length || 0
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Alumni");
    XLSX.writeFile(wb, "Alumni_Network_Export.xlsx");
  };

  const filteredAlumni = alumni.filter(a => {
    const q = searchQuery.toLowerCase();
    
    // Check main fields
    let matchSearch = a.fullName.toLowerCase().includes(q) || 
                      (a.specializations || '').toLowerCase().includes(q) ||
                      (a.email || '').toLowerCase().includes(q);
                      
    // Also search in work history (company and designation)
    if (!matchSearch && a.workHistory) {
      matchSearch = a.workHistory.some(w => 
        (w.companyName || '').toLowerCase().includes(q) || 
        (w.designation || '').toLowerCase().includes(q)
      );
    }

    const matchProg = filterProgramme ? a.programme === filterProgramme : true;
    const matchBatch = filterBatch ? a.batch === filterBatch : true;
    return matchSearch && matchProg && matchBatch;
  });

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
            <h1 className="text-2xl font-bold text-gray-900">Alumni Network</h1>
            <p className="text-sm text-gray-500 mt-1">Manage departmental alumni details and professional history</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {canEdit && (
              <button
                onClick={openAddModal}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 shadow-sm"
              >
                + Add Alumni
              </button>
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
            <label className="block text-xs font-medium text-gray-700 mb-1">Search (Name, Spec, Company, Desig)</label>
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
              {BATCHES.map((b, i) => <option key={i} value={b}>{b}</option>)}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto" style={{ maxHeight: '600px' }}>
            <table className="min-w-full text-sm text-left border-collapse">
              <thead className="bg-gray-50 text-gray-700 sticky top-0 z-10 shadow-sm border-b border-gray-200 font-semibold uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Programme / Batch</th>
                  <th className="px-4 py-3">Latest Company</th>
                  <th className="px-4 py-3">Designation</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr><td colSpan="5" className="text-center py-8 text-gray-500">Loading alumni...</td></tr>
                ) : filteredAlumni.length === 0 ? (
                  <tr><td colSpan="5" className="text-center py-8 text-gray-500">No alumni found.</td></tr>
                ) : (
                  filteredAlumni.map(a => {
                    const latestWork = a.workHistory?.[0] || {};
                    return (
                      <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-indigo-700">{a.fullName}</td>
                        <td className="px-4 py-3">
                          {a.programme} <span className="text-gray-500 text-xs">({a.batch})</span>
                        </td>
                        <td className="px-4 py-3">{latestWork.companyName || '-'}</td>
                        <td className="px-4 py-3">{latestWork.designation || '-'}</td>
                        <td className="px-4 py-3 text-right space-x-2">
                          <button onClick={() => openViewModal(a)} className="text-indigo-600 hover:text-indigo-900 font-medium text-xs">View</button>
                          {canEdit && (
                            <>
                              <button onClick={() => openEditModal(a)} className="text-blue-600 hover:text-blue-900 font-medium text-xs">Edit</button>
                              <button onClick={() => handleDelete(a.id)} className="text-red-600 hover:text-red-900 font-medium text-xs">Del</button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 text-sm text-gray-600">
            Showing {filteredAlumni.length} alumni
          </div>
        </div>

      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setIsModalOpen(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <form onSubmit={handleSave}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 max-h-[80vh] overflow-y-auto">
                  <h3 className="text-xl leading-6 font-bold text-gray-900 border-b pb-3 mb-5">
                    {isEditing ? 'Edit Alumni' : 'Add New Alumni'}
                  </h3>
                  
                  <div className="mb-6">
                    <h4 className="text-base font-semibold text-gray-800 mb-3 bg-gray-50 p-2 rounded">Basic & Educational Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Full Name *</label>
                        <input required type="text" name="fullName" value={formData.fullName} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Phone</label>
                        <input type="text" name="phone" value={formData.phone} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Website / Digital Repo</label>
                        <input type="url" name="website" value={formData.website} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border" placeholder="https://..." />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">LinkedIn Profile</label>
                        <input type="url" name="linkedin" value={formData.linkedin} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border" placeholder="https://linkedin.com/in/..." />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Specializations</label>
                        <input type="text" name="specializations" value={formData.specializations} onChange={handleInputChange} placeholder="e.g. Data Science, ML" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Programme *</label>
                        <select required name="programme" value={formData.programme} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border">
                          <option value="">Select Programme</option>
                          {programmes.map((p, i) => <option key={i} value={p}>{p}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Batch *</label>
                        <select required name="batch" value={formData.batch} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border">
                          <option value="">Select Batch Year</option>
                          {BATCHES.map((b, i) => <option key={i} value={b}>{b}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between bg-gray-50 p-2 rounded mb-3">
                      <h4 className="text-base font-semibold text-gray-800">Working Details</h4>
                      <button type="button" onClick={addWorkEntry} className="text-sm bg-indigo-100 text-indigo-700 px-3 py-1 rounded hover:bg-indigo-200 font-medium">
                        + Add Company
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mb-3 px-2">List companies from latest to oldest. The first entry is considered the current/latest job.</p>
                    
                    <div className="space-y-4 px-2">
                      {formData.workHistory.map((work, index) => (
                        <div key={index} className="p-4 border border-gray-200 rounded-md relative bg-white shadow-sm">
                          {formData.workHistory.length > 1 && (
                            <button type="button" onClick={() => removeWorkEntry(index)} className="absolute top-2 right-2 text-red-500 hover:text-red-700" title="Remove">
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-6">
                            <div>
                              <label className="block text-xs font-medium text-gray-700">Company Name</label>
                              <input type="text" value={work.companyName} onChange={(e) => handleWorkChange(index, 'companyName', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border" />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700">Designation</label>
                              <input type="text" value={work.designation} onChange={(e) => handleWorkChange(index, 'designation', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border" />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700">From Year</label>
                              <input type="text" value={work.fromYear} onChange={(e) => handleWorkChange(index, 'fromYear', e.target.value)} placeholder="e.g. 2020" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border" />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700">To Year</label>
                              <input type="text" value={work.toYear} onChange={(e) => handleWorkChange(index, 'toYear', e.target.value)} placeholder="e.g. 2023 or Present" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 border-t pt-6">
                    <h4 className="text-base font-semibold text-gray-800 mb-4 bg-gray-50 p-2 rounded">Contributions</h4>
                    
                    {/* Financial Contributions */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-2 px-2">
                        <h5 className="text-sm font-bold text-gray-700">1. Financial Contributions</h5>
                        <button type="button" onClick={addFinancialEntry} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200 font-medium">
                          + Add Financial
                        </button>
                      </div>
                      <div className="space-y-3 px-2">
                        {formData.financialContributions?.map((fin, index) => (
                          <div key={index} className="p-3 border border-gray-200 rounded-md relative bg-white shadow-sm flex flex-col md:flex-row gap-3">
                            <button type="button" onClick={() => removeFinancialEntry(index)} className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 hover:bg-red-200" title="Remove">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                            <div className="flex-1">
                              <label className="block text-xs font-medium text-gray-700">Amount</label>
                              <input type="text" value={fin.amount} onChange={(e) => handleFinancialChange(index, 'amount', e.target.value)} placeholder="e.g. ₹50,000" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-1.5 px-2 border" />
                            </div>
                            <div className="flex-1">
                              <label className="block text-xs font-medium text-gray-700">Date</label>
                              <input type="date" value={fin.date} onChange={(e) => handleFinancialChange(index, 'date', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-1.5 px-2 border" />
                            </div>
                            <div className="flex-[2]">
                              <label className="block text-xs font-medium text-gray-700">Purpose</label>
                              <input type="text" value={fin.purpose} onChange={(e) => handleFinancialChange(index, 'purpose', e.target.value)} placeholder="e.g. Scholarship Fund" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-1.5 px-2 border" />
                            </div>
                          </div>
                        ))}
                        {(!formData.financialContributions || formData.financialContributions.length === 0) && (
                          <p className="text-xs text-gray-500 italic">No financial contributions added.</p>
                        )}
                      </div>
                    </div>

                    {/* Academic Contributions */}
                    <div>
                      <div className="flex items-center justify-between mb-2 px-2">
                        <h5 className="text-sm font-bold text-gray-700">2. Academic Contributions</h5>
                        <button type="button" onClick={addAcademicEntry} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 font-medium">
                          + Add Academic
                        </button>
                      </div>
                      <div className="space-y-3 px-2">
                        {formData.academicContributions?.map((acad, index) => (
                          <div key={index} className="relative flex items-center gap-2">
                            <input type="text" value={acad.description} onChange={(e) => handleAcademicChange(index, e.target.value)} placeholder="e.g. Guest Lecture on AI, Mentorship Program" className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border" />
                            <button type="button" onClick={() => removeAcademicEntry(index)} className="bg-red-100 text-red-600 rounded p-2 hover:bg-red-200 shrink-0" title="Remove">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        ))}
                        {(!formData.academicContributions || formData.academicContributions.length === 0) && (
                          <p className="text-xs text-gray-500 italic">No academic contributions added.</p>
                        )}
                      </div>
                    </div>
                  </div>

                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-gray-200">
                  <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 sm:ml-3 sm:w-auto sm:text-sm">
                    {isEditing ? 'Update Alumni' : 'Save Alumni'}
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
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 max-h-[80vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b pb-4 mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{viewData.fullName}</h3>
                    <p className="text-sm text-indigo-600 font-medium mt-1">{viewData.programme} &bull; Batch of {viewData.batch}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 text-sm mb-6 bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <div><span className="text-gray-500 block text-xs uppercase tracking-wider font-semibold">Email</span> <p className="font-medium text-gray-900 mt-1">{viewData.email || '-'}</p></div>
                  <div><span className="text-gray-500 block text-xs uppercase tracking-wider font-semibold">Phone</span> <p className="font-medium text-gray-900 mt-1">{viewData.phone || '-'}</p></div>
                  <div>
                    <span className="text-gray-500 block text-xs uppercase tracking-wider font-semibold">Website / Repo</span>
                    {viewData.website ? <a href={viewData.website} target="_blank" rel="noreferrer" className="font-medium text-indigo-600 hover:underline mt-1 block truncate">{viewData.website}</a> : <p className="font-medium text-gray-900 mt-1">-</p>}
                  </div>
                  <div>
                    <span className="text-gray-500 block text-xs uppercase tracking-wider font-semibold">LinkedIn</span> 
                    {viewData.linkedin ? <a href={viewData.linkedin} target="_blank" rel="noreferrer" className="font-medium text-indigo-600 hover:underline mt-1 block truncate">{viewData.linkedin}</a> : <p className="font-medium text-gray-900 mt-1">-</p>}
                  </div>
                  <div className="md:col-span-2"><span className="text-gray-500 block text-xs uppercase tracking-wider font-semibold">Specializations</span> <p className="font-medium text-gray-900 mt-1">{viewData.specializations || '-'}</p></div>
                </div>

                <div>
                  <h4 className="text-lg font-bold text-gray-900 mb-3 border-b pb-2">Professional History</h4>
                  {viewData.workHistory && viewData.workHistory.length > 0 ? (
                    <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:ml-[8.5rem] md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-indigo-300 before:to-indigo-100">
                      {viewData.workHistory.map((work, idx) => (
                        <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-indigo-100 text-indigo-600 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded border border-gray-200 shadow-sm ml-4 md:ml-0 md:mr-4 md:group-even:ml-4 md:group-even:mr-0">
                            <div className="flex flex-col mb-1">
                              <span className="font-bold text-gray-900 text-base">{work.designation || 'Designation not specified'}</span>
                              <span className="text-indigo-600 font-medium text-sm">{work.companyName || 'Company not specified'}</span>
                            </div>
                            <div className="text-gray-500 text-xs mt-2 bg-gray-50 inline-block px-2 py-1 rounded">
                              {work.fromYear || '?'} &mdash; {work.toYear || 'Present'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No work history provided.</p>
                  )}
                </div>

                {((viewData.financialContributions && viewData.financialContributions.length > 0) || 
                  (viewData.academicContributions && viewData.academicContributions.length > 0)) && (
                  <div className="mt-8">
                    <h4 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Contributions to Department</h4>
                    
                    {viewData.financialContributions && viewData.financialContributions.length > 0 && (
                      <div className="mb-6">
                        <h5 className="text-sm font-bold text-gray-700 mb-3 bg-gray-50 inline-block px-3 py-1 rounded">Financial</h5>
                        <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
                          {viewData.financialContributions.map((fin, idx) => (
                            <div key={idx} className="border border-gray-200 p-3 rounded bg-white shadow-sm">
                              <div className="flex justify-between items-start mb-1">
                                <span className="font-bold text-green-700">{fin.amount || 'Amount N/A'}</span>
                                <span className="text-xs text-gray-500">{fin.date || 'Date N/A'}</span>
                              </div>
                              <p className="text-sm text-gray-800">{fin.purpose || 'Purpose not specified'}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {viewData.academicContributions && viewData.academicContributions.length > 0 && (
                      <div>
                        <h5 className="text-sm font-bold text-gray-700 mb-3 bg-gray-50 inline-block px-3 py-1 rounded">Academic</h5>
                        <ul className="list-disc pl-5 space-y-2">
                          {viewData.academicContributions.map((acad, idx) => (
                            <li key={idx} className="text-sm text-gray-800">{acad.description || 'Contribution description missing'}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
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
