import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, doc, setDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { hasCampusAccess } from '../utils/roleUtils';
import TagsInput from '../components/TagsInput';
import * as XLSX from 'xlsx';

const INITIAL_FORM_STATE = {
  researcherName: '',
  category: 'National',
  parentInstitution: '',
  institutionRanking: '',
  email: '',
  mobile: '',
  country: '',
  linkedIn: '',
  website: '',
  orcidId: '',
  scopusId: '',
  institutionalWebsite: '',
  specializations: [],
  hasMou: 'No',
  alreadyPublished: 'No',
  publishedDetails: '',
  department: ''
};

export default function ManageResearchCollaborators() {
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
  const [filterCategory, setFilterCategory] = useState('');
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
        const snap = await getDocs(collection(db, 'researchCollaborators'));
        data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } else {
        if (!deptCode) {
          const snapAll = await getDocs(query(collection(db, 'researchCollaborators'), where('department', '==', 'All')));
          data = snapAll.docs.map(d => ({ id: d.id, ...d.data() }));
        } else {
          const qDept = query(collection(db, 'researchCollaborators'), where('department', '==', deptCode));
          const qAll = query(collection(db, 'researchCollaborators'), where('department', '==', 'All'));
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
    if (!formData.researcherName.trim()) return alert('Researcher Name is required.');
    if (!formData.parentInstitution.trim()) return alert('Parent Institution is required.');
    
    // Auto-generate doc ID if new
    const docId = isEditing && formData.id ? formData.id : `RES_COLLAB_${Date.now()}`;
    const targetDept = isCampus ? (formData.department || 'All') : (deptCode || 'All');

    const payload = { 
      ...formData, 
      id: docId, 
      department: targetDept,
      lastUpdatedBy: user?.email, // Using this as CHRIST SPOC
      timestamp: formData.timestamp || new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'researchCollaborators', docId), payload);
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Failed to save collaborator: " + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this research collaborator record?')) {
      try {
        await deleteDoc(doc(db, 'researchCollaborators', id));
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
      "Researcher Name": s.researcherName,
      "Category": s.category,
      "Parent Institution": s.parentInstitution,
      "Institution Ranking": s.institutionRanking || '-',
      "Email": s.email || '-',
      "Mobile": s.mobile || '-',
      "Country": s.country || '-',
      "LinkedIn": s.linkedIn || '-',
      "Individual Website": s.website || '-',
      "Institutional Website": s.institutionalWebsite || '-',
      "ORCID iD": s.orcidId || '-',
      "SCOPUS ID": s.scopusId || '-',
      "Specializations": (s.specializations || []).join(', ') || '-',
      "MoU with CHRIST": s.hasMou,
      "Already Published": s.alreadyPublished,
      "Published Details": s.publishedDetails || '-',
      "Department": s.department,
      "CHRIST SPOC": s.lastUpdatedBy,
      "Date Added": new Date(s.timestamp).toLocaleDateString('en-GB')
    }));

    const ws = XLSX.utils.json_to_sheet(sData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Research Collaborators");
    XLSX.writeFile(wb, "Research_Collaborators.xlsx");
  };

  const filteredData = collaborators.filter(s => {
    const q = searchQuery.toLowerCase();
    const matchSearch = (s.researcherName || '').toLowerCase().includes(q) || 
                        (s.parentInstitution || '').toLowerCase().includes(q) ||
                        (s.country || '').toLowerCase().includes(q) ||
                        (s.institutionRanking || '').toLowerCase().includes(q);
    const matchCategory = filterCategory ? s.category === filterCategory : true;
    const matchDept = filterDept ? s.department === filterDept : true;

    return matchSearch && matchCategory && matchDept;
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
            <h1 className="text-2xl font-bold text-gray-900">Research Collaborators</h1>
            <p className="text-sm text-gray-500 mt-1">Manage database of research partners and their institutions</p>
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
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Search Details</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Researcher, Institution, Country..."
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3 border"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Filter by Category</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3 border"
            >
              <option value="">All Categories</option>
              <option value="National">National</option>
              <option value="International">International</option>
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
                  <th className="px-4 py-3">Researcher Info</th>
                  <th className="px-4 py-3">Institution & IDs</th>
                  <th className="px-4 py-3">Collaboration Status</th>
                  <th className="px-4 py-3">Dept & SPOC</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr><td colSpan="5" className="text-center py-8 text-gray-500">Loading records...</td></tr>
                ) : filteredData.length === 0 ? (
                  <tr><td colSpan="5" className="text-center py-8 text-gray-500">No records found.</td></tr>
                ) : (
                  filteredData.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 align-top">
                        <div className="font-bold text-gray-900">{item.researcherName}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          <span className={`px-2 py-0.5 rounded-full ${item.category === 'International' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                            {item.category}
                          </span>
                        </div>
                        {item.email && <div className="text-[11px] text-gray-500 mt-1">{item.email}</div>}
                        {item.mobile && <div className="text-[11px] text-gray-500">{item.mobile}</div>}
                        {item.country && <div className="text-[11px] text-gray-500">{item.country}</div>}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="font-medium text-gray-800">{item.parentInstitution}</div>
                        {item.institutionRanking && <div className="text-[11px] text-gray-500">Rank: {item.institutionRanking}</div>}
                        <div className="mt-1 space-y-0.5">
                          {item.orcidId && <div className="text-[10px] text-gray-500">ORCID: <span className="font-mono text-gray-700">{item.orcidId}</span></div>}
                          {item.scopusId && <div className="text-[10px] text-gray-500">SCOPUS: <span className="font-mono text-gray-700">{item.scopusId}</span></div>}
                          {item.linkedIn && <a href={item.linkedIn} target="_blank" rel="noreferrer" className="text-[10px] text-indigo-600 hover:underline block truncate max-w-[150px]">LinkedIn</a>}
                          {item.website && <a href={item.website} target="_blank" rel="noreferrer" className="text-[10px] text-indigo-600 hover:underline block truncate max-w-[150px]">Individual Web</a>}
                          {item.institutionalWebsite && <a href={item.institutionalWebsite} target="_blank" rel="noreferrer" className="text-[10px] text-indigo-600 hover:underline block truncate max-w-[150px]">Institutional Web</a>}
                        </div>
                        {item.specializations && item.specializations.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {item.specializations.map((spec, i) => (
                              <span key={i} className="px-1.5 py-0.5 text-[9px] font-medium bg-gray-100 text-gray-700 rounded border border-gray-200">
                                {spec}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="text-xs space-y-1">
                          <div>
                            <span className="text-gray-500">MoU with CHRIST: </span>
                            <span className={`font-medium ${item.hasMou === 'Yes' ? 'text-green-600' : 'text-gray-700'}`}>{item.hasMou}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Already Published: </span>
                            <span className={`font-medium ${item.alreadyPublished === 'Yes' ? 'text-green-600' : 'text-gray-700'}`}>{item.alreadyPublished}</span>
                          </div>
                          {item.alreadyPublished === 'Yes' && item.publishedDetails && (
                            <div className="text-[10px] text-gray-500 mt-1 max-w-[200px] truncate" title={item.publishedDetails}>
                              {item.publishedDetails}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span className={`px-2 py-1 text-[10px] uppercase font-bold rounded ${item.department === 'All' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                          {item.department}
                        </span>
                        <div className="text-[10px] mt-2 text-gray-500">
                          SPOC:<br/>
                          <span className="font-medium text-gray-800">{item.lastUpdatedBy || 'Unknown'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2 align-top">
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
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <form onSubmit={handleSave}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 max-h-[85vh] overflow-y-auto">
                  <h3 className="text-lg leading-6 font-bold text-gray-900 border-b pb-2 mb-4">
                    {isEditing ? 'Edit Research Collaborator' : 'Add New Research Collaborator'}
                  </h3>
                  
                  <div className="space-y-6">
                    
                    {/* Researcher & Institution Details */}
                    <div>
                      <h4 className="text-sm font-bold text-gray-700 mb-3 border-b pb-1">1. Researcher & Institution Details</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Researcher Name *</label>
                          <input required type="text" name="researcherName" value={formData.researcherName} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Category</label>
                          <select name="category" value={formData.category} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border">
                            <option value="National">National</option>
                            <option value="International">International</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Parent Institution *</label>
                          <input required type="text" name="parentInstitution" value={formData.parentInstitution} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Institution Ranking (comma separated)</label>
                          <input type="text" name="institutionRanking" value={formData.institutionRanking} onChange={handleInputChange} placeholder="e.g. QS 100, NIRF 10" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Email Address</label>
                          <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Mobile Number</label>
                          <input type="text" name="mobile" value={formData.mobile} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Country</label>
                          <input type="text" name="country" value={formData.country} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border" />
                        </div>
                      </div>
                    </div>

                    {/* Professional IDs & Links */}
                    <div>
                      <h4 className="text-sm font-bold text-gray-700 mb-3 border-b pb-1">2. Professional IDs & Links</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">ORCID iD</label>
                          <input type="text" name="orcidId" value={formData.orcidId} onChange={handleInputChange} placeholder="0000-0000-0000-0000" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">SCOPUS ID</label>
                          <input type="text" name="scopusId" value={formData.scopusId} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">LinkedIn Profile URL</label>
                          <input type="url" name="linkedIn" value={formData.linkedIn} onChange={handleInputChange} placeholder="https://linkedin.com/in/..." className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Individual Website</label>
                          <input type="url" name="website" value={formData.website} onChange={handleInputChange} placeholder="https://" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Institutional Website (Profile)</label>
                          <input type="url" name="institutionalWebsite" value={formData.institutionalWebsite || ''} onChange={handleInputChange} placeholder="https://" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border" />
                        </div>
                      </div>
                    </div>

                    {/* Specializations */}
                    <div>
                      <h4 className="text-sm font-bold text-gray-700 mb-3 border-b pb-1">3. Specializations</h4>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tags (Press Enter or Comma to add)</label>
                        <TagsInput 
                          tags={formData.specializations || []} 
                          onChange={(newTags) => setFormData(prev => ({ ...prev, specializations: newTags }))} 
                          placeholder="e.g. Machine Learning, Cloud Computing"
                        />
                      </div>
                    </div>

                    {/* Collaboration Details */}
                    <div>
                      <h4 className="text-sm font-bold text-gray-700 mb-3 border-b pb-1">4. Collaboration Details</h4>
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
                          <label className="block text-sm font-medium text-gray-700">Parent institution has MoU with CHRIST?</label>
                          <div className="mt-2 flex gap-4">
                            <label className="inline-flex items-center">
                              <input type="radio" name="hasMou" value="Yes" checked={formData.hasMou === 'Yes'} onChange={handleInputChange} className="text-indigo-600 focus:ring-indigo-500" />
                              <span className="ml-2 text-sm text-gray-700">Yes</span>
                            </label>
                            <label className="inline-flex items-center">
                              <input type="radio" name="hasMou" value="No" checked={formData.hasMou === 'No'} onChange={handleInputChange} className="text-indigo-600 focus:ring-indigo-500" />
                              <span className="ml-2 text-sm text-gray-700">No</span>
                            </label>
                          </div>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700">Already Published?</label>
                          <div className="mt-2 flex gap-4 mb-3">
                            <label className="inline-flex items-center">
                              <input type="radio" name="alreadyPublished" value="Yes" checked={formData.alreadyPublished === 'Yes'} onChange={handleInputChange} className="text-indigo-600 focus:ring-indigo-500" />
                              <span className="ml-2 text-sm text-gray-700">Yes</span>
                            </label>
                            <label className="inline-flex items-center">
                              <input type="radio" name="alreadyPublished" value="No" checked={formData.alreadyPublished === 'No'} onChange={handleInputChange} className="text-indigo-600 focus:ring-indigo-500" />
                              <span className="ml-2 text-sm text-gray-700">No</span>
                            </label>
                          </div>
                          
                          {formData.alreadyPublished === 'Yes' && (
                            <div className="mt-3">
                              <label className="block text-sm font-medium text-gray-700">Published Details</label>
                              <textarea 
                                name="publishedDetails" 
                                value={formData.publishedDetails} 
                                onChange={handleInputChange} 
                                rows="3"
                                placeholder="Enter publication details, DOIs, etc."
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border"
                              ></textarea>
                            </div>
                          )}
                        </div>
                        <div className="md:col-span-2">
                           <p className="text-xs text-gray-500 italic">* SPOC (data entering person) will be automatically recorded as {user?.email}</p>
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
