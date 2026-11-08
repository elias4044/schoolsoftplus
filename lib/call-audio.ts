export async function replaceMicrophoneTrack(
  peers: RTCPeerConnection[],
  nextTrack: MediaStreamTrack,
  previousTrack: MediaStreamTrack | null
) {
  const senders = peers
    .flatMap((peer) => peer.getSenders())
    .filter((sender) => sender.track?.kind === 'audio');
  const results = await Promise.allSettled(senders.map((sender) => sender.replaceTrack(nextTrack)));
  if (results.some((result) => result.status === 'rejected')) {
    await Promise.allSettled(
      senders.map((sender, index) =>
        results[index].status === 'fulfilled'
          ? sender.replaceTrack(previousTrack)
          : Promise.resolve()
      )
    );
    throw new Error(
      'The microphone could not be changed. Your previous microphone is still selected.'
    );
  }
}

export function getPlaybackVolume(volume: number, deafened: boolean) {
  return deafened ? 0 : Math.max(0, Math.min(1, volume));
}

export function microphoneError(error: unknown) {
  if (!(error instanceof Error)) return 'Could not access the microphone.';
  if (error.name === 'NotAllowedError')
    return 'Microphone access was denied. Allow microphone access in your browser and try again.';
  if (error.name === 'NotFoundError') return 'No microphone was found. Connect one and try again.';
  if (error.name === 'NotReadableError')
    return 'The microphone is unavailable. Check whether another application is using it.';
  return error.message;
}
