import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import LandingPage from './pages/LandingPage';
import CreateHQFlow from './pages/CreateHQFlow';
import JoinHQFlow from './pages/JoinHQFlow';
import PinScreen from './pages/PinScreen';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Layout from './components/Layout';
import FamilySelect from './pages/FamilySelect';
import Dashboard from './pages/Dashboard';
import CalendarPage from './pages/CalendarPage';
import ChoresPage from './pages/ChoresPage';
import MealsPage from './pages/MealsPage';
import BudgetPage from './pages/BudgetPage';
import NoticeboardPage from './pages/NoticeboardPage';
import GoalsPage from './pages/GoalsPage';
import RewardsPage from './pages/RewardsPage';
import GuidePage from './pages/GuidePage';
import MomentsPage from './pages/MomentsPage';

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
      <Route path="/create-hq" element={<CreateHQFlow />} />
      <Route path="/join-hq" element={<JoinHQFlow />} />
      <Route path="/pin" element={<PinScreen />} />
      <Route path="/select" element={<FamilySelect />} />
      <Route element={<Layout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/chores" element={<ChoresPage />} />
        <Route path="/meals" element={<MealsPage />} />
        <Route path="/budget" element={<BudgetPage />} />
        <Route path="/noticeboard" element={<NoticeboardPage />} />
        <Route path="/goals" element={<GoalsPage />} />
        <Route path="/rewards" element={<RewardsPage />} />
        <Route path="/guide" element={<GuidePage />} />
        <Route path="/moments" element={<MomentsPage />} />
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