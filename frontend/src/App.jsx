import { useState, useCallback, useRef } from "react";
import {
  UploadCloud,
  FileStack,
  Loader2,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Download,
} from "lucide-react";

// ---------------------------------------------------------------------
// Conversion catalogue — mirrors backend/server.js CONVERTERS registry.
// Grouped the way a person actually thinks about the task, not alphabetically.
// ---------------------------------------------------------------------
const GROUPS = [
  {
    label: "Documents ⇄ PDF",
    pairs: [
      { key: "word_pdf", from: "Word", to: "PDF", accept: ".doc,.docx" },
      { key: "pdf_word", from: "PDF", to: "Word", accept: ".pdf" },
      { key: "ppt_pdf", from: "PPT", to: "PDF", accept: ".ppt,.pptx" },
      { key: "pdf_ppt", from: "PDF", to: "PPT", accept: ".pdf" },
      { key: "excel_pdf", from: "Excel", to: "PDF", accept: ".xls,.xlsx" },
      { key: "pdf_excel", from: "PDF", to: "Excel", accept: ".pdf" },
      { key: "rtf_pdf", from: "RTF", to: "PDF", accept: ".rtf" },
      { key: "txt_pdf", from: "TXT", to: "PDF", accept: ".txt" },
      { key: "pdf_txt", from: "PDF", to: "TXT", accept: ".pdf" },
      { key: "word_txt", from: "Word", to: "TXT", accept: ".doc,.docx" },
      { key: "word_html", from: "Word", to: "HTML", accept: ".doc,.docx" },
      { key: "pdf_html", from: "PDF", to: "HTML", accept: ".pdf" },
    ],
  },
  
   {
    label: "Images ⇄ PDF",
    pairs: [
      { key: "jpg_pdf", from: "JPG", to: "PDF", accept: ".jpg,.jpeg" },
      { key: "png_pdf", from: "PNG", to: "PDF", accept: ".png" },
      { key: "webp_pdf", from: "WEBP", to: "PDF", accept: ".webp" },
      { key: "pdf_jpg", from: "PDF", to: "JPG", accept: ".pdf" },
      { key: "pdf_png", from: "PDF", to: "PNG", accept: ".pdf" },
      { key: "word_jpg", from: "Word", to: "JPG", accept: ".doc,.docx" },
      { key: "word_png", from: "Word", to: "PNG", accept: ".doc,.docx" },
    ],
  },
  {
    label: "Image formats",
    pairs: [
      { key: "jpg_png", from: "JPG", to: "PNG", accept: ".jpg,.jpeg" },
      { key: "png_jpg", from: "PNG", to: "JPG", accept: ".png" },
      { key: "jpg_webp", from: "JPG", to: "WEBP", accept: ".jpg,.jpeg" },
      { key: "webp_jpg", from: "WEBP", to: "JPG", accept: ".webp" },
      { key: "png_webp", from: "PNG", to: "WEBP", accept: ".png" },
      { key: "webp_png", from: "WEBP", to: "PNG", accept: ".webp" },
      { key: "gif_jpg", from: "GIF", to: "JPG", accept: ".gif" },
      { key: "gif_png", from: "GIF", to: "PNG", accept: ".gif" },
    ],
  },
  {
    label: "Markup & Text",
    pairs: [
      { key: "html_pdf", from: "HTML", to: "PDF", accept: ".html,.htm" },
      { key: "html_word", from: "HTML", to: "Word", accept: ".html,.htm" },
      { key: "html_txt", from: "HTML", to: "TXT", accept: ".html,.htm" },
      { key: "txt_word", from: "TXT", to: "Word", accept: ".txt" },
      { key: "rtf_word", from: "RTF", to: "Word", accept: ".rtf" },
    ],
  },
  {
    label: "Spreadsheets",
    pairs: [
      { key: "csv_excel", from: "CSV", to: "Excel", accept: ".csv" },
      { key: "excel_csv", from: "Excel", to: "CSV", accept: ".xls,.xlsx" },
    ],
  },
  {
    label: "Audio",
    pairs: [
      { key: "mp3_wav", from: "MP3", to: "WAV", accept: ".mp3" },
      { key: "wav_mp3", from: "WAV", to: "MP3", accept: ".wav" },
      { key: "mp3_aac", from: "MP3", to: "AAC", accept: ".mp3" },
      { key: "aac_mp3", from: "AAC", to: "MP3", accept: ".aac" },
      { key: "m4a_mp3", from: "M4A", to: "MP3", accept: ".m4a" },
      { key: "wav_aac", from: "WAV", to: "AAC", accept: ".wav" },
    ],
  },
];

const ALL_PAIRS = GROUPS.flatMap((g) => g.pairs);

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

