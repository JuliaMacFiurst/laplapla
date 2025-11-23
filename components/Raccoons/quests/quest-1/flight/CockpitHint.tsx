"use client";

import React, { useEffect, useState } from "react";

export default function CockpitHint({
  text,
  onClose,
}: {
  text: string;
  onClose: () => void;
}) {
  const [printed, setPrinted] = useState("");
  const [showOk, setShowOk] = useState(false);

  useEffect(() => {
    if (!text) {
      setPrinted("");
      setShowOk(false);
      return;
    }

    let i = 0;
    const interval = setInterval(() => {
      i++;
      setPrinted(text.slice(0, i));

      // полностью напечатали текст → показать кнопку
      if (i >= text.length) {
        clearInterval(interval);
        setTimeout(() => setShowOk(true), 250);
      }
    }, 30);

    return () => clearInterval(interval);
  }, [text]);

  return (
    <>
      {/* Close (X) button */}
      <button
        className="hint-close-btn"
        onClick={() => {
          setPrinted("");
          setShowOk(false);
          onClose();
        }}
      >
        ✕
      </button>

      {printed && <div className="green-hint">{printed}</div>}
    </>
  );
}