import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

import { generateMonthsForAY } from '../utils/academicYear';
const EVENT_TYPES = [
  'Seminar', 'Webinar', 'Workshop', 'Skill Development', 'IPR',
  'Research Seminar', 'Research Workshop', 'Entrepreneurship', 'Career Guidance',
  'Expert Talk', 'Invited Talk', 'FDP', 'QIP', 'Cultural Event',
  'Technical - Symposium', 'Technical - Quiz', 'Awareness - Quiz',
  'Technical Competition', 'Experiential Learning', 'Participative Learning',
  'Problem Solving', 'Physical Awareness', 'Social Activities',
  'Faculty Professional Development', 'Industrial Visit', 'International Guest Talk',
  'Extension Activities', 'Celebration of Nat./Int. Day', 'Alumni Interaction',
  'Orientation', 'Initiative/Inauguration', 'Soft Skill', 'Bridge Course'
];

export const SDGS = [
  { code: 'SDG-1', desc: 'No Poverty' },
  { code: 'SDG-2', desc: 'Zero Hunger' },
  { code: 'SDG-3', desc: 'Good Health and Well-being' },
  { code: 'SDG-4', desc: 'Quality Education' },
  { code: 'SDG-5', desc: 'Gender Equality' },
  { code: 'SDG-6', desc: 'Clean Water and Sanitation' },
  { code: 'SDG-7', desc: 'Affordable and Clean Energy' },
  { code: 'SDG-8', desc: 'Decent Work and Economic Growth' },
  { code: 'SDG-9', desc: 'Industry, Innovation and Infrastructure' },
  { code: 'SDG-10', desc: 'Reduced Inequalities' },
  { code: 'SDG-11', desc: 'Sustainable Cities and Communities' },
  { code: 'SDG-12', desc: 'Responsible Consumption and Production' },
  { code: 'SDG-13', desc: 'Climate Action' },
  { code: 'SDG-14', desc: 'Life Below Water' },
  { code: 'SDG-15', desc: 'Life on Land' },
  { code: 'SDG-16', desc: 'Peace, Justice and Strong Institutions' },
  { code: 'SDG-17', desc: 'Partnerships for the Goals' },
];

export const FOCUS_AREAS = [
  { code: 'FA-1', desc: 'Transformational Teaching Learning for Global Competence' },
  { code: 'FA-2', desc: 'Impactful Research, Innovation and Enterprise' },
  { code: 'FA-3', desc: 'Positive Organisational Culture for Gainful Campus Life' },
  { code: 'FA-4', desc: 'Meaningful Societal Engagement' },
];

export const PRIORITY_AREAS = [
  { code: 'FA-10.1', desc: 'Research Quality and Reputation' },
  { code: 'FA-10.2', desc: 'Doctoral Completion Rate' },
  { code: 'FA-10.3', desc: 'External Research Funding' },
  { code: 'FA-10.4', desc: 'Consultancy and Industry Income' },
  { code: 'FA-10.5', desc: 'Scholarships from Private Organisations' },
  { code: 'FA-10.6', desc: 'Entrepreneurial Ecosystem' },
  { code: 'FA-10.7', desc: 'Internationalization' },
  { code: 'FA-10.8', desc: 'Enhancement of Perception' },
  { code: 'FA-10.9', desc: 'Digital Content Development' },
  { code: 'FA-10.10', desc: 'SDG-Aligned Curriculum and Research' },
];

export const NAAC_CRITERIA = [
  { code: 'C-1', desc: 'Curriculum Design and Development' },
  { code: 'C-2', desc: 'Teaching-Learning and Evaluation' },
  { code: 'C-3.1', desc: 'Research and Innovation' },
  { code: 'C-3.2', desc: 'Consultancy, Extension and Collaboration' },
  { code: 'C-5', desc: 'Student Support and Progression' },
  { code: 'C-7', desc: 'Institutional Values and Best Practices' },
];

