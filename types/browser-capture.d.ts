// types/browser-capture.d.ts
export {};
declare global {
  interface Window {
    __browserCapture?: {
      sessionId: string; // ← теперь TS знает про sessionId
      capture: (type: string, payload?: any) => void;
    };
  }
}

export {};