import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export function Header() {
  const [location, navigate] = useLocation();
  const { user, logout, isLogoutPending } = useAuth();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <i className="fas fa-robot text-fab-blue text-2xl"></i>
              <h1 
                className="text-xl font-semibold text-gray-900 cursor-pointer"
                onClick={() => navigate("/")}
                data-testid="header-title"
              >
                Sistema de Chatbots FAB
              </h1>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2" data-testid="button-user-menu">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-sm text-left">
                      <div className="font-medium text-gray-900" data-testid="text-username">
                        {user.name}
                      </div>
                      {user.rank && (
                        <div className="text-xs text-gray-500" data-testid="text-user-rank">
                          {user.rank}
                        </div>
                      )}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="flex items-center cursor-pointer">
                    <User className="w-4 h-4 mr-2" />
                    {user.email}
                  </DropdownMenuItem>
                  {user.unit && (
                    <DropdownMenuItem className="text-sm text-gray-500">
                      {user.unit}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="flex items-center cursor-pointer text-red-600"
                    onClick={() => logout()}
                    disabled={isLogoutPending}
                    data-testid="button-logout"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    {isLogoutPending ? "Saindo..." : "Sair"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
