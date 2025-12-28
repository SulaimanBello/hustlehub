import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, ListTodo, CreditCard, LogOut } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
  onLogout: () => void;
}

export default function Layout({ children, onLogout }: LayoutProps) {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/users', label: 'Users', icon: Users },
    { path: '/tasks', label: 'Tasks', icon: ListTodo },
    { path: '/transactions', label: 'Transactions', icon: CreditCard },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{
        width: '250px',
        backgroundColor: 'var(--gray-900)',
        color: 'white',
        padding: '1.5rem'
      }}>
        <h2 style={{ marginBottom: '2rem', color: 'var(--primary)' }}>
          HustleHub Admin
        </h2>
        <nav>
          {navItems.map(({ path, label, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem',
                borderRadius: '6px',
                color: 'white',
                textDecoration: 'none',
                marginBottom: '0.5rem',
                backgroundColor: location.pathname === path ? 'var(--primary)' : 'transparent'
              }}
            >
              <Icon size={20} />
              {label}
            </Link>
          ))}
        </nav>
        <button
          onClick={onLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem',
            borderRadius: '6px',
            color: 'white',
            textDecoration: 'none',
            marginTop: 'auto',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            width: '100%',
            position: 'absolute',
            bottom: '1.5rem'
          }}
        >
          <LogOut size={20} />
          Logout
        </button>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '2rem', backgroundColor: 'var(--gray-50)' }}>
        {children}
      </main>
    </div>
  );
}
