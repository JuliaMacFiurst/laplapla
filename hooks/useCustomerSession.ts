import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export type CustomerSessionState =
  | { status: "loading"; session: null; error: null }
  | { status: "anonymous"; session: null; error: null }
  | { status: "authenticated"; session: Session; error: null }
  | { status: "error"; session: null; error: string };

export function useCustomerSession(): CustomerSessionState {
  const [state, setState] = useState<CustomerSessionState>({
    status: "loading",
    session: null,
    error: null,
  });

  useEffect(() => {
    let active = true;
    let authEventSeen = false;

    const applySession = (session: Session | null) => {
      if (!active) return;
      setState(session
        ? { status: "authenticated", session, error: null }
        : { status: "anonymous", session: null, error: null });
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      authEventSeen = true;
      applySession(session);
    });

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active || authEventSeen) return;
      if (error) {
        setState({ status: "error", session: null, error: error.message });
        return;
      }
      applySession(data.session);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return state;
}
