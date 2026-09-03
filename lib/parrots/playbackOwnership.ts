type PlaybackActions = {
  stopMain: () => void;
  startMain: () => void;
  stopPreview: () => void;
  startPreview: (onEnded: () => void) => void;
  onPreviewStateChange: (isPlaying: boolean) => void;
};

type PreviewStopActions = Pick<PlaybackActions, "stopPreview" | "onPreviewStateChange">;

export function createParrotPlaybackOwnership() {
  let isPreviewPlaying = false;

  const stopPreview = (actions: PreviewStopActions) => {
    if (!isPreviewPlaying) return;
    isPreviewPlaying = false;
    actions.stopPreview();
    actions.onPreviewStateChange(false);
  };

  return {
    togglePreview(actions: PlaybackActions) {
      if (isPreviewPlaying) {
        stopPreview(actions);
        return;
      }
      actions.stopMain();
      isPreviewPlaying = true;
      actions.onPreviewStateChange(true);
      actions.startPreview(() => {
        if (!isPreviewPlaying) return;
        isPreviewPlaying = false;
        actions.onPreviewStateChange(false);
      });
    },
    toggleMain(isMainPlaying: boolean, actions: PlaybackActions) {
      stopPreview(actions);
      if (isMainPlaying) actions.stopMain();
      else actions.startMain();
    },
    stopPreview,
    cleanup(actions: PreviewStopActions) {
      stopPreview(actions);
    },
  };
}
