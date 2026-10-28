"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Options = {
  open: boolean;
  dirty: boolean;
  onExit: () => void;
};

// Asks before leaving a form with unsaved changes: Cancel/X/Esc, the browser Back
// button (via an extra history entry while the form is open) and reload/close tab.
export function useUnsavedChangesGuard({ open, dirty, onExit }: Options) {
  const [confirming, setConfirming] = useState(false);
  const dirtyRef = useRef(dirty);
  const onExitRef = useRef(onExit);
  const ownEntry = useRef(false);
  const ignoreNextPop = useRef(false);

  useEffect(() => {
    dirtyRef.current = dirty;
    onExitRef.current = onExit;
  });

  useEffect(() => {
    if (!open || !dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [open, dirty]);

  useEffect(() => {
    if (!open) return;
    window.history.pushState({ formOpen: true }, "");
    ownEntry.current = true;

    const onPopState = () => {
      if (ignoreNextPop.current) {
        ignoreNextPop.current = false;
        return;
      }
      ownEntry.current = false;
      if (dirtyRef.current) {
        // Stay on the form until the user chooses explicitly.
        window.history.pushState({ formOpen: true }, "");
        ownEntry.current = true;
        setConfirming(true);
      } else {
        onExitRef.current();
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [open]);

  // Closes the form and removes the history entry it added.
  const exit = useCallback(() => {
    setConfirming(false);
    if (ownEntry.current) {
      ownEntry.current = false;
      ignoreNextPop.current = true;
      window.history.back();
    }
    onExitRef.current();
  }, []);

  const requestExit = useCallback(() => {
    if (dirtyRef.current) setConfirming(true);
    else exit();
  }, [exit]);

  const keepEditing = useCallback(() => setConfirming(false), []);

  return { confirming, requestExit, exit, keepEditing };
}
