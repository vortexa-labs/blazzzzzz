import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useSession } from './SessionContext';

const SessionActivityTracker: React.FC = () => {
  const location = useLocation();
  const { updateLastActive } = useSession();

  useEffect(() => {
    updateLastActive();
    // eslint-disable-next-line
  }, [location.pathname]);

  return null;
};

export default SessionActivityTracker; 