import DateInput from '../../components/DateInput'
import React, { useState, useEffect } from 'react';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const YEARS = Array.from({ length: 2035 - 2023 + 1 }, (_, i) => (2023 + i).toString());
const STATUS_OPTIONS = ['Ongoing', 'Submitted', 'Awarded', 'Cancelled'];

export default function AddEditPhDModal({ isOpen, onClose, onSave, initialData, activeFaculty, isEditing }) {
  const [formData, setFormData] = useState(initialData || {});
  const [authorSuggestions, setAuthorSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData(initialData || {});
    }
  }, [isOpen, initialData]);

  if (!isOpen || !formData) return null;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAuthorsChange = (e) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, racMembers: value }));

    const racStr = value || '';
    const parts = racStr.split(',');
    const currentTerm = parts[parts.length - 1].trimStart();
    const existingAuthors = parts.slice(0, -1).map(p => p.trim());

    if (currentTerm.length > 0) {
      const matches = activeFaculty.filter(f =>
        f.name.toLowerCase().includes(currentTerm.toLowerCase()) &&
        !existingAuthors.includes(f.name)
      );
      setAuthorSuggestions(matches);
      setShowSuggestions(matches.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (name) => {
    const racStr = formData.racMembers || '';
    const parts = racStr.split(',');
    parts.pop(); 
    const prefix = parts.length > 0 ? parts.join(',') + ', ' : '';
    setFormData(prev => ({ ...prev, racMembers: prefix + name + ', ' }));
    setShowSuggestions(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <h3 className="text-lg leading-6 font-bold text-gray-900 border-b pb-2 mb-4">
                {isEditing ? 'Edit PhD Scholar' : 'Add New PhD Scholar'}
              </h3>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Register Number *</label>
                    <input required type="text" name="registerNumber" value={formData.registerNumber || ''} onChange={handleInputChange} disabled={isEditing} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border disabled:bg-gray-100" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Scholar Name *</label>
                    <input required type="text" name="scholarName" value={formData.scholarName || ''} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Date of Joining</label>
                    <DateInput  name="dateOfJoining" value={formData.dateOfJoining || ''} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <select name="status" value={formData.status || 'Ongoing'} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border">
                      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <hr className="border-gray-200" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Domain (Open text)</label>
                    <input type="text" name="domain" value={formData.domain || ''} onChange={handleInputChange} placeholder="e.g. Artificial Intelligence" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Supervisor *</label>
                    <select required name="supervisorName" value={formData.supervisorName || ''} onChange={(e) => {
                      const selectedFac = activeFaculty.find(f => f.name === e.target.value);
                      setFormData(prev => ({
                        ...prev,
                        supervisorName: e.target.value,
                        supervisorId: selectedFac ? selectedFac.id : ''
                      }));
                    }} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border">
                      <option value="">Select Supervisor...</option>
                      {activeFaculty.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Co-Supervisor</label>
                    <input type="text" name="coSupervisor" value={formData.coSupervisor || ''} onChange={handleInputChange} placeholder="Name of Co-Supervisor (Optional)" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border" />
                  </div>
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">RAC Members <span className="text-xs text-gray-500 font-normal">(comma-separated)</span></label>
                    <input 
                      type="text" 
                      name="racMembers" 
                      value={formData.racMembers || ''} 
                      onChange={handleAuthorsChange} 
                      placeholder="Start typing to select faculty..."
                      className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3 border" 
                    />
                    {showSuggestions && (
                      <div className="absolute z-10 w-full mt-1 bg-white shadow-lg rounded-md border border-gray-200 max-h-48 overflow-y-auto">
                        {authorSuggestions.map(fac => (
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
                </div>

              </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-gray-200">
              <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 sm:ml-3 sm:w-auto sm:text-sm">
                {isEditing ? 'Update Scholar' : 'Save Scholar'}
              </button>
              <button type="button" onClick={onClose} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
