import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, doc, setDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { hasCampusAccess } from '../utils/roleUtils';
import { DRIVE_FOLDER_IDS, APPS_SCRIPT_URL } from './activity/constants';

const DOC_TYPES = [
  "Syllabus", "Accounts", "HR Office", "Strategic Plan", "IQAC", 
  "Student Services", "Faculty Guidelines", "Academic Calendar", 
  "Exams", "Research Guidelines", "CRP", "Others"
];

export default function ManageDocuments() {
  const { user, userRoles, deptCode } = useAuth();
  const isCampus = hasCampusAccess(userRoles);

  const [documents, setDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('');

  // Form State
  const [docType, setDocType] = useState('');
  const [docTypeOther, setDocTypeOther] = useState('');
  const [description, setDescription] = useState('');
  const [destinationDept, setDestinationDept] = useState(isCampus ? 'All' : (deptCode || ''));
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [isLinkMode, setIsLinkMode] = useState(false);
  const [linkInput, setLinkInput] = useState('');

  useEffect(() => {
    if (isCampus) {
      getDocs(collection(db, 'departments')).then(snap => {
        setDepartments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
    }
    fetchDocuments();
  }, [user, deptCode, isCampus]);

  const fetchDocuments = async () => {
    setLoadingDocs(true);
    try {
      let docsData = [];
      if (isCampus) {
        const snap = await getDocs(collection(db, 'documents'));
        docsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } else {
        if (!deptCode) {
          // If a user somehow doesn't have a deptCode, just fetch 'All'
          const qAll = query(collection(db, 'documents'), where('department', '==', 'All'));
          const snapAll = await getDocs(qAll);
          docsData = snapAll.docs.map(d => ({ id: d.id, ...d.data() }));
        } else {
          const qDept = query(collection(db, 'documents'), where('department', '==', deptCode));
          const qAll = query(collection(db, 'documents'), where('department', '==', 'All'));
          const [snapDept, snapAll] = await Promise.all([getDocs(qDept), getDocs(qAll)]);
          const map = new Map();
          snapDept.docs.forEach(d => map.set(d.id, { id: d.id, ...d.data() }));
          snapAll.docs.forEach(d => map.set(d.id, { id: d.id, ...d.data() }));
          docsData = Array.from(map.values());
        }
      }
      
      docsData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setDocuments(docsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleFileUpload = async (fileToUpload) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(fileToUpload);
      reader.onload = async (event) => {
        const base64Data = event.target.result.split(',')[1];
        try {
          const filename = `${fileToUpload.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
          
          const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({
              folderId: DRIVE_FOLDER_IDS.documents,
              filename: filename,
              mimeType: fileToUpload.type || 'application/octet-stream',
              fileData: base64Data
            }),
            headers: {
              'Content-Type': 'text/plain;charset=utf-8',
            }
          });

          const result = await response.json();
          if (result.success) {
            resolve(result.fileUrl);
          } else {
            reject(new Error(result.error || 'Upload failed'));
          }
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isLinkMode && !file) return alert('Please select a file.');
    if (isLinkMode && !linkInput.trim()) return alert('Please provide a document link.');
    if (!docType) return alert('Please select a document type.');
    if (docType === 'Others' && !docTypeOther.trim()) return alert('Please specify the document type.');
    if (!description.trim()) return alert('Please provide a description.');

    setUploading(true);
    try {
      const fileUrl = isLinkMode ? linkInput.trim() : await handleFileUpload(file);
      const finalType = docType === 'Others' ? docTypeOther.trim() : docType;
      const targetDept = isCampus ? destinationDept : (deptCode || 'All');

      const newDoc = {
        id: `DOC_${new Date().getTime()}`,
        documentType: finalType,
        description: description.trim(),
        department: targetDept,
        fileUrl,
        uploadedByEmail: user.email,
        timestamp: new Date().toISOString(),
      };

      await setDoc(doc(db, 'documents', newDoc.id), newDoc);
      alert('Document uploaded successfully!');
      
      setDocType('');
      setDocTypeOther('');
      setDescription('');
      setFile(null);
      setLinkInput('');
      setIsLinkMode(false);
      if (isCampus) setDestinationDept('All');
      const fileInput = document.getElementById('file-upload');
      if (fileInput) fileInput.value = '';
      
      fetchDocuments();
    } catch (err) {
      console.error(err);
      alert('Failed to upload document: ' + (err.message || 'Unknown error occurred.'));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      await deleteDoc(doc(db, 'documents', id));
      setDocuments(documents.filter(d => d.id !== id));
      alert('Document deleted successfully.');
    } catch (err) {
      console.error(err);
      alert('Failed to delete document.');
    }
  };

  const filteredDocuments = documents.filter(docData => {
    const query = searchQuery.toLowerCase();
    const matchSearch = (docData.description || '').toLowerCase().includes(query) || 
                        (docData.documentType || '').toLowerCase().includes(query);
    const matchType = filterType ? docData.documentType === filterType : true;
    return matchSearch && matchType;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <div className="mb-2">
          <Link to="/" className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1 w-max">
            <span>&larr;</span> Back to Dashboard
          </Link>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">Manage Documents</h1>
          <p className="text-sm text-gray-500 mt-1">Upload and share common guidelines, strategic plans, and other important files.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
              <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Upload Document</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Document Type *</label>
                  <select
                    required
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3 border"
                  >
                    <option value="">Select Type</option>
                    {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                {docType === 'Others' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Specify Type *</label>
                    <input
                      type="text"
                      required
                      value={docTypeOther}
                      onChange={(e) => setDocTypeOther(e.target.value)}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3 border"
                      placeholder="Enter document type"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                  <textarea
                    required
                    rows="3"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3 border"
                    placeholder="Brief description of the document"
                  ></textarea>
                </div>

                {isCampus ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Destination *</label>
                    <select
                      required
                      value={destinationDept}
                      onChange={(e) => setDestinationDept(e.target.value)}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3 border"
                    >
                      <option value="All">All Departments</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.deptName} ({d.id})</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Destination</label>
                    <input
                      type="text"
                      disabled
                      value={deptCode || 'None Assigned'}
                      className="w-full rounded-md border-gray-300 bg-gray-50 text-gray-500 text-sm py-2 px-3 border"
                    />
                    <p className="text-xs text-gray-500 mt-1">You can only upload documents for your own department.</p>
                  </div>
                )}

                <div>
                  <div className="flex justify-between mb-1 items-end">
                    <label className="block text-sm font-medium text-gray-700">Document Source *</label>
                    <button
                      type="button"
                      onClick={() => setIsLinkMode(!isLinkMode)}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
                    >
                      {isLinkMode ? 'Upload a File Instead' : 'Paste Link Instead'}
                    </button>
                  </div>
                  
                  {isLinkMode ? (
                    <input
                      type="url"
                      required
                      value={linkInput}
                      onChange={(e) => setLinkInput(e.target.value)}
                      placeholder="Paste Drive or external link here..."
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3 border"
                    />
                  ) : (
                    <input
                      id="file-upload"
                      type="file"
                      required
                      onChange={(e) => setFile(e.target.files[0])}
                      className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 border border-gray-200 rounded-md"
                    />
                  )}
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={uploading}
                    className="w-full bg-indigo-600 text-white py-2 rounded-md font-medium text-sm hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {uploading ? 'Uploading...' : 'Upload Document'}
                  </button>
                </div>

              </form>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            
            <div className="bg-white p-4 rounded-lg shadow border border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Search Description / Type</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3 border"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Filter by Type</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3 border"
                >
                  <option value="">All Types</option>
                  {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-800">Available Documents</h2>
                <span className="text-sm text-gray-500">{filteredDocuments.length} records</span>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left border-collapse">
                  <thead className="bg-gray-50 text-gray-700 font-semibold uppercase text-xs border-b">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3">Dept</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loadingDocs ? (
                      <tr><td colSpan="5" className="text-center py-8 text-gray-500">Loading documents...</td></tr>
                    ) : filteredDocuments.length === 0 ? (
                      <tr><td colSpan="5" className="text-center py-8 text-gray-500">No documents found.</td></tr>
                    ) : (
                      filteredDocuments.map(docData => {
                        const canModify = docData.uploadedByEmail === user?.email;
                        return (
                          <tr key={docData.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                              {new Date(docData.timestamp).toLocaleDateString('en-GB')}
                            </td>
                            <td className="px-4 py-3 font-medium text-gray-900">
                              {docData.documentType}
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              {docData.description}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                                docData.department === 'All' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                              }`}>
                                {docData.department}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right space-x-3 whitespace-nowrap">
                              <a
                                href={docData.fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-indigo-600 hover:text-indigo-900 font-medium"
                              >
                                View
                              </a>
                              {canModify && (
                                <button
                                  onClick={() => handleDelete(docData.id)}
                                  className="text-red-600 hover:text-red-900 font-medium"
                                >
                                  Delete
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
