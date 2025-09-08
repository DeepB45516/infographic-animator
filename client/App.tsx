import "./global.css";

import { Toaster } from "@/components/ui/toaster";

// Global ResizeObserver error suppression
if (typeof window !== 'undefined') {
  const resizeObserverErrorHandler = (e: ErrorEvent) => {
    if (e.message === 'ResizeObserver loop completed with undelivered notifications.') {
      e.stopImmediatePropagation();
      return false;
    }
    if (e.message === 'ResizeObserver loop limit exceeded') {
      e.stopImmediatePropagation();
      return false;
    }
  };

  window.addEventListener('error', resizeObserverErrorHandler);

  // Also handle unhandled rejections that might be related
  window.addEventListener('unhandledrejection', (e) => {
    if (e.reason?.message?.includes('ResizeObserver')) {
      e.preventDefault();
      console.warn('Suppressed ResizeObserver error:', e.reason);
    }
  });
}
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import FileToChart from "./pages/FileToChart";
import TextToChart from "./pages/TextToChart";
import AnimateChart from "./pages/AnimateChart";
import TextToUML from "./pages/TextToUML";
import TextToERDiagram from "./pages/TextToERDiagram";
import NotFound from "./pages/NotFound";

// ✅ Import ChatBot
import ChatBot from "./components/ChatBot";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/file-to-chart" element={<FileToChart />} />
            <Route path="/text-to-chart" element={<TextToChart />} />
            <Route path="/animate-chart" element={<AnimateChart />} />
            <Route path="/text-to-uml" element={<TextToUML />} />
            <Route path="/text-to-er-diagram" element={<TextToERDiagram />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          {/* ✅ Floating ChatBot added here so it's always visible */}
          <ChatBot />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);