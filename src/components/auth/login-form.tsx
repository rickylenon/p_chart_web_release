"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";

const formSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);

    try {
      console.log("=== LOGIN PROCESS STARTING ===");

      // Clear any existing authentication data before login
      console.log("Step 1: Clearing existing auth data...");

      // Clear local storage
      if (typeof window !== "undefined") {
        localStorage.removeItem("p_chart_auth_user");
        localStorage.removeItem("p_chart_last_activity");
        localStorage.removeItem("productionOrdersUrl");
        localStorage.removeItem("lastUpdateType");
      }

      // Clear authentication cookies
      const cookiesToClear = [
        "next-auth.session-token",
        "next-auth.callback-url",
        "next-auth.csrf-token",
        "__Secure-next-auth.session-token",
        "__Host-next-auth.csrf-token",
        "p_chart_auth_user",
      ];

      cookiesToClear.forEach((cookieName) => {
        document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax`;
        document.cookie = `${cookieName}=; path=/; domain=${window.location.hostname}; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax`;
        document.cookie = `${cookieName}=; path=/; domain=.${window.location.hostname}; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax`;
      });

      console.log("Step 2: Attempting sign in...");
      const result = await signIn("credentials", {
        username: values.username,
        password: values.password,
        redirect: false,
      });

      if (result?.error) {
        console.log("Login failed:", result.error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Invalid credentials",
        });
        return;
      }

      console.log("Step 3: Login successful, redirecting...");
      // Force a hard redirect to ensure clean state
      window.location.href = "/dashboard";
    } catch (error) {
      console.error("Login error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Something went wrong",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input
                  disabled={isLoading}
                  placeholder="Enter your username"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input
                  disabled={isLoading}
                  type="password"
                  placeholder="Enter your password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button disabled={isLoading} type="submit" className="w-full">
          {isLoading ? "Loading..." : "Sign In"}
        </Button>
      </form>
    </Form>
  );
}
