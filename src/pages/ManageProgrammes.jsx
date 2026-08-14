import React, { useState, useEffect } from 'react';
import { collection, doc, deleteDoc, query, where } from 'firebase/firestore';
import { getDocsEncrypted as getDocs, setDocEncrypted as setDoc } from '../firebase/encryptedStore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { AcademicCapIcon, PlusIcon, PencilIcon, TrashIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { hasCampusAccess } from '../utils/roleUtils';

const INITIAL_FORM_STATE = {
  ProgrammeName: '',
  progcode: '',
  ProgLevel: 'UG',
  departmentCode: 'CS-BYC',
  startYear: '',
  isActive: 'Yes',
  programmeCoordinator: '',
  Pattern: 'Semester',
  Remarks: ''
};

export default function ManageProgrammes() {
  const { userRoles, deptCode } = useAuth();
  const [programmes, setProgrammes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  const isCampus = hasCampusAccess(userRoles);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [activeFaculty, setActiveFaculty] = useState([]);
  const [coordinatorSuggestions, setCoordinatorSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const hasAccess = userRoles?.some(r => ['admin', 'hod', 'assochod', 'coordinator', 'adminassist'].includes(r)) || isCampus;

  useEffect(() => {
    if (hasAccess) {
      fetchData();
      fetchFaculty();
    } else {
      setIsLoading(false);
    }
  }, [hasAccess]);

  const fetchFaculty = async () => {
    try {
      const q = query(collection(db, 'faculty'), where('facStatus', '==', 'Active'));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, name: d.data().facName }));
      setActiveFaculty(list);
    } catch (err) {
      console.error('Failed to fetch faculty', err);
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    setError('');
    try {
      let snap;
      if (isCampus) {
        snap = await getDocs(collection(db, 'programmes'));
      } else if (deptCode) {
        const q = query(collection(db, 'programmes'), where('departmentCode', '==', deptCode));
        snap = await getDocs(q);
      } else {
        setProgrammes([]);
        setIsLoading(false);
        return;
      }
      
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProgrammes(data.sort((a, b) => (a.ProgrammeName || '').localeCompare(b.ProgrammeName || '')));
    } catch (err) {
      console.error(err);
      setError('Failed to fetch programmes.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCoordinatorChange = (e) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, programmeCoordinator: value }));
    
    if (value.trim().length > 0) {
      const matches = activeFaculty.filter(f =>
        f.name.toLowerCase().includes(value.toLowerCase())
      );
      setCoordinatorSuggestions(matches);
      setShowSuggestions(matches.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (name) => {
    setFormData(prev => ({ ...prev, programmeCoordinator: name }));
    setShowSuggestions(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.ProgrammeName) {
      alert("Programme Name is required!");
      return;
    }
    
    setIsLoading(true);
    try {
      // If editing, use existing ID. If new, generate ID from ProgrammeName
      const docId = isEditing ? editingId : formData.ProgrammeName.replace(/[^a-zA-Z0-9]/g, '_');
      const docRef = doc(db, 'programmes', docId);
      
      await setDoc(docRef, formData);
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Failed to save programme.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete programme: ${name}?`)) {
      setIsLoading(true);
      try {
        await deleteDoc(doc(db, 'programmes', id));
        fetchData();
      } catch (err) {
        console.error(err);
        alert("Failed to delete programme.");
        setIsLoading(false);
      }
    }
  };

  const openAddModal = () => {
    setFormData({ ...INITIAL_FORM_STATE, departmentCode: deptCode || 'CS-BYC' });
    setIsEditing(false);
    setEditingId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (prog) => {
    setFormData({
      ProgrammeName: prog.ProgrammeName || prog.name || '',
      progcode: prog.progcode || '',
      ProgLevel: prog.ProgLevel || 'UG',
      departmentCode: prog.departmentCode || 'CS-BYC',
      startYear: prog.startYear || '',
      isActive: prog.isActive || 'Yes',
      programmeCoordinator: prog.programmeCoordinator || '',
      Pattern: prog.Pattern || 'Semester',
      Remarks: prog.Remarks || ''
    });
    setEditingId(prog.id);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Access Denied</h2>
          <p className="mt-2 text-gray-600">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">

      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <AcademicCapIcon className="w-7 h-7 text-indigo-600" />
            Manage Programmes
          </h1>
          <div className="flex items-center gap-3">
            <button 
              onClick={fetchData}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
            >
              <ArrowPathIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button 
              onClick={openAddModal}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              <PlusIcon className="w-5 h-5" />
              Add Programme
            </button>
          </div>
        </div>
      </div>

      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded text-red-700">
            {error}
          </div>
        )}

        <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Programme Name</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Level (UG/PG)</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pattern</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Coordinator</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading && programmes.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                      <ArrowPathIcon className="w-8 h-8 animate-spin mx-auto text-indigo-400 mb-2" />
                      Loading programmes...
                    </td>
                  </tr>
                ) : programmes.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                      No programmes found.
                    </td>
                  </tr>
                ) : (
                  programmes.map((prog) => (
                    <tr key={prog.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {prog.ProgrammeName || prog.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {prog.progcode || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          prog.ProgLevel === 'PG' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {prog.ProgLevel || 'UG'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {prog.Pattern || 'Semester'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {prog.Remarks ? prog.Remarks.split(',').filter(r => r.trim()).map((r, i) => (
                            <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                              {r.trim()}
                            </span>
                          )) : <span className="text-sm text-gray-500">-</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          prog.isActive !== 'No' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {prog.isActive || 'Yes'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {prog.programmeCoordinator || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEditModal(prog)}
                            className="text-indigo-600 hover:text-indigo-900 p-1 rounded hover:bg-indigo-50 transition-colors"
                            title="Edit Programme"
                          >
                            <PencilIcon className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(prog.id, prog.ProgrammeName || prog.name)}
                            className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
                            title="Delete Programme"
                          >
                            <TrashIcon className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setIsModalOpen(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
              <form onSubmit={handleSave}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4" id="modal-title">
                        {isEditing ? 'Edit Programme' : 'Add New Programme'}
                      </h3>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Programme Name *</label>
                          <input
                            type="text"
                            name="ProgrammeName"
                            required
                            value={formData.ProgrammeName}
                            onChange={handleInputChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                            placeholder="e.g. BCA, M.Sc DS"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Programme Code</label>
                          <input
                            type="text"
                            name="progcode"
                            value={formData.progcode}
                            onChange={handleInputChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Programme Level (ProgLevel) *</label>
                          <select
                            name="ProgLevel"
                            required
                            value={formData.ProgLevel}
                            onChange={handleInputChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border bg-white"
                          >
                            <option value="UG">Undergraduate (UG)</option>
                            <option value="PG">Postgraduate (PG)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Pattern *</label>
                          <select
                            name="Pattern"
                            required
                            value={formData.Pattern}
                            onChange={handleInputChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border bg-white"
                          >
                            <option value="Semester">Semester</option>
                            <option value="Trimester">Trimester</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Department Code</label>
                          <input
                            type="text"
                            name="departmentCode"
                            value={formData.departmentCode}
                            onChange={handleInputChange}
                            disabled={!isCampus}
                            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border ${!isCampus ? 'bg-gray-100' : 'bg-white'}`}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Start Year</label>
                          <input
                            type="text"
                            name="startYear"
                            value={formData.startYear}
                            onChange={handleInputChange}
                            placeholder="e.g. 2022-23"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Is Active?</label>
                          <select
                            name="isActive"
                            value={formData.isActive}
                            onChange={handleInputChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border bg-white"
                          >
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                          </select>
                        </div>

                        <div className="relative">
                          <label className="block text-sm font-medium text-gray-700">Programme Coordinator</label>
                          <input
                            type="text"
                            name="programmeCoordinator"
                            value={formData.programmeCoordinator}
                            onChange={handleCoordinatorChange}
                            placeholder="Type to search faculty..."
                            autoComplete="off"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                          />
                          {showSuggestions && (
                            <div className="absolute z-10 w-full mt-1 bg-white shadow-lg rounded-md border border-gray-200 max-h-48 overflow-y-auto">
                              {coordinatorSuggestions.map(fac => (
                                <div
                                  key={fac.id}
                                  className="px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer"
                                  onClick={() => handleSuggestionClick(fac.name)}
                                >
                                  {fac.name}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Remarks (Comma separated)</label>
                          <input
                            type="text"
                            name="Remarks"
                            value={formData.Remarks}
                            onChange={handleInputChange}
                            placeholder="e.g. Needs Review, Important"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                          />
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
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  >
                    {isLoading ? 'Saving...' : 'Save Programme'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
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
