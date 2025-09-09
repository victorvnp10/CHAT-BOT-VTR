import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema, type InsertUser } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, UserPlus, LogIn, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register: registerUser, isRegisterPending } = useAuth();
  const [, setLocation] = useLocation();

  const form = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      email: "",
      password: "",
      name: "",
      rank: "",
      unit: "",
    },
  });

  const onSubmit = async (data: InsertUser) => {
    try {
      setError(null);
      console.log('Attempting registration with:', { 
        email: data.email, 
        name: data.name, 
        rank: data.rank, 
        unit: data.unit 
      });
      
      await registerUser(data);
      console.log('Registration successful, redirecting...');
      setLocation("/");
    } catch (err: any) {
      const errorMessage = err?.message || "Erro ao criar conta";
      console.error('Registration failed:', errorMessage);
      setError(errorMessage);
    }
  };

  const goToLogin = () => {
    setLocation("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center">
              <UserPlus className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Criar Conta</CardTitle>
          <CardDescription>
            Preencha os dados para criar sua conta no sistema FAB
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo *</Label>
              <Input
                id="name"
                type="text"
                placeholder="Seu nome completo"
                {...form.register("name")}
                className={form.formState.errors.name ? "border-red-500" : ""}
                disabled={isRegisterPending}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu.email@fab.mil.br"
                {...form.register("email")}
                className={form.formState.errors.email ? "border-red-500" : ""}
                disabled={isRegisterPending}
              />
              {form.formState.errors.email && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Senha *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  {...form.register("password")}
                  className={form.formState.errors.password ? "border-red-500 pr-10" : "pr-10"}
                  disabled={isRegisterPending}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  disabled={isRegisterPending}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {form.formState.errors.password && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="rank">Posto/Graduação</Label>
              <Input
                id="rank"
                type="text"
                placeholder="Ex: Ten Cel Av, Maj Av, etc."
                {...form.register("rank")}
                className={form.formState.errors.rank ? "border-red-500" : ""}
                disabled={isRegisterPending}
              />
              {form.formState.errors.rank && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.rank.message}
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="unit">Unidade de Origem</Label>
              <Input
                id="unit"
                type="text"
                placeholder="Ex: CINDACTA I, EEAR, etc."
                {...form.register("unit")}
                className={form.formState.errors.unit ? "border-red-500" : ""}
                disabled={isRegisterPending}
              />
              {form.formState.errors.unit && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.unit.message}
                </p>
              )}
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isRegisterPending}
            >
              {isRegisterPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Criando conta...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Criar conta
                </>
              )}
            </Button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Já tem uma conta?
                </span>
              </div>
            </div>
            
            <Button
              type="button"
              variant="outline"
              onClick={goToLogin}
              className="w-full"
              disabled={isRegisterPending}
            >
              <LogIn className="w-4 h-4 mr-2" />
              Fazer login
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}