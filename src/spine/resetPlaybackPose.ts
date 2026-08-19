export interface PlaybackSkeleton {
  setToSetupPose: () => void;
  updateWorldTransform: (physics?: unknown) => void;
}

export function updateSkeletonWorldTransform(skeleton: PlaybackSkeleton) {
  const physics = (globalThis as { spine?: { Physics?: { update?: unknown } } }).spine?.Physics?.update;
  if (skeleton.updateWorldTransform.length > 0) skeleton.updateWorldTransform(physics);
  else skeleton.updateWorldTransform();
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
  updateSkeletonWorldTransform(skeleton);
}
