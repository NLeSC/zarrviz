import * as React from 'react';
import LoadZarrData from './components/LoadZarrData';
import TimeLine from './components/TimeLine';

export const App = () => {
  return (
    <div>
      <LoadZarrData />
      {/* TODO: set in correct place */}
      <TimeLine />
    </div>
  );
};
