import React from 'react';
import { Hammer } from 'lucide-react';

const PlaceholderPage = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
      <div className="p-6 bg-blue-50 rounded-full text-nestleBlue">
        <Hammer size={48} />
      </div>
      <h2 className="text-2xl font-bold text-gray-800">Module Under Construction</h2>
      <p className="text-gray-500 max-w-md">
        This feature is currently being built and will be available in the next release. 
        Please navigate back to the dashboard.
      </p>
    </div>
  );
};

export default PlaceholderPage;
