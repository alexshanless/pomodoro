import React from 'react';
import Drawer from './Drawer';

const StatsDrawer = ({ isOpen, onClose, trapRef, children }) => (
  <Drawer
    isOpen={isOpen}
    onClose={onClose}
    trapRef={trapRef}
    title='Statistics'
  >
    {children}
  </Drawer>
);

export default StatsDrawer;
