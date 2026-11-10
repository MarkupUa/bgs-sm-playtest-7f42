# Preview recording

`npm run capture:preview` uses the running localhost development game, with no debug overlay and the real normal-speed trace animation. It loads the authored third street, waits briefly, sends RED, BLUE and GREEN through real buttons, then holds on the win. No synthetic game states, fast animation mode, fake traffic or external footage. Generated MP4s contain no audio track. The development harness is used solely to select a representative level; the same simulation/renderer are in production.

Output: landscape 1920×1080 and portrait 1080×1620 (2:3), 18 seconds, H.264/yuv420p, under 50 MB. The final encoding starts with a brief still of the matching original cover, then cuts into normal-speed actual gameplay. The cover is resized to the exact video aspect; no black bars, promotional overlay, editor chrome or pointer image is recorded.

Storyboard: 0.0–0.35s cover; early segment RED chooses old L and leaves R; middle BLUE chooses R then old L and leaves R; late GREEN chooses R/R then leaves L/L; end holds the genuine delivery completion. Minor timings depend on browser frame scheduling, not gameplay speed adjustment.

Re-record after changing UI, colours, art, simulation or animation timing. Validate duration/dimensions/silence using ffprobe and inspect a contact sheet plus playback before submitting. The presence of a playable MP4 alone does not establish platform editorial approval.
