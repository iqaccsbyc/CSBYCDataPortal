
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function deriveMonth(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  const m = d.getMonth()
  const yearSuffix = d.getFullYear().toString().slice(-2)
  return `${MONTH_NAMES[m]}-${yearSuffix}`
}

export function calcDays(start, end) {
  if (!start || !end) return 0
  const s = new Date(start + 'T00:00:00')
  const e = new Date(end + 'T00:00:00')
  const diff = Math.round((e - s) / 86400000) + 1
  return diff > 0 ? diff : 0
}

export const EVENT_TYPES = [
  'Seminar', 'Webinar', 'Workshop', 'Skill Development', 'IPR',
  'Research Seminar', 'Research Workshop', 'Entrepreneurship',
  'Career Guidance', 'Expert Talk', 'Invited Talk', 'FDP', 'QIP',
  'Cultural Event', 'Technical - Symposium', 'Technical - Quiz',
  'Awareness - Quiz', 'Technical Competition', 'Experiential Learning',
  'Participative Learning', 'Problem Solving', 'Physical Awareness',
  'Social Activities', 'Faculty Professional Development', 'Industrial Visit',
  'International Guest Talk', 'Extension Activities',
  'Celebration of Nat./Int. Day', 'Alumni Interaction', 'Orientation',
  'Initiative/Inauguration', 'Soft Skill', 'Bridge Course',
  'Competitive Exams', 'Clubs&Forums', 'Awareness-Trends&Tech',
  'Placement Training', 'Service Learning', 'IKS', 'Best Practice',
  'Exhibition', 'Interaction Session', 'Movie Screening',
]

export const SDG_OPTIONS = [
  { id: 'SDG-1', label: 'No Poverty' },
  { id: 'SDG-2', label: 'Zero Hunger' },
  { id: 'SDG-3', label: 'Good Health' },
  { id: 'SDG-4', label: 'Quality Education' },
  { id: 'SDG-5', label: 'Gender Equality' },
  { id: 'SDG-6', label: 'Clean Water' },
  { id: 'SDG-7', label: 'Affordable Energy' },
  { id: 'SDG-8', label: 'Decent Work' },
  { id: 'SDG-9', label: 'Industry & Innovation' },
  { id: 'SDG-10', label: 'Reduced Inequalities' },
  { id: 'SDG-11', label: 'Sustainable Cities' },
  { id: 'SDG-12', label: 'Responsible Consumption' },
  { id: 'SDG-13', label: 'Climate Action' },
  { id: 'SDG-14', label: 'Life Below Water' },
  { id: 'SDG-15', label: 'Life on Land' },
  { id: 'SDG-16', label: 'Peace & Justice' },
  { id: 'SDG-17', label: 'Partnerships' },
]

export const FOCUS_AREAS = ['FA-1', 'FA-2', 'FA-3', 'FA-4']

export const PRIORITY_AREAS = [
  { id: 'FA-10.1', label: 'Research Quality' },
  { id: 'FA-10.2', label: 'Doctoral Completion' },
  { id: 'FA-10.3', label: 'External Research Funding' },
  { id: 'FA-10.4', label: 'Consultancy & Industry' },
  { id: 'FA-10.5', label: 'Scholarships' },
  { id: 'FA-10.6', label: 'Entrepreneurial Ecosystem' },
  { id: 'FA-10.7', label: 'Internationalization' },
  { id: 'FA-10.8', label: 'Enhancement of Perception' },
  { id: 'FA-10.9', label: 'Digital Content' },
  { id: 'FA-10.10', label: 'SDG-Aligned Curriculum' },
]

export const NAAC_CRITERIA = ['C-1', 'C-2', 'C-3.1', 'C-3.2', 'C-5', 'C-6', 'C-7']

