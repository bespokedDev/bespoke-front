/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react';
// CORRECCIÓN: Se usan rutas relativas para evitar problemas de resolución de alias.
import { useAuth } from '../../contexts/AuthContext'; 
import { apiClient } from '../../lib/api'; 
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await apiClient('api/users/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (response.token && response.user) {
        login(response.token, response.user);
      } else {
        setError('Login failed: Invalid response from server.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-lightBackground dark:bg-darkBackground">
      <Card className="w-full max-w-sm bg-lightCard dark:bg-darkCard border-lightBorder dark:border-darkBorder">
        <CardHeader>
          <CardTitle className="text-2xl text-lightText dark:text-darkText">Login</CardTitle>
          <CardDescription className="text-lightSubtext dark:text-darkSubtext">
            Enter your username below to login to your account.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email" className="text-lightText dark:text-darkText">User</Label>
              <Input
                id="email"
                type="text"
                placeholder="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="bg-transparent text-lightText dark:text-darkText border-lightBorder dark:border-darkBorder placeholder:text-lightSubtext/70 focus-visible:ring-primary"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password" className="text-lightText dark:text-darkText">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="bg-transparent text-lightText dark:text-darkText border-lightBorder dark:border-darkBorder placeholder:text-lightSubtext/70 focus-visible:ring-primary"
              />
            </div>
            {error && (
              <p className="text-sm text-accent1">{error}</p>
            )}
          </CardContent>
          <CardFooter>
            <Button className="w-full bg-primary text-white hover:bg-primary/90" type="submit" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