export const AUDIT_METRICS = [
  { id: '1', code: '1.1.3', min: 0, desc: 'Skill Development' },
  { id: '2', code: '1.1.3', min: 0, desc: 'Entrepreneurship' },
  { id: '3', code: '1.1.3', min: 0, desc: 'Employability' },
  { id: '4', code: '1.3.1', min: 0, desc: 'SDG' },
  { id: '5', code: '1.3.2', min: 0, desc: 'Value added Course/Certificate Course/MDCs/MOOCs' },
  { id: '6', code: '2.2.1', min: 5, desc: 'Bridge Course/Remedial Class/Advanced Training / Workshop – Students' },
  { id: '7', code: '2.3.1', min: 5, desc: 'Experiential Learning/Problem Solving' },
  { id: '8', code: '3.3.1/3.3.2', searchCodes: ['3.3.1', '3.3.2'], min: 3, desc: 'Incubation/Innovation/IKS/ IPR' },
  { id: '9', code: '3.5.2', min: 0, desc: 'Consultancy/Corporate Training' },
  { id: '10', code: '3.6.1/3.6.2/3.6.3', searchCodes: ['3.6.1', '3.6.2', '3.6.3'], min: 5, desc: 'Extension Activity/Outreach activity/Community Engagement' },
  { id: '11', code: '3.6.1/3.6.2/3.6.3', searchCodes: ['3.6.1', '3.6.2', '3.6.3'], min: 0, desc: 'NCC/CSA/CAPS' },
  { id: '12', code: '3.7.2', searchCodes: ['3.7.2', '3.7.1'], min: 2, desc: 'MOU-under MOU activities' },
  { id: '13', code: '5.1.2.A', searchCodes: ['5.1.2.A', '5.1.2-A'], min: 3, desc: 'Placement Orientation Session' },
  { id: '14', code: '5.1.2.A', searchCodes: ['5.1.2.A', '5.1.2-A'], min: 0, desc: 'Placement Drives' },
  { id: '15', code: '5.1.2.A', searchCodes: ['5.1.2.A', '5.1.2-A'], min: 0, desc: 'Industrial Visits' },
  { id: '16', code: '5.1.2.A', searchCodes: ['5.1.2.A', '5.1.2-A'], min: 0, desc: 'Career Talks/Workshops/Orientation – Placement' },
  { id: '17', code: '5.1.2.B', searchCodes: ['5.1.2.B', '5.1.2-B'], min: 2, desc: 'Guest Talks given on Competitive Examination' },
  { id: '18', code: '5.1.3.A', searchCodes: ['5.1.3.A', '5.1.3-A'], min: 1, desc: 'Guest Lecture/Webinars/Seminars/Hands on Workshop/Training sessions/Leadership Workshops/Knowledge Sharing Sessions on Soft Skills' },
  { id: '19', code: '5.1.3.B', searchCodes: ['5.1.3.B', '5.1.3-B'], min: 1, desc: 'Guest Lecture/Webinars/Seminars/Hands on Workshop/Training sessions/Leadership Workshops/Knowledge Sharing Sessions on Language and Communication Skills' },
  { id: '20', code: '5.1.3.C', searchCodes: ['5.1.3.C', '5.1.3-C'], min: 1, desc: 'Guest Lecture/Webinars/Seminars/Hands on Workshop/Training sessions/Leadership Workshops/Knowledge Sharing Sessions on Life Skills (Yoga physical fitness, Health and Hygience)' },
  { id: '21', code: '5.1.3.D', searchCodes: ['5.1.3.D', '5.1.3-D'], min: 1, desc: 'Awareness Trends in Technology' },
  { id: '22', code: '5.3.1-A', searchCodes: ['5.3.1-A', '5.3.3-A'], min: 1, desc: 'Sports Competitions' },
  { id: '22A', code: '5.3.1-B', searchCodes: ['5.3.1-B', '5.3.3-B'], min: 1, desc: 'Cultural Competitions' },
  { id: '22B', code: '5.3.1-C', searchCodes: ['5.3.1-C', '5.3.3-C'], min: 1, desc: 'Technical /Academic Fest' },
  { id: '22C', code: '5.3.1 (Combined)', searchCodes: ['5.3.1', '5.3.1-A', '5.3.1-B', '5.3.1-C', '5.3.3', '5.3.3-A', '5.3.3-B', '5.3.3-C', '5.3.3-D'], min: 5, desc: 'Altogether - Sports, Cultural & Technical/Academic Fests' },
  { id: '23', code: '5.4.1', searchCodes: ['5.4.1', '5.4.1-A'], min: 2, desc: 'Alumni Engagement / Guest lecture/Panel Discussion' },
  { id: '24', code: '6.3.2', min: 0, desc: 'Conference/Workshops – For Faculty' },
  { id: '26', code: '6.3.3', searchCodes: ['6.3.3', '6.3.4-B'], min: 2, desc: 'QIP' },
  { id: '25', code: '6.3.4', searchCodes: ['6.3.4', '6.3.4-A'], min: 2, desc: 'FDP/MDP' },
  { id: '27', code: '7.1.1', min: 2, desc: 'Gender Equity' },
  { id: '28', code: '7.1.9', min: 2, desc: 'Sensitise Students & Employee to the Constitutional Obligations / Exhibitions' },
];

import { generateMonthOrder, getCurrentAcademicYear } from '../utils/academicYear';

