import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

import { getMonthStr } from '../utils/academicYear'
import { getCurrentAcademicYear } from '../utils/academicYear';

export function useContributionData(selectedAY = getCurrentAcademicYear()) {
  const [data, setData] = useState({
    publications: [],
    presentations: [],
    iprOutcomes: [],
    participations: [],
    achievements: [],
    projects: [],
    consultancies: [],
    incentives: [],
    activeFaculty: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [
        pubsSnap,
        presentationsSnap,
        iprsSnap,
        participationsSnap,
        achievementsSnap,
        projectsSnap,
        consultancySnap,
        incentivesSnap,
        facultySnap
      ] = await Promise.all([
        getDocs(query(collection(db, 'publications'), where('academicYear', '==', selectedAY))),
        getDocs(query(collection(db, 'presentations'), where('academicYear', '==', selectedAY))),
        getDocs(query(collection(db, 'iprOutcomes'), where('academicYear', '==', selectedAY))),
        getDocs(query(collection(db, 'participations'), where('academicYear', '==', selectedAY))),
        getDocs(
          query(
            collection(db, 'achievements'),
            where('academicYear', '==', selectedAY),
            where('achievementFor', '==', 'Faculty')
          )
        ),
        getDocs(query(collection(db, 'projects'), where('academicYear', '==', selectedAY))),
        getDocs(query(collection(db, 'consultancy'), where('academicYear', '==', selectedAY))),
        getDocs(query(collection(db, 'incentives'), where('academicYear', '==', selectedAY))),
        getDocs(
          query(
            collection(db, 'faculty'),
            where('facStatus', '==', 'Active'),
            where('deptCode', '==', 'CS-BYC')
          )
        )
      ]);

      const publications = pubsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const presentations = presentationsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const iprOutcomes = iprsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const participations = participationsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const achievements = achievementsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const projects = projectsSnap.docs.map(doc => ({ month: getMonthStr(doc.data().startDate), id: doc.id, ...doc.data() }));
      const consultancies = consultancySnap.docs.map(doc => ({ month: getMonthStr(doc.data().date), id: doc.id, ...doc.data() }));
      const incentives = incentivesSnap.docs.map(doc => ({ month: getMonthStr(doc.data().dateOfReceipt), id: doc.id, ...doc.data() }));
      
      const activeFaculty = facultySnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => (a.facName || '').localeCompare(b.facName || ''));

      setData({
        publications,
        presentations,
        iprOutcomes,
        participations,
        achievements,
        projects,
        consultancies,
        incentives,
        activeFaculty,
      });
    } catch (err) {
      console.error('Error fetching contribution data:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [selectedAY]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    ...data,
    isLoading,
    error,
    refresh: fetchData,
  };
}
