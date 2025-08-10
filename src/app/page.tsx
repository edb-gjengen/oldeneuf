"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import Scanner from "@/components/Scanner";
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

function SessionInfo({ session }: { session: SessionResponse }) {
  return (
    <div className="max-w-md mx-auto mt-6 p-6 rounded-xl shadow-lg border border-gray-200 bg-gradient-to-br from-gray-50 to-gray-200 space-y-4">
      <div className="flex flex-col items-center">
        <Image
          src={`data:image/jpeg;base64,${session.documentPhoto}`}
          alt="Document"
          width={200}
          height={261}
          className="w-40 h-50 object-cover rounded-lg mb-4 border border-gray-300 shadow"
          unoptimized
        />
        {(session.firstName || session.lastName) && (
          <div className="text-xl font-bold text-gray-800">
            {[session.firstName, session.lastName].filter(Boolean).join(" ")}
          </div>
        )}
        {typeof session.age === "number" && (
          <div className="text-3xl font-extrabold text-blue-700 mt-2">
            {session.age} år
          </div>
        )}
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

function HomeInner() {
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [scannedCodes, setScannedCodes] = useState<Set<string>>(new Set());
  const pendingCodeRef = useRef<string | null>(null);

  const mutation = useMutation({
    mutationFn: lookupSession,
    onSuccess: (data, variables) => {
      console.log("Got lookup result:", data);
      if (data && typeof data.age === "number") {
        setSession(data);
        setScannedCodes((prev) => new Set(prev).add(variables));
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

  return (
    <div>
      <Scanner onScan={handleScan} />
      {session && <SessionInfo session={session} />}
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
