"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import { signInUser, resetPassword } from "../firebase/auth";
import Image from "next/image";
import { useAuth } from "../context/AuthContext";
import Loader from "../components/Loader";
import toast from "react-hot-toast";

export default function Login() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    if (user) {
      router.replace("/dashboard");
    }
  }, [user, router]);

  if (loading) return <Loader />;
  if (user) return null;

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setFormLoading(true);

    try {
      await signInUser(email, password);
      toast.success("Logged in successfully!");
      setTimeout(() => {
        router.replace("/dashboard");
      }, 500);
    } catch (err) {
      setFormLoading(false);
      switch (err.code) {
        case "auth/user-not-found":
          setError("Account not found. Please sign up.");
          break;
        case "auth/wrong-password":
          setError("Incorrect password.");
          break;
        case "auth/invalid-email":
          setError("Invalid email format.");
          break;
        case "auth/invalid-credential":
          setError("Invalid login credentials.");
          break;
        default:
          setError("Login failed. Try again.");
      }
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Please enter your email first.");
      return;
    }

    setResetLoading(true);
    try {
      await resetPassword(email);
      toast.success("Password reset email sent!");
    } catch (err) {
      switch (err.code) {
        case "auth/user-not-found":
          setError("No account found with this email.");
          break;
        case "auth/invalid-email":
          setError("Invalid email address.");
          break;
        default:
          setError("Failed to send reset email. Try again.");
      }
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-4 py-8 bg-white text-center">
      <div className="mb-6">
        <Image
          src="/assets/logo.png"
          alt="R-Tudo Logo"
          width={120}
          height={120}
          priority
        />
      </div>

      <h2 className="text-2xl font-semibold text-gray-800 mb-6 leading-snug">
        Join the English Learning Revolution
      </h2>

      <div className="w-full max-w-md mt-4 text-left">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Login</h2>
            <p className="text-gray-500 text-sm">
              Welcome back! Log in to continue
            </p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-[var(--color-primary)]"
          />

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg pr-10 text-black focus:ring-2 focus:ring-[var(--color-primary)]"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3.5 text-gray-500"
            >
              {showPassword ? (
                <AiOutlineEyeInvisible size={22} />
              ) : (
                <AiOutlineEye size={22} />
              )}
            </button>
          </div>

          <p
            className={`text-sm text-[var(--color-primary)] cursor-pointer mt-1 ${
              resetLoading ? "opacity-50 cursor-not-allowed" : ""
            }`}
            onClick={!resetLoading ? handleForgotPassword : undefined}
          >
            Forgot Password?
          </p>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            className="w-full py-3 bg-[var(--color-primary)] text-white rounded-full font-semibold hover:opacity-90 transition"
          >
            {formLoading ? "Logging in..." : "Log In"}
          </button>
        </form>

        <p className="text-sm text-center mt-6 text-[var(--color-primary)] font-medium">
          <button
            onClick={() => router.push("/signup")}
            className="font-bold cursor-pointer"
          >
            Don’t have an account? Sign Up
          </button>
        </p>
      </div>
    </main>
  );
}