export function useActivitiesData(selectedAY = getCurrentAcademicYear()) {
  const [data, setData] = useState({
    activities: [],
    facultyList: [],
    summary: null,
    monthMatrix: null,
    facultyCounts: null,
    dataEntrySummary: null,
    sdgCounts: null,
    focusAreaCounts: null,
    priorityAreaCounts: null,
    naacCounts: null,
    auditCounts: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Fetch activities
      const activitiesQuery = query(
        collection(db, 'activities'),
        where('academicYear', '==', selectedAY)
      );
      const activitiesSnap = await getDocs(activitiesQuery);
      const activities = activitiesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // 2. Fetch active faculty in CS-BYC
      const facultyQuery = query(
        collection(db, 'faculty'),
        where('deptCode', '==', 'CS-BYC'),
        where('facStatus', '==', 'Active')
      );
      const facultySnap = await getDocs(facultyQuery);
      const facultyList = facultySnap.docs.map(doc => doc.data());

      // Let's compute aggregations
      const totalActivities = activities.length;
      const currentMonths = generateMonthsForAY(selectedAY);
      
      // -- SUMMARY KPIs --
      const summary = {
        total: totalActivities,
        completed: activities.filter(a => a.status === 'completed').length,
        pending: activities.filter(a => a.status === 'pending_faculty').length,
        totalParticipants: activities.reduce((sum, a) => sum + (Number(a.totalParticipants) || 0), 0),
        monthlyCounts: currentMonths.map(m => ({ month: m, count: activities.filter(a => a.month === m).length })),
        physical: activities.filter(a => a.physicalOnline === 'Physical').length,
        online: activities.filter(a => a.physicalOnline === 'Online').length,
        topEventTypes: EVENT_TYPES.map(t => ({
          type: t,
          count: activities.filter(a => a.eventType === t).length
        })).sort((a, b) => b.count - a.count).slice(0, 10),
      };

      // -- MONTH-WISE TABLE MATRIX --
      const monthMatrix = currentMonths.map(m => {
        const row = { month: m };
        row.TotalEvents = activities.filter(a => a.month === m).length;
        row.Physical = activities.filter(a => a.month === m && a.physicalOnline === 'Physical').length;
        row.Online = activities.filter(a => a.month === m && a.physicalOnline === 'Online').length;
        EVENT_TYPES.forEach(t => {
          row[t] = activities.filter(a => a.month === m && a.eventType === t).length;
        });
        return row;
      });

      // -- FACULTY-WISE --
      const facultyCounts = facultyList.map(f => {
        const count = activities.filter(a => a.organizers && a.organizers.includes(f.facName)).length;
        const events = activities.filter(a => a.organizers && a.organizers.includes(f.facName));
        return { name: f.facName, count, events };
      }).sort((a, b) => b.count - a.count).map((f, i) => ({ ...f, rank: i + 1 }));

      const dataEntryCounts = {};
      activities.forEach(a => {
        if (a.createdBy) {
          dataEntryCounts[a.createdBy] = (dataEntryCounts[a.createdBy] || 0) + 1;
        }
      });
      const dataEntrySummary = Object.entries(dataEntryCounts).map(([email, count]) => ({ email, count })).sort((a, b) => b.count - a.count);

      // -- SDG MAPPING --
      const sdgEvents = activities.filter(a => a.sdgLinks && a.sdgLinks.length > 0).length;
      const sdgCounts = SDGS.map(sdg => {
        const count = activities.filter(a => a.sdgLinks && a.sdgLinks.includes(sdg.code)).length;
        const percentage = totalActivities > 0 ? ((count / totalActivities) * 100).toFixed(1) : '0.0';
        return { ...sdg, count, percentage };
      });

      // -- STRATEGIC PLAN --
      const focusAreaEvents = activities.filter(a => a.focusAreas && a.focusAreas.length > 0).length;
      const focusAreaCounts = FOCUS_AREAS.map(fa => {
        const count = activities.filter(a => a.focusAreas && a.focusAreas.includes(fa.code)).length;
        const percentage = totalActivities > 0 ? ((count / totalActivities) * 100).toFixed(1) : '0.0';
        return { ...fa, count, percentage };
      });

      const priorityAreaCounts = PRIORITY_AREAS.map(pa => {
        const count = activities.filter(a => a.priorityAreas && a.priorityAreas.includes(pa.code)).length;
        const percentage = totalActivities > 0 ? ((count / totalActivities) * 100).toFixed(1) : '0.0';
        return { ...pa, count, percentage };
      });

      const naacCounts = NAAC_CRITERIA.map(nc => {
        const count = activities.filter(a => a.naacCriteria && a.naacCriteria.includes(nc.code)).length;
        return { ...nc, count };
      });

      // -- AUDIT METRICS --
      const auditCounts = AUDIT_METRICS.map(metric => {
        const codesToSearch = metric.searchCodes || [metric.code];
        
        const matchedActivities = activities.filter(a => 
          a.aqarCriteria && codesToSearch.some(code => a.aqarCriteria.includes(code))
        );
        const count = matchedActivities.length;

        let status = 'Not Met';
        if (metric.min === 0) {
          status = count > 0 ? 'Met' : 'Not Met';
        } else {
          if (count >= metric.min) status = 'Met';
          else if (count > 0) status = 'Partial';
        }

        return { ...metric, count, status, activities: matchedActivities };
      });

      setData({
        activities,
        facultyList,
        summary,
        monthMatrix,
        facultyCounts,
        dataEntrySummary,
        sdgCounts,
        sdgEvents,
        focusAreaCounts,
        focusAreaEvents,
        priorityAreaCounts,
        naacCounts,
        auditCounts,
        MONTHS: currentMonths
      });
    } catch (err) {
      console.error("Error fetching activities data:", err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedAY]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    ...data,
    EVENT_TYPES,
    isLoading,
    error,
    refresh: fetchData
  };
}
