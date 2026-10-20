// Display grouping only. The canonical catalog and its stable IDs are retained.
export const legacyPracticeIds=Object.freeze(['practice-tech-1','practice-tech-2','practice-tech-3','practice-production','practice-operations']);
export const practicesHubId='nexus-practices';
export function academyPresentationEntries(catalog){
 const entries=[];let practiceAdded=false;
 for(const course of catalog.courses){
  if(course.id==='cpp')continue;
  if(legacyPracticeIds.includes(course.id)){
   if(!practiceAdded){practiceAdded=true;entries.push({id:practicesHubId,order:course.order,title:{ru:'Практики',en:'Practice'},category:'practice',categoryTitle:{ru:'Практики',en:'Practice'},status:'available-alpha',route:'#view=practices',presentationKind:'practice-hub'})}
  }else entries.push(course);
 }
 return entries;
}

// Learner navigation is subject-integrated; legacy presentation stays available to existing tools.
export function learnerAcademyEntries(catalog){
 return academyPresentationEntries(catalog).filter(entry=>entry.id!==practicesHubId);
}
