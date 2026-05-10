import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

const getGreeting = (t) => {
  const hour = new Date().getHours();
  if (hour < 12) return t('greeting.morning');
  if (hour < 17) return t('greeting.afternoon');
  return t('greeting.evening');
};

const DashboardGreeting = ({ statusLine }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <div className="bg-gradient-to-r from-nestleBlue to-blue-700 rounded-xl p-5 text-white shadow-md mb-6">
      <p className="text-2xl font-bold">
        {getGreeting(t)}, {firstName}! 👋
      </p>
      {statusLine && (
        <p className="text-blue-100 text-sm mt-1 font-medium">{statusLine}</p>
      )}
    </div>
  );
};

export default DashboardGreeting;
