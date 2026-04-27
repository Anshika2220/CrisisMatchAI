import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import AddTask from './pages/AddTask';
import AddVolunteer from './pages/AddVolunteer';
import Login from './pages/Login';
import Explore from './pages/Explore';
import { Home, PlusCircle, Heart, Search, Activity, Compass, LogOut, User } from 'lucide-react';
import { onAuthChange, logout } from './services/firebase';
import ChatBot from './components/ChatBot';

const SidebarLink = ({ to, icon: Icon, children }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link
      to={to}
      className={`flex items-center gap-4 px-4 py-3 rounded-md transition-colors font-semibold text-sm ${
        isActive
          ? 'text-foreground bg-accent'
          : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      <Icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
      {children}
    </Link>
  );
};

// Wrapper that only shows the sidebar layout for authenticated/app routes
function AppShell({ user }) {
  const handleLogout = async () => {
    try { await logout(); } catch (e) { console.error(e); }
  };

  return (
    <div className="flex h-screen bg-black text-foreground overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-black flex flex-col pt-6 pb-2 px-2 flex-shrink-0 border-r border-border/50 hidden md:flex">
        <div className="px-4 mb-8 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <Activity className="w-5 h-5 text-black" strokeWidth={3} />
          </div>
          <span className="font-bold text-xl tracking-tight">CrisisMatch</span>
        </div>

        <nav className="flex-1 space-y-2">
          <SidebarLink to="/" icon={Home}>Dashboard</SidebarLink>
          <SidebarLink to="/explore" icon={Compass}>Explore</SidebarLink>

          <div className="pt-6 pb-2 px-4">
            <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase">Actions</p>
          </div>
          <SidebarLink to="/add-task" icon={PlusCircle}>Report Crisis</SidebarLink>
          <SidebarLink to="/add-volunteer" icon={Heart}>Volunteer</SidebarLink>
        </nav>

        {/* User section */}
        <div className="mt-auto px-2 py-3 border-t border-border/50">
          {user ? (
            <div className="flex items-center gap-3 px-2 py-2 rounded-md">
              {user.photoURL ? (
                <img src={user.photoURL} alt="avatar" className="w-8 h-8 rounded-full ring-2 ring-primary/30" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {user.displayName || user.email?.split('@')[0] || 'User'}
                </p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
              <button
                onClick={handleLogout}
                title="Sign out"
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground/70 px-2">CrisisMatch AI © 2026</p>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col bg-card rounded-lg m-2 overflow-hidden relative">
        {/* Top gradient overlay */}
        <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-primary/20 to-transparent pointer-events-none z-0" />

        {/* Header */}
        <header className="h-16 flex items-center justify-between px-6 z-10 sticky top-0 bg-card/90 backdrop-blur-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 md:hidden">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <Activity className="w-5 h-5 text-black" />
            </div>
          </div>

          {/* Right buttons */}
          <div className="flex items-center gap-2 ml-auto">
            <Link
              to="/explore"
              className="bg-black hover:scale-105 transition-transform text-foreground text-sm font-bold py-2 px-4 rounded-full border border-border flex items-center gap-2"
            >
              <Compass className="w-4 h-4" />
              Explore
            </Link>
            {user ? (
              <button
                onClick={handleLogout}
                className="bg-white hover:scale-105 transition-transform text-black text-sm font-bold py-2 px-5 rounded-full flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Log out
              </button>
            ) : (
              <Link
                to="/login"
                className="bg-white hover:scale-105 transition-transform text-black text-sm font-bold py-2 px-6 rounded-full"
              >
                Log in
              </Link>
            )}
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-24 z-10">
          <Routes>
            <Route path="/"              element={user ? <Dashboard /> : <Navigate to="/login" replace />} />
            <Route path="/explore"       element={<Explore />} />
            <Route path="/add-task"      element={user ? <AddTask /> : <Navigate to="/login" replace />} />
            <Route path="/add-volunteer" element={user ? <AddVolunteer /> : <Navigate to="/login" replace />} />
            {/* Redirect /login back to dashboard if already inside shell */}
            <Route path="/login"         element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}


function App() {
  const [user, setUser]       = useState(undefined); // undefined = loading
  const [ready, setReady]     = useState(false);

  useEffect(() => {
    const unsub = onAuthChange(u => {
      setUser(u);
      setReady(true);
    });
    return unsub;
  }, []);

  if (!ready) {
    // Splash loader
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center animate-pulse">
            <Activity className="w-8 h-8 text-black" strokeWidth={3} />
          </div>
          <p className="text-muted-foreground text-sm">Loading CrisisMatch…</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Login is a full-page route (no sidebar) */}
        <Route
          path="/login"
          element={user ? <Navigate to="/" replace /> : <Login />}
        />
        {/* All other routes use the AppShell with sidebar */}
        <Route path="/*" element={<AppShell user={user} />} />
      </Routes>
      <ChatBot />
    </Router>
  );
}

export default App;
