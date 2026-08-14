import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, doc, deleteDoc, query, where } from 'firebase/firestore';
import { getDocsEncrypted as getDocs, setDocEncrypted as setDoc } from '../firebase/encryptedStore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import AddEditPhDModal from '../components/phd/AddEditPhDModal';
import RACMeetingsModal from '../components/phd/RACMeetingsModal';
import ViewPhDModal from '../components/phd/ViewPhDModal';

const INITIAL_FORM_STATE = {
  registerNumber: '',
  scholarName: '',
  domain: '',
  supervisorId: '',
  supervisorName: '',
  coSupervisor: '',
  dateOfJoining: '',
  racMembers: '',
  status: 'Ongoing',
  racMeetings: []
};

export default function ManagePhDScholars() {
  const { userRoles, facId } = useAuth();
  const [scholars, setScholars] = useState([]);
  const [activeFaculty, setActiveFaculty] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [isRacOpen, setIsRacOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedScholar, setSelectedScholar] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const STATUS_OPTIONS = ['Ongoing', 'Submitted', 'Awarded', 'Cancelled'];

  // Check if user has admin/coordinator rights
  const canCreate = userRoles?.some(r => ['admin', 'hod', 'assochod', 'coordinator', 'adminassist', 'phdcoordinator'].includes(r));

  useEffect(() => {
    fetchData();
    fetchFaculty();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const snap = await getDocs(collection(db, 'phdscholars'));
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setScholars(data.sort((a, b) => a.registerNumber?.localeCompare(b.registerNumber)));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFaculty = async () => {
    try {
      const q = query(collection(db, 'faculty'), where('facStatus', '==', 'Active'));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, name: d.data().facName }));
      setActiveFaculty(list);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveScholar = async (formData) => {
    if (!formData.registerNumber || !formData.scholarName) {
      alert("Register Number and Scholar Name are required!");
      return;
    }
    
    try {
      const docRef = doc(db, 'phdscholars', formData.registerNumber.trim());
      await setDoc(docRef, formData);
      setIsAddEditOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Failed to save scholar.");
    }
  };

  const handleDelete = async (scholar) => {
    if (window.confirm(`Are you sure you want to delete ${scholar.scholarName}?`)) {
      try {
        await deleteDoc(doc(db, 'phdscholars', scholar.id));
        fetchData();
      } catch (err) {
        console.error(err);
        alert("Failed to delete scholar.");
      }
    }
  };

  const openAddModal = () => {
    setSelectedScholar(INITIAL_FORM_STATE);
    setIsEditing(false);
    setIsAddEditOpen(true);
  };

  const openEditModal = (scholar) => {
    setSelectedScholar(scholar);
    setIsEditing(true);
    setIsAddEditOpen(true);
  };

  const openRacModal = (scholar) => {
    setSelectedScholar(scholar);
    setIsRacOpen(true);
  };

  const openViewModal = (scholar) => {
    setSelectedScholar(scholar);
    setIsViewOpen(true);
  };

  const filteredScholars = scholars.filter(s => {
    const q = searchQuery.toLowerCase();
    const matchSearch = (s.scholarName && s.scholarName.toLowerCase().includes(q)) || 
                        (s.registerNumber && s.registerNumber.toLowerCase().includes(q)) ||
                        (s.supervisorName && s.supervisorName.toLowerCase().includes(q));
    const matchStatus = filterStatus ? s.status === filterStatus : true;
    return matchSearch && matchStatus;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <div className="mb-2">
              <Link to="/" className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                Back to Dashboard
              </Link>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">PhD Scholars Management</h1>
            <p className="text-sm text-gray-500 mt-1">Directory of departmental PhD Candidates and RAC tracking</p>
          </div>
          {canCreate && (
            <div className="flex gap-3">
              <button
                onClick={openAddModal}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 shadow-sm transition-colors"
              >
                + Add Scholar
              </button>
            </div>
          )}
        </div>

        <div className="bg-white p-4 rounded-lg shadow border border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Search Name / Reg No / Supervisor</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3 border"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Filter by Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3 border"
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map((s, i) => <option key={i} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto" style={{ maxHeight: '600px' }}>
            <table className="min-w-full text-sm text-left border-collapse">
              <thead className="bg-gray-50 text-gray-700 sticky top-0 z-10 shadow-sm border-b border-gray-200 font-semibold uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">Reg No</th>
                  <th className="px-4 py-3">Scholar Name</th>
                  <th className="px-4 py-3">Domain</th>
                  <th className="px-4 py-3">Supervisor</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr><td colSpan="6" className="text-center py-8 text-gray-500">Loading scholars...</td></tr>
                ) : filteredScholars.length === 0 ? (
                  <tr><td colSpan="6" className="text-center py-8 text-gray-500">No scholars found.</td></tr>
                ) : (
                  filteredScholars.map(scholar => {
                    const isSupervisor = scholar.supervisorId === facId;
                    const canEditScholar = canCreate || isSupervisor;

                    return (
                      <tr key={scholar.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-indigo-700">{scholar.registerNumber}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{scholar.scholarName}</td>
                        <td className="px-4 py-3 text-gray-600">{scholar.domain || '-'}</td>
                        <td className="px-4 py-3 text-gray-600">{scholar.supervisorName || '-'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            scholar.status === 'Completed' || scholar.status === 'Awarded' ? 'bg-green-100 text-green-800' :
                            scholar.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                            scholar.status === 'Submitted' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {scholar.status || 'Ongoing'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right space-x-3 whitespace-nowrap">
                          <button onClick={() => openViewModal(scholar)} className="text-indigo-600 hover:text-indigo-900 font-medium text-xs">View Details</button>
                          
                          {canEditScholar && (
                            <>
                              <button onClick={() => openEditModal(scholar)} className="text-blue-600 hover:text-blue-900 font-medium text-xs">Edit</button>
                              <button onClick={() => openRacModal(scholar)} className="text-purple-600 hover:text-purple-900 font-medium text-xs">RAC Meetings</button>
                            </>
                          )}
                          
                          {canCreate && (
                            <button onClick={() => handleDelete(scholar)} className="text-red-600 hover:text-red-900 font-medium text-xs">Delete</button>
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
            Showing {filteredScholars.length} scholars
          </div>
        </div>
      </div>

      <AddEditPhDModal 
        isOpen={isAddEditOpen} 
        onClose={() => setIsAddEditOpen(false)} 
        onSave={handleSaveScholar} 
        initialData={selectedScholar} 
        activeFaculty={activeFaculty} 
        isEditing={isEditing} 
      />

      <RACMeetingsModal
        isOpen={isRacOpen}
        onClose={() => setIsRacOpen(false)}
        scholar={selectedScholar}
        onSaveSuccess={fetchData}
      />

      <ViewPhDModal
        isOpen={isViewOpen}
        onClose={() => setIsViewOpen(false)}
        viewData={selectedScholar}
      />
    </div>
  );
}
