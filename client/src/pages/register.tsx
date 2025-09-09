import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema, type InsertUser } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, UserPlus, LogIn } from "lucide-react";
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
      await registerUser(data);
      setLocation("/");
    } catch (err: any) {
      setError(err?.message || "Erro ao criar conta");
    }
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
            Crie sua conta para acessar a plataforma de chatbots da FAB
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo</Label>
              <Input
                id="name"
                type="text"
                placeholder="Seu nome completo"
                data-testid="input-name"
                {...form.register("name")}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu.email@fab.mil.br"
                data-testid="input-email"
                {...form.register("email")}
              />
              {form.formState.errors.email && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="rank">Posto/Graduação (Opcional)</Label>
              <Input
                id="rank"
                type="text"
                placeholder="Ex: Tenente Coronel Aviador"
                data-testid="input-rank"
                {...form.register("rank")}
              />
              {form.formState.errors.rank && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {form.formState.errors.rank.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">Unidade (Opcional)</Label>
              <Input
                id="unit"
                type="text"
                placeholder="Ex: Divisão de Projetos e Inovação"
                data-testid="input-unit"
                {...form.register("unit")}
              />
              {form.formState.errors.unit && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {form.formState.errors.unit.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  data-testid="input-password"
                  {...form.register("password")}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  data-testid="button-toggle-password"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {form.formState.errors.password && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isRegisterPending}
              data-testid="button-register"
            >
              {isRegisterPending ? "Criando conta..." : "Criar Conta"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Já tem uma conta?{" "}
              <Button
                variant="link"
                className="p-0 h-auto font-semibold"
                onClick={() => setLocation("/login")}
                data-testid="link-login"
              >
                <LogIn className="w-4 h-4 mr-1" />
                Fazer login
              </Button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}