import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthState } from '@/hooks/auth/useAuthState';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from 'sonner';
import { LandingPage } from '@/pages/LandingPage';
import { UserCreditProvider } from '@/contexts/UserCreditContext';
import { supabase, initializeLocalDatabase } from '@/lib/supabase';

// Lazy-loaded pages for better performance
const Dashboard = lazy(() => import('@/pages/Dashboard').then(module => ({ default: module.Dashboard })));
const CalendarPage = lazy(() => import('@/pages/CalendarPage').then(module => ({ default: module.CalendarPage })));
const DrillGenerator = lazy(() => import('@/pages/DrillGenerator').then(module => ({ default: module.DrillGenerator })));
const PlanGenerator = lazy(() => import('@/pages/PlanGenerator').then(module => ({ default: module.PlanGenerator })));
const AccountPage = lazy(() => import('@/pages/AccountPage').then(module => ({ default: module.AccountPage })));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then(module => ({ default: module.NotFoundPage })));
const PricingPage = lazy(() => import('@/pages/PricingPage').then(module => ({ default: module.PricingPage })));
const AuthCallbackPage = lazy(() => import('@/pages/AuthCallbackPage').then(module => ({ default: module.AuthCallbackPage })));

const App = () => {
  const { session, loading } = useAuthState();
  
  useEffect(() => {
    // Initialize the local database if needed
    const initialize = async () => {
      try {
        await initializeLocalDatabase();
      } catch (error) {
        console.error('Failed to initialize local database:', error);
      }
    };
    
    initialize();
  }, []);
  
  // Check if user is authenticated
  const isAuthenticated = !!session?.user;
  
  // Path protection higher-order component
  const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    if (loading) {
      return <div className="flex items-center justify-center h-screen">Loading...</div>;
    }
    
    return isAuthenticated ? <>{children}</> : <Navigate to="/" />;
  };
  
  // Public routes are only accessible when NOT authenticated
  const PublicRoute = ({ children }: { children: React.ReactNode }) => {
    if (loading) {
      return <div className="flex items-center justify-center h-screen">Loading...</div>;
    }
    
    return !isAuthenticated ? <>{children}</> : <Navigate to="/dashboard" />;
  };
  
  return (
    <AuthProvider session={session} setSession={null}>
      <UserCreditProvider>
        <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
          <Routes>
            {/* Public routes */}
            <Route 
              path="/" 
              element={<PublicRoute><LandingPage /></PublicRoute>} 
            />
            <Route 
              path="/pricing" 
              element={<PricingPage />} 
            />
            <Route 
              path="/auth/callback" 
              element={<AuthCallbackPage />} 
            />
            
            {/* Protected routes */}
            <Route 
              path="/dashboard" 
              element={<ProtectedRoute><Dashboard /></ProtectedRoute>} 
            />
            <Route 
              path="/calendar" 
              element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} 
            />
            <Route 
              path="/drills" 
              element={<ProtectedRoute><DrillGenerator /></ProtectedRoute>} 
            />
            <Route 
              path="/plans" 
              element={<ProtectedRoute><PlanGenerator /></ProtectedRoute>} 
            />
            <Route 
              path="/account" 
              element={<ProtectedRoute><AccountPage /></ProtectedRoute>} 
            />
            
            {/* 404 page */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
        
        <Toaster position="top-right" />
      </UserCreditProvider>
    </AuthProvider>
  );
};

export default App;