"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase/client";

interface AuthState {
  user: User | null;
  loading: boolean;
  token: string | null;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    token: null,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const token = await user.getIdToken();
        setState({ user, loading: false, token });
      } else {
        setState({ user: null, loading: false, token: null });
      }
    });

    return unsubscribe;
  }, []);

  return state;
}
