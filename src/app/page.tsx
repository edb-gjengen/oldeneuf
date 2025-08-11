"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Scanner from "@/components/Scanner";
import LoginForm from "@/components/LoginForm";
import {
  useMutation,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

type SessionResponse = {
  firstName: string;
  lastName: string;
  nnin: string;
  documentPhoto: string;
  age: number;
  phoneNumber: string;
};

function SessionInfo({
  session,
  onClear,
}: {
  session: SessionResponse;
  onClear: () => void;
}) {
  return (
    <div className="max-w-md mx-auto mt-2 p-2 bg-neuf-black space-y-4">
      <div className="flex items-center relative bg-white rounded-lg overflow-hidden">
        <button
          onClick={onClear}
          className="w-10 h-10 absolute top-2 right-2 bg-red-600 text-white rounded-full hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 flex items-center justify-center font-bold text-lg transition-colors duration-200"
          aria-label="Clear session"
        >
          &times;
        </button>
        <Image
          src={`data:image/jpeg;base64,${session.documentPhoto}`}
          alt="Document"
          width={200}
          height={261}
          className="w-40 h-50 object-cover border border-black-300 shadow"
          unoptimized
        />
        <div className="py-4 px-4">
          {(session.firstName || session.lastName) && (
            <div className="text-xl font-bold">
              {[session.firstName, session.lastName].filter(Boolean).join(" ")}
            </div>
          )}
          {typeof session.age === "number" && (
            <div className="text-5xl font-extrabold text-neuf-black mt-2">
              {session.age} år
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

async function lookupSession(sessionId: string) {
  const res = await fetch("/api/lookup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId }),
  });
  return res.json();
}

declare global {
  interface Window {
    umami?: {
      track: (eventName: string, eventData?: Record<string, unknown>) => void;
    };
  }
}

const trackEvent = (eventName: string, eventData?: Record<string, unknown>) => {
  if (typeof window !== "undefined" && window.umami) {
    window.umami.track(eventName, eventData);
  }
};

function HomeInner() {
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [scannedCodes, setScannedCodes] = useState<Set<string>>(new Set());
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const pendingCodeRef = useRef<string | null>(null);

  // check for valid session on mount
  useEffect(() => {
    fetch("/api/session")
      .then((res) => res.json())
      .then((data) => setIsAuthenticated(data.authenticated))
      .catch(() => setIsAuthenticated(false));
  }, []);

  const mutation = useMutation({
    mutationFn: lookupSession,
    onSuccess: (data, variables) => {
      console.log("Got lookup result:", data);
      if (data && typeof data.age === "number") {
        setSession(data);
        setScannedCodes((prev) => new Set(prev).add(variables));
        trackEvent("id-check");
      }
      pendingCodeRef.current = null;
    },
    onError: () => {
      pendingCodeRef.current = null;
    },
  });

  const handleScan = (decodedText: string) => {
    if (!decodedText.startsWith("VisLeg-")) {
      window.alert("Ugyldig QR-kode");
      return;
    }
    if (
      scannedCodes.has(decodedText) ||
      mutation.isPending ||
      pendingCodeRef.current === decodedText
    ) {
      // Already scanned or lookup in progress for this code
      return;
    }
    pendingCodeRef.current = decodedText;
    mutation.mutate(decodedText);
  };

  const handleClearSession = () => {
    setSession(null);
    setScannedCodes(new Set());
  };

  // const handleLogout = async () => {
  //   try {
  //     await fetch("/api/logout", { method: "POST" });
  //     setIsAuthenticated(false);
  //     setSession(null);
  //     setScannedCodes(new Set());
  //   } catch {
  //     alert("Noe gikk galt ved utlogging");
  //   }
  // };

  if (isAuthenticated === null) {
    return (
      <div className="text-center mt-20 text-white bg-neuf-black min-h-screen">
        Laster...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="bg-neuf-black min-h-screen">
        <LoginForm onLogin={() => setIsAuthenticated(true)} />
      </div>
    );
  }

  return (
    <div className="bg-neuf-black min-h-screen">
      {/* <div className="flex justify-end p-4">
        <button
          onClick={handleLogout}
          className="bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          Logg ut
        </button>
      </div> */}
      <Scanner onScan={handleScan} />
      {session && (
        <SessionInfo session={session} onClear={handleClearSession} />
      )}
    </div>
  );
}

// Provide react-query context
const queryClient = new QueryClient();

export default function Home() {
  return (
    <QueryClientProvider client={queryClient}>
      <HomeInner />
    </QueryClientProvider>
  );
}
