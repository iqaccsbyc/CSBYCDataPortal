import React, { useState } from 'react';

export default function TagsInput({ tags = [], onChange, placeholder = "Type and press enter..." }) {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
  };

  const addTag = () => {
    const val = inputValue.trim().replace(/,$/, '');
    if (val && !tags.includes(val)) {
      onChange([...tags, val]);
    }
    setInputValue('');
  };

  const removeTag = (indexToRemove) => {
    onChange(tags.filter((_, index) => index !== indexToRemove));
  };

  return (
    <div className="flex flex-wrap items-center gap-2 p-1 border border-gray-300 rounded-md shadow-sm focus-within:ring-1 focus-within:ring-indigo-500 focus-within:border-indigo-500 bg-white">
      {tags.map((tag, index) => (
        <span key={index} className="inline-flex items-center px-2 py-1 rounded bg-indigo-100 text-indigo-800 text-sm">
          {tag}
          <button
            type="button"
            onClick={() => removeTag(index)}
            className="ml-1 inline-flex text-indigo-500 hover:text-indigo-700 focus:outline-none"
          >
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </span>
      ))}
      <input
        type="text"
        className="flex-1 outline-none min-w-[120px] text-sm py-1 px-2 border-none focus:ring-0"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={addTag}
        placeholder={placeholder}
      />
    </div>
  );
}
