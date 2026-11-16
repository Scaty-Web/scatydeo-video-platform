import { AudioBufferSource, BufferTarget, CanvasSource, Mp4OutputFormat, Output, getFirstEncodableAudioCodec, getFirstEncodableVideoCodec } from "mediabunny";

export type NarrationClip = { start: number; buf: AudioBuffer };
export function narrationTimeline(clips: { start: number; duration: number }[]) {
  let end = 0;
  return clips.map((clip) => {
    const start = Math.max(end, Math.max(0, clip.start));
    end = start + clip.duration;
    return { start, duration: clip.duration };
  });
}

// H.264/AAC first for widest playback; VP9/AV1/Opus keep MP4 export working in browsers without proprietary encoders.
export async function checkMp4Support(hasAudio: boolean) {
  const video = await getFirstEncodableVideoCodec(["avc", "vp9", "av1"], { width: 1280, height: 720 });
  const audio = hasAudio ? await getFirstEncodableAudioCodec(["aac", "opus"]) : null;
  if (!video || (hasAudio && !audio)) {
    throw new Error("Bu tarayıcı MP4 oluşturmayı desteklemiyor. Güncel Chrome, Edge veya Safari ile tekrar dene.");
  }
  return { video, audio };
}

export async function encodeStudioMp4(canvas: HTMLCanvasElement, duration: number, clips: NarrationClip[], drawFrame: (time: number) => Promise<void>, onProgress: (percent: number) => void, signal: AbortSignal) {
  const codecs = await checkMp4Support(clips.length > 0);
  const target = new BufferTarget();
  const output = new Output({ format: new Mp4OutputFormat({ fastStart: "in-memory" }), target });
  const video = new CanvasSource(canvas, { codec: codecs.video, bitrate: 3_000_000 });
  output.addVideoTrack(video, { frameRate: 30 });
  const audio = clips.length ? new AudioBufferSource({ codec: codecs.audio!, bitrate: 128_000 }) : null;
  if (audio) output.addAudioTrack(audio);
  try {
    await output.start();
    if (audio) {
      // Offline mixing never connects narration to speakers while packaging the video.
      const mix = new OfflineAudioContext(2, Math.ceil(duration * 48000), 48000);
      for (const clip of clips) {
        const source = mix.createBufferSource(); source.buffer = clip.buf;
        source.connect(mix.destination); source.start(clip.start);
      }
      await audio.add(await mix.startRendering()); audio.close();
    }
    const count = Math.ceil(duration * 30);
    for (let frame = 0; frame < count; frame++) {
      signal.throwIfAborted();
      await drawFrame(frame / 30);
      await video.add(frame / 30, Math.min(1 / 30, duration - frame / 30));
      onProgress(Math.round((frame + 1) / count * 100));
    }
    video.close(); await output.finalize();
    if (!target.buffer) throw new Error("Video dosyası oluşturulamadı.");
    return new Blob([target.buffer], { type: "video/mp4" });
  } catch (error) {
    if (output.state !== "finalized" && output.state !== "canceled") await output.cancel();
    throw error;
  }
}