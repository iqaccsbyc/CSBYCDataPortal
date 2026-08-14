export const CAMPUS_ROLES = [
  'admin',
  'director',
  'assocdirector',
  'campusadmin',
  'dean',
  'assocdean',
  'campusiqaccoordinator',
  'campusiqaccoreteam',
  'deansoffice'
]

export const DEPT_ROLES = [
  'hod',
  'assochod',
  'coordinator',
  'deptiqaccoordinator',
  'deptiqaccoreteam',
  'adminassist',
  'studentcounsellor' // usually dept level
]

// Default to 'faculty' if not specified, which is individual level.

export const ROLE_OPTIONS = [
  { value: 'faculty', label: 'Faculty' },
  // Campus Roles
  { value: 'admin', label: 'Admin (App)' },
  { value: 'director', label: 'Director' },
  { value: 'assocdirector', label: 'Assoc. Director' },
  { value: 'campusadmin', label: 'Campus Administrator' },
  { value: 'dean', label: 'Dean' },
  { value: 'assocdean', label: 'Assoc. Dean' },
  { value: 'campusiqaccoordinator', label: 'Campus IQAC Coordinator' },
  { value: 'campusiqaccoreteam', label: 'Campus IQAC Core Team' },
  { value: 'deansoffice', label: 'Deans Office' },
  // Department Roles
  { value: 'hod', label: 'HoD' },
  { value: 'assochod', label: 'Assoc. HoD' },
  { value: 'coordinator', label: 'Coordinator (General)' },
  { value: 'deptiqaccoordinator', label: 'Dept IQAC Coordinator' },
  { value: 'deptiqaccoreteam', label: 'Dept IQAC Core Team' },
  { value: 'studentcounsellor', label: 'Student Counsellor' },
  { value: 'adminassist', label: 'Secretary' }
]

/**
 * Checks if the user has any Campus-level roles.
 * @param {string[]} userRoles - Array of roles the user has
 * @returns {boolean}
 */
export function hasCampusAccess(userRoles = []) {
  return userRoles.some(role => CAMPUS_ROLES.includes(role))
}

/**
 * Checks if the user has any Department-level roles.
 * @param {string[]} userRoles - Array of roles the user has
 * @returns {boolean}
 */
export function hasDepartmentAccess(userRoles = []) {
  return userRoles.some(role => DEPT_ROLES.includes(role))
}

/**
 * Determines the highest access level.
 * @param {string[]} userRoles 
 * @returns {'campus' | 'department' | 'individual'}
 */
export function getAccessLevel(userRoles = []) {
  if (hasCampusAccess(userRoles)) return 'campus'
  if (hasDepartmentAccess(userRoles)) return 'department'
  return 'individual'
}
