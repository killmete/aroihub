import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Component that handles scrolling to top on route changes
const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll to top when the pathname changes
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

export default ScrollToTop;