import React, { useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black text-primary tracking-wider">
            GUESS THE ALARM
          </h1>
          <p className="text-muted-foreground text-sm">נחש את האזעקה 🚀</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            placeholder="אימייל"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-card border-border text-foreground text-right"
            dir="ltr"
          />
          <Input
            type="password"
            placeholder="סיסמה"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-card border-border text-foreground text-right"
            dir="ltr"
          />
          {error && <p className="text-destructive text-xs">{error}</p>}
          <Button type="submit" className="w-full font-bold text-lg">
            {isLogin ? "התחבר" : "הירשם"}
          </Button>
        </form>

        <Button
          variant="outline"
          className="w-full"
          onClick={handleGoogle}
        >
          🔵 התחבר עם Google
        </Button>

        <button
          className="w-full text-center text-sm text-muted-foreground underline"
          onClick={() => setIsLogin(!isLogin)}
        >
          {isLogin ? "אין לך חשבון? הירשם" : "יש לך חשבון? התחבר"}
        </button>
      </div>
    </div>
  );
};

export default AuthPage;
