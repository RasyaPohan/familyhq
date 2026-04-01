import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import Layout from './components/Layout';

// Eagerly loaded (small, needed immediately)
import LandingPage from './pages/LandingPage';
import PinScreen from './pages/PinScreen';
import FamilySelect from './pages/FamilySelect';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

// Lazy loaded — split into separate chunks
const CreateHQFlow    = lazy(() => import('./pages/CreateHQFlow'));
const JoinHQFlow      = lazy(() => import('./pages/JoinHQFlow'));
const OutdoorScene    = lazy(() => import('./pages/OutdoorScene'));
const IsometricHome   = lazy(() => import('./pages/IsometricHome'));
const Dashboard       = lazy(() => import('./pages/Dashboard'));
const CalendarPage    = lazy(() => import('./pages/CalendarPage'));
const ChoresPage      = lazy(() => import('./pages/ChoresPage'));
const MealsPage       = lazy(() => import('./pages/MealsPage'));
const BudgetPage      = lazy(() => import('./pages/BudgetPage'));
const NoticeboardPage = lazy(() => import('./pages/NoticeboardPage'));
const GoalsPage       = lazy(() => import('./pages/GoalsPage'));
const RewardsPage     = lazy(() => import('./pages/RewardsPage'));
const GuidePage       = lazy(() => import('./pages/GuidePage'));
const MomentsPage     = lazy(() => import('./pages/MomentsPage'));

// Wrap a lazy component so it has its own Suspense — prevents the whole
// Routes tree from suspending and unmounting the current page.
function LazyPage({ component: Component }) {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-purple-500/30 border-t-purple-400 animate-spin" />
      </div>
    }>
      <Component />
    </Suspense>
  );
}

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/create-hq" element={<LazyPage component={CreateHQFlow} />} />
      <Route path="/join-hq" element={<LazyPage component={JoinHQFlow} />} />
      <Route path="/pin" element={<PinScreen />} />
      <Route path="/select" element={<FamilySelect />} />
      <Route path="/outdoor" element={<LazyPage component={OutdoorScene} />} />
      <Route path="/home" element={<LazyPage component={IsometricHome} />} />
      <Route element={<Layout />}>
        <Route path="/dashboard" element={<LazyPage component={Dashboard} />} />
        <Route path="/calendar" element={<LazyPage component={CalendarPage} />} />
        <Route path="/chores" element={<LazyPage component={ChoresPage} />} />
        <Route path="/meals" element={<LazyPage component={MealsPage} />} />
        <Route path="/budget" element={<LazyPage component={BudgetPage} />} />
        <Route path="/noticeboard" element={<LazyPage component={NoticeboardPage} />} />
        <Route path="/goals" element={<LazyPage component={GoalsPage} />} />
        <Route path="/rewards" element={<LazyPage component={RewardsPage} />} />
        <Route path="/guide" element={<LazyPage component={GuidePage} />} />
        <Route path="/moments" element={<LazyPage component={MomentsPage} />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App