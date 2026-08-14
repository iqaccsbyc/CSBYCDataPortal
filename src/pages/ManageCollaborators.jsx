import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, doc, deleteDoc, query, where } from 'firebase/firestore';
import { getDocsEncrypted as getDocs, setDocEncrypted as setDoc } from '../firebase/encryptedStore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { hasCampusAccess } from '../utils/roleUtils';
import * as XLSX from 'xlsx';

const COL_TYPES = ["Placement", "Internship", "Guest Lectures", "Curriculum Design", "General"];

const INITIAL_FORM_STATE = {
  company: '',
  companyUrl: '',
  address: '',
  city: '',
  sectors: '',
  collaborationType: '',
  spocName: '',
  spocEmail: '',
  spocMobile: '',
  targetAudience: 'Both',
  alreadyRecruited: 'No',
  department: ''
};

export default function ManageCollaborators() {
  const { user, userRoles, deptCode } = useAuth();
  const isCampus = hasCampusAccess(userRoles);

  const [collaborators, setCollaborators] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAudience, setFilterAudience] = useState('');
  const [filterRecruited, setFilterRecruited] = useState('');
  const [filterDept, setFilterDept] = useState('');

  useEffect(() => {
    if (isCampus) {
      getDocs(collection(db, 'departments')).then(snap => {
        setDepartments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
    }
    fetchData();
  }, [user, deptCode, isCampus]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      let data = [];
      if (isCampus) {
        const snap = await getDocs(collection(db, 'industryCollaborators'));
        data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } else {
        if (!deptCode) {
          const snapAll = await getDocs(query(collection(db, 'industryCollaborators'), where('department', '==', 'All')));
          data = snapAll.docs.map(d => ({ id: d.id, ...d.data() }));
        } else {
          const qDept = query(collection(db, 'industryCollaborators'), where('department', '==', deptCode));
          const qAll = query(collection(db, 'industryCollaborators'), where('department', '==', 'All'));
          const [snapDept, snapAll] = await Promise.all([getDocs(qDept), getDocs(qAll)]);
          const map = new Map();
          snapDept.docs.forEach(d => map.set(d.id, { id: d.id, ...d.data() }));
          snapAll.docs.forEach(d => map.set(d.id, { id: d.id, ...d.data() }));
          data = Array.from(map.values());
        }
      }
      
      data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setCollaborators(data);
    } catch (err) {
      console.error(err);
      alert('Failed to fetch data: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.company.trim()) return alert('Company name is required.');
    
    // Auto-generate doc ID if new
    const docId = isEditing && formData.id ? formData.id : `COLLAB_${Date.now()}`;
    const targetDept = isCampus ? (formData.department || 'All') : (deptCode || 'All');

    const payload = { 
      ...formData, 
      id: docId, 
      department: targetDept,
      lastUpdatedBy: user?.email,
      timestamp: formData.timestamp || new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'industryCollaborators', docId), payload);
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Failed to save collaborator: " + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this collaborator record?')) {
      try {
        await deleteDoc(doc(db, 'industryCollaborators', id));
        fetchData();
      } catch (err) {
        console.error(err);
        alert("Failed to delete collaborator.");
      }
    }
  };

  const openAddModal = () => {
    setFormData({ ...INITIAL_FORM_STATE, department: isCampus ? 'All' : deptCode });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setFormData(item);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleExport = () => {
    const sData = filteredData.map(s => ({
      "Company Name": s.company,
      "URL": s.companyUrl || '-',
      "Address": s.address || '-',
      "City": s.city || '-',
      "Sectors": s.sectors || '-',
      "Collaboration Type": s.collaborationType || '-',
      "SPOC Name": s.spocName || '-',
      "SPOC Email": s.spocEmail || '-',
      "SPOC Mobile": s.spocMobile || '-',
      "Target Audience": s.targetAudience,
      "Already Recruited?": s.alreadyRecruited,
      "Department": s.department,
      "Last Updated By": s.lastUpdatedBy,
      "Date Added": new Date(s.timestamp).toLocaleDateString('en-GB')
    }));

    const ws = XLSX.utils.json_to_sheet(sData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Collaborators");
    XLSX.writeFile(wb, "Industry_Collaborators.xlsx");
  };

  const filteredData = collaborators.filter(s => {
    const q = searchQuery.toLowerCase();
    const matchSearch = (s.company || '').toLowerCase().includes(q) || 
                        (s.spocName || '').toLowerCase().includes(q) ||
                        (s.city || '').toLowerCase().includes(q) ||
                        (s.sectors || '').toLowerCase().includes(q);
    const matchAudience = filterAudience ? s.targetAudience === filterAudience : true;
    const matchRecruited = filterRecruited ? s.alreadyRecruited === filterRecruited : true;
    const matchDept = filterDept ? s.department === filterDept : true;

    return matchSearch && matchAudience && matchRecruited && matchDept;
  });

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
            <h1 className="text-2xl font-bold text-gray-900">Industry Collaborators</h1>
            <p className="text-sm text-gray-500 mt-1">Manage database of industry partners and recruiters</p>
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
            <label className="block text-xs font-medium text-gray-700 mb-1">Search Details</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Company, SPOC, Sector..."
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3 border"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Filter by Audience</label>
            <select
              value={filterAudience}
              onChange={(e) => setFilterAudience(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3 border"
            >
              <option value="">All Audiences</option>
              <option value="UG">UG</option>
              <option value="PG">PG</option>
              <option value="Both">Both</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Recruitment Status</label>
            <select
              value={filterRecruited}
              onChange={(e) => setFilterRecruited(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3 border"
            >
              <option value="">All</option>
              <option value="Yes">Already Recruited</option>
              <option value="No">Not Yet Recruited</option>
            </select>
          </div>
          {isCampus && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Filter by Department</label>
              <select
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3 border"
              >
                <option value="">All Departments</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.id}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-800">Collaborator Database</h2>
            <span className="text-sm text-gray-500">{filteredData.length} records</span>
          </div>
          <div className="overflow-x-auto" style={{ maxHeight: '600px' }}>
            <table className="min-w-full text-sm text-left border-collapse">
              <thead className="bg-gray-50 text-gray-700 sticky top-0 z-10 shadow-sm border-b border-gray-200 font-semibold uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">Company Details</th>
                  <th className="px-4 py-3">Location & Sectors</th>
                  <th className="px-4 py-3">Collaboration Type</th>
                  <th className="px-4 py-3">SPOC Details</th>
                  <th className="px-4 py-3">Dept & Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr><td colSpan="6" className="text-center py-8 text-gray-500">Loading records...</td></tr>
                ) : filteredData.length === 0 ? (
                  <tr><td colSpan="6" className="text-center py-8 text-gray-500">No records found.</td></tr>
                ) : (
                  filteredData.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold text-gray-900">{item.company}</div>
                        {item.companyUrl && (
                          <a href={item.companyUrl} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:underline block truncate max-w-[200px] mt-0.5">
                            {item.companyUrl}
                          </a>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">{item.city || '-'}</div>
                        <div className="text-xs text-gray-500 mt-0.5 truncate max-w-[200px]">{item.sectors || 'N/A'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 text-xs rounded-full bg-indigo-100 text-indigo-800 font-medium">
                          {item.collaborationType || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">{item.spocName || 'No SPOC'}</div>
                        {item.spocEmail && <div className="text-[11px] text-gray-500">{item.spocEmail}</div>}
                        {item.spocMobile && <div className="text-[11px] text-gray-500">{item.spocMobile}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-[10px] uppercase font-bold rounded ${item.department === 'All' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                          {item.department}
                        </span>
                        <div className="text-[10px] mt-1 text-gray-500 uppercase tracking-wide">
                          Audience: <span className="font-bold text-gray-800">{item.targetAudience}</span>
                        </div>
                        <div className="text-[10px] text-gray-500 uppercase tracking-wide">
                          Recruited: <span className={`font-bold ${item.alreadyRecruited === 'Yes' ? 'text-green-600' : 'text-red-500'}`}>{item.alreadyRecruited}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button onClick={() => openEditModal(item)} className="text-blue-600 hover:text-blue-900 font-medium text-xs">Edit</button>
                        <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-900 font-medium text-xs">Del</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
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
                    {isEditing ? 'Edit Collaborator' : 'Add New Collaborator'}
                  </h3>
                  
                  <div className="space-y-6">
                    
                    {/* Organization Info */}
                    <div>
                      <h4 className="text-sm font-bold text-gray-700 mb-3 border-b pb-1">1. Organization Details</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Company / Partner Name *</label>
                          <input required type="text" name="company" value={formData.company} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Company Website URL</label>
                          <input type="url" name="companyUrl" value={formData.companyUrl} onChange={handleInputChange} placeholder="https://" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border" />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700">Sectors (Comma separated)</label>
                          <input type="text" name="sectors" value={formData.sectors} onChange={handleInputChange} placeholder="e.g. IT, Finance, Consulting, Core Engineering" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border" />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700">Address</label>
                          <textarea rows="2" name="address" value={formData.address} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border"></textarea>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">City</label>
                          <input type="text" name="city" value={formData.city} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border" />
                        </div>
                      </div>
                    </div>

                    {/* Collaboration Details */}
                    <div>
                      <h4 className="text-sm font-bold text-gray-700 mb-3 border-b pb-1">2. Collaboration Specs</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {isCampus ? (
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Target Department *</label>
                            <select required name="department" value={formData.department} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border">
                              <option value="All">All Departments</option>
                              {departments.map(d => <option key={d.id} value={d.id}>{d.id}</option>)}
                            </select>
                          </div>
                        ) : (
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Department</label>
                            <input type="text" disabled value={deptCode || 'None Assigned'} className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 text-gray-500 sm:text-sm py-2 px-3 border" />
                          </div>
                        )}
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Collaboration Type</label>
                          <select name="collaborationType" value={formData.collaborationType} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border">
                            <option value="">Select Type</option>
                            {COL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Target Audience</label>
                          <select name="targetAudience" value={formData.targetAudience} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border">
                            <option value="UG">UG</option>
                            <option value="PG">PG</option>
                            <option value="Both">Both</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Already Recruited?</label>
                          <div className="mt-2 flex gap-4">
                            <label className="inline-flex items-center">
                              <input type="radio" name="alreadyRecruited" value="Yes" checked={formData.alreadyRecruited === 'Yes'} onChange={handleInputChange} className="text-indigo-600 focus:ring-indigo-500" />
                              <span className="ml-2 text-sm text-gray-700">Yes</span>
                            </label>
                            <label className="inline-flex items-center">
                              <input type="radio" name="alreadyRecruited" value="No" checked={formData.alreadyRecruited === 'No'} onChange={handleInputChange} className="text-indigo-600 focus:ring-indigo-500" />
                              <span className="ml-2 text-sm text-gray-700">No</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* SPOC Info */}
                    <div>
                      <h4 className="text-sm font-bold text-gray-700 mb-3 border-b pb-1">3. SPOC Details</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Name of SPOC</label>
                          <input type="text" name="spocName" value={formData.spocName} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Email ID of SPOC</label>
                          <input type="email" name="spocEmail" value={formData.spocEmail} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Mobile Number of SPOC</label>
                          <input type="text" name="spocMobile" value={formData.spocMobile} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border" />
                        </div>
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

    </div>
  );
}