export default function App() {
  const [selectedKey, setSelectedKey] = useState(ALL_PAIRS[0].key);
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | working | done | error
  const [errorMsg, setErrorMsg] = useState("");
  const [resultUrl, setResultUrl] = useState(null);
  const inputRef = useRef(null);

  const selected = ALL_PAIRS.find((p) => p.key === selectedKey);

  const reset = () => {
    setFile(null);
    setStatus("idle");
    setErrorMsg("");
    setResultUrl(null);
  };

  const handleSelectPair = (key) => {
    setSelectedKey(key);
    reset();
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragActive(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      setFile(dropped);
      setStatus("idle");
      setResultUrl(null);
    }
  }, []);

  const onFilePicked = (e) => {
    const picked = e.target.files?.[0];
    if (picked) {
      setFile(picked);
      setStatus("idle");
      setResultUrl(null);
    }
  };

  const runConversion = async () => {
    if (!file || !selected) return;
    setStatus("working");
    setErrorMsg("");

    const [from, to] = selected.key.split("_");
    const form = new FormData();
    form.append("file", file);
    form.append("from", from);
    form.append("to", to);

    try {
      const res = await fetch(`${API_BASE}/api/convert`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Conversion failed (${res.status})`);
      }
      const blob = await res.blob();
      setResultUrl(URL.createObjectURL(blob));
      setStatus("done");
    } catch (err) {
      setErrorMsg(err.message || "Something went wrong");
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-[#12141c] text-[#ededf0] font-sans">
      {/* subtle grid texture backdrop */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "42px 42px",
        }}
      />

      <div className="relative max-w-5xl mx-auto px-6 py-14">
        {/* Header */}
        <header className="mb-12 flex items-start justify-between gap-6 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-[#e8a33d] font-mono text-xs tracking-[0.25em] uppercase mb-3">
              <FileStack size={14} strokeWidth={2.5} />
              File Flux
            </div>
            <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.05]">
              Convert your files,
              <br />
              <span className="text-[#8b8f9e]">without leaving a trace of hassle.</span>
            </h1>
          </div>
        </header>

        <div className="grid lg:grid-cols-[280px_1fr] gap-8">
          {/* Conversion picker */}
          <nav className="space-y-6">
            {GROUPS.map((group) => (
              <div key={group.label}>
                <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#5c6070] mb-2">
                  {group.label}
                </div>
                <div className="flex flex-col gap-1">
                  {group.pairs.map((pair) => {
                    const active = pair.key === selectedKey;
                    return (
                      <button
                        key={pair.key}
                        onClick={() => handleSelectPair(pair.key)}
                        className={`group flex items-center gap-2 rounded-md px-3 py-2 text-sm font-mono text-left transition-colors ${
                          active
                            ? "bg-[#e8a33d] text-[#12141c] font-semibold"
                            : "text-[#c3c6d1] hover:bg-[#1b1e29]"
                        }`}
                      >
                        <span>{pair.from}</span>
                        <ArrowRight
                          size={13}
                          className={active ? "opacity-80" : "opacity-40"}
                        />
                        <span>{pair.to}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Conversion ticket */}
          <div className="bg-[#1b1e29] border border-[#2a2e3d] rounded-2xl p-8">
            {/* ticket header, styled like a stamped document tag */}
            <div className="flex items-center justify-between border-b border-dashed border-[#3a3e50] pb-6 mb-6">
              <div className="font-mono text-xs uppercase tracking-[0.2em] text-[#5c6070]">
                Conversion
              </div>
              <div className="flex items-center gap-3 font-mono text-sm">
                <span className="px-2.5 py-1 rounded bg-[#12141c] border border-[#2a2e3d]">
                  .{selected.from.toLowerCase()}
                </span>
                <ArrowRight size={16} className="text-[#e8a33d]" />
                <span className="px-2.5 py-1 rounded bg-[#e8a33d]/10 border border-[#e8a33d]/40 text-[#e8a33d]">
                  .{selected.to.toLowerCase()}
                </span>
              </div>
            </div>

            {/* Dropzone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className={`cursor-pointer rounded-xl border-2 border-dashed px-6 py-14 text-center transition-colors ${
                dragActive
                  ? "border-[#e8a33d] bg-[#e8a33d]/5"
                  : "border-[#2a2e3d] hover:border-[#3a3e50]"
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                accept={selected.accept}
                className="hidden"
                onChange={onFilePicked}
              />
              <UploadCloud
                size={30}
                className="mx-auto mb-3 text-[#5c6070]"
                strokeWidth={1.5}
              />
              {file ? (
                <p className="text-sm text-[#ededf0]">
                  <span className="font-mono">{file.name}</span>
                  <span className="text-[#5c6070]"> · click to replace</span>
                </p>
              ) : (
                <p className="text-sm text-[#8b8f9e]">
                  Drop a{" "}
                  <span className="font-mono text-[#c3c6d1]">
                    {selected.accept.replaceAll(",", " / ")}
                  </span>{" "}
                  file here, or click to browse
                </p>
              )}
            </div>

            {/* Action row */}
            <div className="mt-6 flex items-center gap-4">
              <button
                onClick={runConversion}
                disabled={!file || status === "working"}
                className="flex items-center gap-2 rounded-lg bg-[#e8a33d] text-[#12141c] font-semibold px-5 py-2.5 text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#f0af4d] transition-colors"
              >
                {status === "working" ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Converting…
                  </>
                ) : (
                  <>Convert file</>
                )}
              </button>

              {status === "done" && resultUrl && (
       <a         
                  href={resultUrl}
                  download={`converted.${selected.to.toLowerCase()}`}
                  className="flex items-center gap-2 text-sm text-[#6bc9b0]"
                >
                  <CheckCircle2 size={16} />
                  Ready
                  <Download size={14} />
                </a>
              )}

              {status === "error" && (
                <span className="flex items-center gap-2 text-sm text-[#e06a6a]">
                  <XCircle size={16} />
                  {errorMsg}
                </span>
              )}
            </div>

            <p className="mt-6 text-xs text-[#5c6070] leading-relaxed">
              Files are sent to the conversion server, processed, and returned
              directly to your download — nothing is kept afterward.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}