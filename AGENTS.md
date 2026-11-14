# Project rules
- Use the shared comment-thread helper to display every descendant under its root while preserving the actual parent ID, so replies to replies remain visible without unbounded indentation.
- Use ReplyComposer for video and news replies so text and GIF submissions share the same target and pending state.
- Encode AI Studio exports as deterministic MP4 frames with offline audio mixing; this prevents packaging playback and keeps narration in the downloaded video.
- Run Gemini through the server-only AI Gateway SDK and ElevenLabs TTS through the linked server credential; this keeps private keys out of the browser.