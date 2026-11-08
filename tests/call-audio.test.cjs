/* eslint-disable @typescript-eslint/no-require-imports -- Isolated TypeScript loader with mocked browser media APIs. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

function load(path, imports = {}, globals = {}) {
  const loadedModule = { exports: {} };
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(path, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    {
      module: loadedModule,
      exports: loadedModule.exports,
      Error,
      DOMException,
      console,
      ...globals,
      require: (name) => imports[name],
    }
  );
  return loadedModule.exports;
}
const helpers = load('lib/call-audio.ts');

function mediaStream(enabled = true) {
  const track = {
    kind: 'audio',
    enabled,
    stopped: false,
    stop() {
      this.stopped = true;
    },
  };
  return { track, getTracks: () => [track], getAudioTracks: () => [track] };
}

function audioHarness({
  stream = null,
  peers = [],
  elements = [],
  getUserMedia = async () => mediaStream(),
} = {}) {
  const slots = [];
  let index = 0;
  const react = {
    useState(initial) {
      const slot = index++;
      if (!(slot in slots)) slots[slot] = initial;
      return [
        slots[slot],
        (value) => {
          slots[slot] = typeof value === 'function' ? value(slots[slot]) : value;
        },
      ];
    },
    useRef(initial) {
      const slot = index++;
      return (slots[slot] ??= { current: initial });
    },
    useEffect() {},
    useCallback: (callback) => callback,
  };
  const api = load(
    'lib/useCallAudio.ts',
    { react, './call-audio': helpers },
    {
      navigator: { mediaDevices: { getUserMedia, enumerateDevices: async () => [] } },
    }
  );
  const streamRef = { current: stream };
  return {
    streamRef,
    render() {
      index = 0;
      return api.useCallAudio(
        streamRef,
        () => peers,
        () => elements
      );
    },
  };
}

test('microphone replacement reaches every audio sender and leaves video alone', async () => {
  const old = { kind: 'audio' };
  const next = { kind: 'audio' };
  const sender = () => ({
    track: old,
    async replaceTrack(track) {
      this.track = track;
    },
  });
  const first = sender();
  const second = sender();
  const video = {
    track: { kind: 'video' },
    replaceTrack() {
      throw new Error('Video must not change');
    },
  };
  await helpers.replaceMicrophoneTrack(
    [{ getSenders: () => [first, video] }, { getSenders: () => [second] }],
    next,
    old
  );
  assert.equal(first.track, next);
  assert.equal(second.track, next);
});

test('failed microphone replacement restores peers that already switched', async () => {
  const old = { kind: 'audio' };
  const next = { kind: 'audio' };
  const first = {
    track: old,
    async replaceTrack(track) {
      this.track = track;
    },
  };
  const second = {
    track: old,
    async replaceTrack() {
      throw new Error('Unavailable');
    },
  };
  await assert.rejects(
    helpers.replaceMicrophoneTrack([{ getSenders: () => [first, second] }], next, old),
    /previous microphone/
  );
  assert.equal(first.track, old);
  assert.equal(second.track, old);
});

test('cancelling microphone permission stops a late stream instead of reviving the call', async () => {
  let resolve;
  const lateStream = mediaStream();
  const harness = audioHarness({
    getUserMedia: () =>
      new Promise((done) => {
        resolve = done;
      }),
  });
  const controls = harness.render();
  const pending = controls.requestMicrophone();
  controls.releaseMicrophone();
  resolve(lateStream);
  await assert.rejects(pending, { name: 'AbortError' });
  assert.equal(lateStream.track.stopped, true);
  assert.equal(harness.streamRef.current, null);
});

test('switching microphones preserves mute and stops the old capture after replacement', async () => {
  const old = mediaStream(false);
  const next = mediaStream();
  const sender = {
    track: old.track,
    async replaceTrack(track) {
      this.track = track;
    },
  };
  const harness = audioHarness({
    stream: old,
    peers: [{ getSenders: () => [sender] }],
    getUserMedia: async () => next,
  });
  await harness.render().setInputDevice('usb');
  assert.equal(next.track.enabled, false);
  assert.equal(sender.track, next.track);
  assert.equal(old.track.stopped, true);
  assert.equal(harness.streamRef.current, next);
  assert.equal(harness.render().inputDeviceId, 'usb');
});

test('deafen restores volume without unmuting individually muted participants', () => {
  const element = { volume: 1, muted: true };
  const harness = audioHarness({ elements: [element] });
  const controls = harness.render();
  controls.setVolume(0.4);
  controls.toggleDeafen();
  assert.equal(element.volume, 0);
  controls.toggleDeafen();
  assert.equal(element.volume, 0.4);
  assert.equal(element.muted, true);
});

test('blocked playback can be resumed through a user action', async () => {
  let blocked = true;
  const element = {
    srcObject: {},
    volume: 1,
    async play() {
      if (blocked) throw new Error('Blocked');
    },
  };
  const harness = audioHarness({ elements: [element] });
  await harness.render().playRemoteAudio(element);
  assert.equal(harness.render().playbackBlocked, true);
  blocked = false;
  await harness.render().resumeAudio();
  assert.equal(harness.render().playbackBlocked, false);
});

test('microphone capture requests voice processing and reports useful permission errors', async () => {
  let requested;
  const harness = audioHarness({
    getUserMedia: async (constraints) => {
      requested = constraints;
      return mediaStream();
    },
  });
  await harness.render().requestMicrophone();
  assert.equal(requested.audio.echoCancellation, true);
  assert.equal(requested.audio.noiseSuppression, true);
  const error = new Error('Permission denied');
  error.name = 'NotAllowedError';
  assert.match(helpers.microphoneError(error), /Allow microphone access/);
});
