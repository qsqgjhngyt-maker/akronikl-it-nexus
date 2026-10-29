// Стандартный путь не требует серверной сборки или платного runner.
export async function bindApplicationPanel(options){
 const application=options.project.workspace?.files?.some(f=>f.path==='nexus-application.json');
 if(application){const{bindBrowserApplicationPanel}=await import('./application-browser-panel.js');return bindBrowserApplicationPanel(options)}
 const{bindApplicationPanel:bindPortablePanel}=await import('./application-server-panel.js'),portable=await bindPortablePanel(options);
 const{bindProjectTests}=await import('./project-tests.js'),tests=bindProjectTests(options);
 return{dispose(){tests?.dispose();portable?.dispose()}};
}
