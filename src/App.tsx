import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { DynamicIslandProvider } from "@/components/DynamicIsland";
import SplashScreen from "@/components/SplashScreen";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Licenses from "./pages/Licenses";
import About from "./pages/About";
import Moisture from "./pages/Moisture";
import Fertility from "./pages/Fertility";
import Schedule from "./pages/Schedule";
import Profile from "./pages/Profile";
import Crops from "./pages/Crops";
import CropComparison from "./pages/CropComparison";
import Sensors from "./pages/Sensors";
import PestDetection from "./pages/PestDetection";
import YieldPrediction from "./pages/YieldPrediction";
import FarmMap from "./pages/FarmMap";
import Leaderboard from "./pages/Leaderboard";
import PumpControl from "./pages/PumpControl";
import DiseaseHistory from "./pages/DiseaseHistory";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";
import OfflineIndicator from "./components/OfflineIndicator";
import InstallPrompt from "./components/InstallPrompt";

const queryClient = new QueryClient();

const App = () => {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 800);
    return () => clearTimeout(timer);
  }, []);

  if (showSplash) return <SplashScreen />;

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <DynamicIslandProvider>
      <QueryClientProvider client={queryClient}>
        <Toaster />
        <Sonner position="top-center" />
        <OfflineIndicator />
        <InstallPrompt />
        <BrowserRouter>
          <ErrorBoundary>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/licenses" element={<Licenses />} />
              <Route path="/about" element={<About />} />
              <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/moisture" element={<ProtectedRoute><Moisture /></ProtectedRoute>} />
              <Route path="/fertility" element={<ProtectedRoute><Fertility /></ProtectedRoute>} />
              <Route path="/schedule" element={<ProtectedRoute><Schedule /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/crops" element={<ProtectedRoute><Crops /></ProtectedRoute>} />
              <Route path="/crop-comparison" element={<ProtectedRoute><CropComparison /></ProtectedRoute>} />
              <Route path="/sensors" element={<ProtectedRoute><Sensors /></ProtectedRoute>} />
              <Route path="/pest-detection" element={<ProtectedRoute><PestDetection /></ProtectedRoute>} />
              <Route path="/yield-prediction" element={<ProtectedRoute><YieldPrediction /></ProtectedRoute>} />
              <Route path="/farm-map" element={<ProtectedRoute><FarmMap /></ProtectedRoute>} />
              <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
              <Route path="/pump-control" element={<ProtectedRoute><PumpControl /></ProtectedRoute>} />
              <Route path="/disease-history" element={<ProtectedRoute><DiseaseHistory /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ErrorBoundary>
        </BrowserRouter>
      </QueryClientProvider>
      </DynamicIslandProvider>
    </ThemeProvider>
  );
};

export default App;
