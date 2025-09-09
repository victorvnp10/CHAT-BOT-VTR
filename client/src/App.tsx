import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/dashboard";
import Chat from "@/pages/chat";
import Admin from "@/pages/admin";
import EditChatbot from "@/pages/edit-chatbot";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import NotFound from "@/pages/not-found";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

function ProtectedRoute({ component: Component }: { component: any }) {
  const { isAuthenticated, isLoading, user } = useAuth();

  console.log('ProtectedRoute state:', { isAuthenticated, isLoading, hasUser: !!user });

  // Se ainda está carregando, mostrar loading
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Verificando autenticação...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Se não está autenticado, mostrar login
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Se está autenticado, mostrar componente
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/chat/:chatbotId" component={() => <ProtectedRoute component={Chat} />} />
      <Route path="/admin" component={() => <ProtectedRoute component={Admin} />} />
      <Route path="/edit/:chatbotId" component={() => <ProtectedRoute component={EditChatbot} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
