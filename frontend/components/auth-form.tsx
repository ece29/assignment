"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { apiFetch, storeAccessToken, storeUser } from "../lib/api";
import type { User } from "../lib/types";

type AuthResponse = {
  message: string;
  accessToken: string;
  user: User;
};

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: ""
  });

  const isRegister = mode === "register";

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    startTransition(() => {
      void (async () => {
        try {
          const payload = await apiFetch<AuthResponse>(`/auth/${mode}`, {
            method: "POST",
            body: JSON.stringify(
              isRegister
                ? form
                : {
                    email: form.email,
                    password: form.password
                  }
            )
          });

          storeAccessToken(payload.accessToken);
          storeUser(payload.user);
          toast.success(payload.message);
          router.replace("/");
        } catch (submissionError) {
          setError(
            submissionError instanceof Error
              ? submissionError.message
              : "Unable to continue"
          );
        }
      })();
    });
  };

  return (
    <div className="shell">
      <div className="panel auth-grid">
        <section className="auth-hero">
          <div>
            <span className="eyebrow">Task Flow Studio</span>
            <h1 className="hero-title">Plan clearly. Finish calmly.</h1>
            <p className="hero-copy">
              A secure, responsive task manager built with a Node.js API and a modern
              Next.js frontend.
            </p>
            <div className="hero-stats">
              <div className="stat">
                <strong>JWT</strong>
                Access and refresh token flow.
              </div>
              <div className="stat">
                <strong>CRUD</strong>
                Search, filter, and manage tasks.
              </div>
              <div className="stat">
                <strong>Mobile</strong>
                Responsive layout across devices.
              </div>
            </div>
          </div>
        </section>

        <section className="auth-card">
          <form className="auth-form" onSubmit={handleSubmit}>
            <h2>{isRegister ? "Create your account" : "Welcome back"}</h2>
            <p>
              {isRegister
                ? "Register to start managing your tasks."
                : "Log in to open your dashboard."}
            </p>

            {isRegister ? (
              <div className="field">
                <label htmlFor="name">Name</label>
                <input
                  id="name"
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, name: event.target.value }))
                  }
                  required
                />
              </div>
            ) : null}

            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({ ...current, email: event.target.value }))
                }
                required
              />
            </div>

            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                minLength={8}
                value={form.password}
                onChange={(event) =>
                  setForm((current) => ({ ...current, password: event.target.value }))
                }
                required
              />
            </div>

            <div className="auth-actions">
              <button className="button" type="submit" disabled={isPending}>
                {isPending ? "Please wait..." : isRegister ? "Register" : "Login"}
              </button>
            </div>

            {error ? <p className="error-text">{error}</p> : null}

            <p>
              {isRegister ? "Already registered?" : "Need an account?"}{" "}
              <Link href={isRegister ? "/login" : "/register"}>
                {isRegister ? "Login" : "Register"}
              </Link>
            </p>
          </form>
        </section>
      </div>
    </div>
  );
}
