const CONFIG = {
  pending_faculty:  { label: 'Awaiting Faculty', className: 'bg-amber-100 text-amber-800' },
  approval_pending: { label: 'Approval Pending', className: 'bg-orange-100 text-orange-800' },
  under_revision:   { label: 'Under Revision',   className: 'bg-red-100 text-red-800' },
  completed:        { label: 'Completed',        className: 'bg-green-100 text-green-800' },
  draft:            { label: 'Draft',            className: 'bg-gray-100 text-gray-600' },
}

export default function StatusBadge({ status }) {
  const { label, className } = CONFIG[status] ?? { label: status, className: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${className}`}>
      {label}
    </span>
  )
}
