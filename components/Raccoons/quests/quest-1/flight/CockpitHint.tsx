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

  useEffect(() => {
    if (!text) {
      setPrinted("");
      return;
    }

    let i = 0;
    const interval = setInterval(() => {
      i++;
      setPrinted(text.slice(0, i));

      // полностью напечатали текст → показать кнопку
      if (i >= text.length) {
        clearInterval(interval);
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
          onClose();
        }}
      >
        ✕
      </button>

      {printed && <div className="green-hint">{printed}</div>}
    </>
  );
}