export const DRIVE_FOLDERS = {
  photos: 'https://drive.google.com/drive/folders/1wOeCyHcASKYCQiP4hLv3_562FyGRXPCy?usp=drive_link',
  report: 'https://drive.google.com/drive/folders/13gJFIQidpih4rEpflRdqsHaKDd8lTzME?usp=drive_link',
  nfa: 'https://drive.google.com/drive/folders/1o3zpbzOy0fLWfmQ2qh76vKr38pB5ME8u?usp=drive_link',
  bills: 'https://drive.google.com/drive/folders/1rCI4VrQKFN_XqjuzUfesykfQV-HFVJ_8?usp=drive_link',
  poster: 'https://drive.google.com/drive/folders/1yiTPCjqUlVJl7zV6l_h3kXpOeV6-Tnq1?usp=drive_link',
  publications: 'https://drive.google.com/drive/folders/1xAphRFA6WY_9sfpgq1w2-0WKBeQKfwMW?usp=drive_link',
  iproutcome: 'https://drive.google.com/drive/folders/1No5AhSPuNBbnHmUQdMMZA1maeS9W0PwY?usp=drive_link',
  presentation: 'https://drive.google.com/drive/folders/1GkImSotXf2BrW4-OZI_P-k3U41_x10t1?usp=drive_link',
  participation: 'https://drive.google.com/drive/folders/1ZkcVzPU82twbUIVF511aQZz7ZhoAMqKT?usp=drive_link',
  achievement: 'https://drive.google.com/drive/folders/1g_7KPdnALVJPPw63R2XG2FKvR5XWbPGw?usp=drive_link',
  project: 'https://drive.google.com/drive/folders/1r94Xkoz0lyyjiSxzHimlaNAGNIhuVA91?usp=drive_link',
  consultancy: 'https://drive.google.com/drive/folders/1tTgjJZsraOaLhYQ3yd501KWtz57NcxrL?usp=drive_link',
  placement: 'https://drive.google.com/drive/folders/1dDLtZrr-rdaAok8uh9dB0_aKndOV_4GN?usp=drive_link',
  incentive: 'https://drive.google.com/drive/folders/1p8GObHIi-0Gknt_cFE3epHMqCOk1rRLN?usp=drive_link',
  documents: 'https://drive.google.com/drive/folders/1h3PnZsMMzz-Mvwl3yEdlyN0rpJBKlf-0?usp=drive_link',
}

export const DRIVE_FOLDER_IDS = {
  photos: '1wOeCyHcASKYCQiP4hLv3_562FyGRXPCy',
  report: '13gJFIQidpih4rEpflRdqsHaKDd8lTzME',
  nfa: '1o3zpbzOy0fLWfmQ2qh76vKr38pB5ME8u',
  bills: '1rCI4VrQKFN_XqjuzUfesykfQV-HFVJ_8',
  poster: '1yiTPCjqUlVJl7zV6l_h3kXpOeV6-Tnq1',
  publications: '1xAphRFA6WY_9sfpgq1w2-0WKBeQKfwMW',
  iproutcome: '1No5AhSPuNBbnHmUQdMMZA1maeS9W0PwY',
  presentation: '1GkImSotXf2BrW4-OZI_P-k3U41_x10t1',
  participation: '1ZkcVzPU82twbUIVF511aQZz7ZhoAMqKT',
  achievement: '1g_7KPdnALVJPPw63R2XG2FKvR5XWbPGw',
  project: '1r94Xkoz0lyyjiSxzHimlaNAGNIhuVA91',
  consultancy: '1tTgjJZsraOaLhYQ3yd501KWtz57NcxrL',
  placement: '1dDLtZrr-rdaAok8uh9dB0_aKndOV_4GN',
  incentive: '1p8GObHIi-0Gknt_cFE3epHMqCOk1rRLN',
  documents: '1h3PnZsMMzz-Mvwl3yEdlyN0rpJBKlf-0',
}

export const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw2AgfZxzIdlt9NMlFd8xLr0JblqWkdvDXpKfeIzmZvfMV1mBTC6-G7xFLDH5j2F8VI/exec'

export const PROGRAMMES = [
  "BCA",
  "MCA",
  "M.Sc DS",
  "M.Sc CS",
  "B.Sc CMS",
  "B.Sc EMS",
  "B.Sc CME"
]
