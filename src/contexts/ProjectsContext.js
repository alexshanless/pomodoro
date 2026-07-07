import React, { createContext, useContext } from 'react';
import { useProjectsState } from '../hooks/useProjectsState';

// Single shared instance of the projects state. Before this context every
// consumer of useProjects() had its own copy and its own Supabase fetch,
// so mutations in one component didn't reach the others until reload.
const ProjectsContext = createContext(null);

export const ProjectsProvider = ({ children }) => (
  <ProjectsContext.Provider value={useProjectsState()}>{children}</ProjectsContext.Provider>
);

export const useProjects = () => {
  const context = useContext(ProjectsContext);
  if (!context) {
    throw new Error('useProjects must be used within a ProjectsProvider');
  }
  return context;
};

export default ProjectsContext;
