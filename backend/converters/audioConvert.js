// Handles every audio conversion via ffmpeg (through fluent-ffmpeg).
// Requires ffmpeg to be installed on the host machine (see README).

const ffmpeg = require("fluent-ffmpeg");

// Explicit codec per target format — letting ffmpeg guess from the
// container alone is unreliable for aac/wav in particular.
const CODEC_FOR = {
  mp3: "libmp3lame",
  wav: "pcm_s16le",
  aac: "aac",
};

/**
 * Convert an audio file on disk to a target format using ffmpeg.
 * @param {string} inputPath  - path to the source file
 * @param {string} outputPath - path to write the converted file
 * @param {string} toExt      - target extension WITHOUT the dot, e.g. "mp3"
 */
function convertAudio(inputPath, outputPath, toExt) {
  return new Promise((resolve, reject) => {
    let cmd = ffmpeg(inputPath).format(toExt === "aac" ? "adts" : toExt);

    const codec = CODEC_FOR[toExt];
    if (codec) cmd = cmd.audioCodec(codec);

    cmd
      .on("error", (err) => reject(err))
      .on("end", () => resolve(outputPath))
      .save(outputPath);
  });
}

module.exports = { convertAudio };