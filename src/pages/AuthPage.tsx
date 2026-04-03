import React, { useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { validateUsername } from "@/utils/validation";

// Map Firebase error codes to user-friendly Hebrew messages
const getFirebaseErrorMessage = (code: string): string => {
  const messages: Record<string, string> = {
    "auth/invalid-email": "שם המשתמש אינו תקין",
    "auth/user-not-found": "שם המשתמש לא נמצא",
    "auth/wrong-password": "הסיסמה שגויה",
    "auth/invalid-credential": "פרטי ההתחברות שגויים",
    "auth/email-already-in-use": "שם המשתמש כבר תפוס",
    "auth/weak-password": "הסיסמה חלשה מדי — לפחות 6 תווים",
    "auth/too-many-requests": "יותר מדי ניסיונות — נסה שוב מאוחר יותר",
    "auth/network-request-failed": "בעיית רשת — בדוק את החיבור לאינטרנט",
  };
  return messages[code] ?? "אירעה שגיאה, נסה שוב";
};

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    const vError = validateUsername(username);
    if (vError) {
      setError(vError);
      return;
    }

    if (!password) {
      setError("אנא הזן סיסמה");
      return;
    }

    setLoading(true);
    const dummyEmail = `${username.trim().toLowerCase()}@guess-the-alarm.local`;
    
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, dummyEmail, password);
      } else {
        await createUserWithEmailAndPassword(auth, dummyEmail, password);
      }
    } catch (err: any) {
      setError(getFirebaseErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6 animate-slideInUp">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black text-primary tracking-wider">
            GUESS THE ALARM
          </h1>
          <p className="text-muted-foreground text-sm">נחש את האזעקה 🚀</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="text"
            placeholder="שם משתמש"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="bg-card border-border text-foreground text-right"
            dir="rtl"
            disabled={loading}
          />
          <Input
            type="password"
            placeholder="סיסמה"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-card border-border text-foreground text-right"
            dir="rtl"
            disabled={loading}
          />
          {error && (
            <p className="text-destructive text-xs bg-destructive/10 rounded-lg px-3 py-2 text-center font-bold">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full font-bold text-lg" disabled={loading}>
            {loading ? "מתחבר..." : isLogin ? "התחבר" : "הירשם"}
          </Button>
        </form>

        <button
          className="w-full text-center text-sm text-muted-foreground underline"
          onClick={() => { setError(""); setIsLogin(!isLogin); }}
        >
          {isLogin ? "אין לך חשבון? הירשם" : "יש לך חשבון? התחבר"}
        </button>
      </div>
    </div>
  );
};

export default AuthPage;
