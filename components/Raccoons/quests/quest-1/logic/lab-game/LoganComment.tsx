"use client";

import { LOGAN_VIDEO_URL } from "./types";

interface LoganCommentProps {
  comment: string | null;
}

export default function LoganComment({ comment }: LoganCommentProps) {
  const hasComment = Boolean(comment);

  return (
    <div className="logan-comment-column">
      <div
        className={`logan-comment ${hasComment ? "is-active" : "is-idle"}`}
        aria-live="polite"
        aria-atomic="true"
      >
        <p>{comment ?? "Логан наблюдает за рюкзаком..."}</p>
      </div>

      <video
        className="logan-comment-video"
        src={LOGAN_VIDEO_URL}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
      />
    </div>
  );
}
