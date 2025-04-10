"use client";

import { useEffect, useState } from "react";

export default function SetupOverlay({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false); // Ensures nothing renders until Step 0 is complete
  const [currentStep, setCurrentStep] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [waitingForUser, setWaitingForUser] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const totalSteps = 8;

  useEffect(() => {
    const runSetup = async () => {
      try {
        // Step 0 – Check if already set up
        const res0 = await fetch("/api/setup?step=0");
        const data0 = await res0.json();

        if (data0.done) {
          setDone(true);
          setReady(true);
          return;
        }

        if (data0.paused) {
          // If paused, set to waiting state and exit early.
          setCurrentStep(6);
          setWaitingForUser(true);
          setReady(true);
          return;
        }

        setReady(true); // we're good to begin rendering the UI

        // Run steps 1 to totalSteps
        for (let step = 1; step <= totalSteps; step++) {
          // if at step 7 and we're waiting for user, break the loop.
          if (step === 7 && waitingForUser) break;

          setCurrentStep(step);

          const res = await fetch(`/api/setup?step=${step}`);
          const data = await res.json();

          if (!res.ok) throw new Error(data.error || `Step ${step} failed`);

          setLog((prev) => [...prev, `✅ ${data.log}`]);

          // At step 6, check for an invite link in the log
          if (step === 6 && data.log.includes("Invite link")) {
            const match = data.log.match(/https?:\/\/\S+/);
            const link = match ? match[0] : null;
            if (link) {
              setInviteLink(link);
              setWaitingForUser(true);
              return; // Exit the loop until the user takes action
            }
          }
        }

        setLog((prev) => [...prev, "🎉 Setup completed successfully."]);
        setTimeout(() => setDone(true), 1000);
      } catch (err: any) {
        setError(err.message || "Unknown error");
        setReady(true);
      }
    };

    // Run the setup only once when the component mounts.
    runSetup();
  }, []); // Remove waitingForUser from the dependency array

  const handleContinue = async () => {
    setWaitingForUser(false);
    setCurrentStep(7);

    try {
      for (let step = 7; step <= totalSteps; step++) {
        const checkUserValid = await fetch(`/api/setup/validate-user`);
        const checkUserValidMsg = await checkUserValid.json();

        if (!checkUserValid.ok)
          throw new Error(checkUserValidMsg.error || `Step ${step} failed`);

        if (!checkUserValidMsg.success) { 
          setWaitingForUser(true);
          setLog((prev) => [...prev, "You have not linked your account, click on the link below to continue."]);
          setCurrentStep(6);
          return;
        }
        
        const res = await fetch(`/api/setup?step=${step}`);
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || `Step ${step} failed`);

        setLog((prev) => [...prev, `✅ ${data.log}`]);
      }

      setLog((prev) => [...prev, "🎉 Setup completed successfully."]);
      setTimeout(() => setDone(true), 1000);
    } catch (err: any) {
      setError(err.message || "Unknown error");
    }
  };

  // Do not render anything until Step 0 check completes.
  if (!ready) return null;

  // If setup is complete, render the main app.
  if (done) return <>{children}</>;

  const progressPercent = Math.min((currentStep / totalSteps) * 100, 100);

  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-6 py-12 w-full font-['Orbitron'] bg-[var(--color-grey)]">
      <div className="w-full max-w-lg bg-[var(--color-white)] text-[var(--color-dark)] rounded-xl p-8 shadow-2xl border border-[var(--color-dark)] text-center flex flex-col justify-center min-h-[350px]">
        <h1 className="text-4xl font-bold pb-4 tracking-wider text-[var(--color-dark)]">
          Setting Up MECHAPURSE
        </h1>

        <div className="w-full h-2 bg-gray-300 rounded-full mb-4 overflow-hidden">
          <div
            className="h-full bg-[var(--color-blue)] transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="bg-gray-100 text-left text-sm p-4 rounded-md h-48 overflow-y-auto border border-gray-300 mb-4">
          {log.length === 0 ? (
            <p>Initializing setup...</p>
          ) : (
            log.map((entry, i) => <p key={i}>{entry}</p>)
          )}
        </div>

        {error && <p className="text-sm text-red-500 mt-2">❌ {error}</p>}

        {inviteLink && waitingForUser && (
          <div className="flex flex-col items-center space-y-3">
            <a
              href={inviteLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm underline text-[var(--color-blue)]"
            >
              👉 Click here to complete account setup
            </a>
            <button
              onClick={handleContinue}
              className="bg-[var(--color-blue)] text-white font-bold py-2 px-6 rounded-xl hover:brightness-90 transition-all"
            >
              Continue Setup
            </button>
          </div>
        )}

        {!waitingForUser && !error && (
          <p className="pt-4 text-sm text-[#8E8E8E]">
            This will only run once. Setting up your realm...
          </p>
        )}
      </div>
    </main>
  );
}
