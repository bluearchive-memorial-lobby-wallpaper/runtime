export interface PlaybackSkeleton {
  setToSetupPose: () => void;
  updateWorldTransform: () => void;
}

export interface PlaybackAnimationState<TSkeleton extends PlaybackSkeleton> {
  clearTracks: () => void;
  apply: (skeleton: TSkeleton) => unknown;
}

export function resetAndApplyPlaybackPose<TSkeleton extends PlaybackSkeleton>(
  skeleton: TSkeleton,
  state: PlaybackAnimationState<TSkeleton>,
  configureTracks: () => void,
) {
  state.clearTracks();
  skeleton.setToSetupPose();
  configureTracks();
  state.apply(skeleton);
  skeleton.updateWorldTransform();
}
