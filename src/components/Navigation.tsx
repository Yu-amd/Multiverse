import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navigation.css';

interface NavigationProps {
  className?: string;
}

export const Navigation: React.FC<NavigationProps> = ({ className }) => {
  const location = useLocation();

  const navItems = [
    { path: '/fleet', label: 'Fleet', icon: '🤖' },
    { path: '/tasks', label: 'Tasks', icon: '📋' },
    { path: '/runs', label: 'Runs', icon: '▶️' },
    { path: '/models', label: 'Models', icon: '🧠' },
    { path: '/observability', label: 'Observability', icon: '📊' },
    { path: '/settings', label: 'Settings', icon: '⚙️' },
  ];

  const isActive = (path: string) => {
    if (path === '/fleet') {
      return location.pathname === '/' || location.pathname === '/fleet';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className={`navigation ${className || ''}`}>
      <div className="navigation-brand">
        <span className="navigation-logo">Multiverse</span>
      </div>
      <ul className="navigation-list">
        {navItems.map((item) => (
          <li key={item.path}>
            <Link
              to={item.path}
              className={`navigation-link ${isActive(item.path) ? 'active' : ''}`}
            >
              <span className="navigation-icon">{item.icon}</span>
              <span className="navigation-label">{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
};

