import * as React from 'react';
import CloudViewerUI from './components/CloudViewerUI';
import TimeLine from './components/TimeLine';

export const App = () => {
  return (
    <div>
      <CloudViewerUI />
      {/* TODO: set in correct place */}
      <TimeLine />
    </div>
  );
};
