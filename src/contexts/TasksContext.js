import React, { createContext, useContext } from 'react';
import { useTasksState } from '../hooks/useTasksState';

// Single shared instance of the tasks state, mirroring ProjectsContext.
const TasksContext = createContext(null);

export const TasksProvider = ({ children }) => (
  <TasksContext.Provider value={useTasksState()}>{children}</TasksContext.Provider>
);

export const useTasks = () => {
  const context = useContext(TasksContext);
  if (!context) {
    throw new Error('useTasks must be used within a TasksProvider');
  }
  return context;
};

export default TasksContext;
