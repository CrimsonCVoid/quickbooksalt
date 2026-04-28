"use client";

import { useState, useRef, useCallback, type DragEvent } from "react";
import { uploadLogo } from "@/lib/actions/settings";

export function LogoUploader({ initialUrl }: { initialUrl: string | null }) {
  const [logoUrl, setLogoUrl] = useState<string | null>(initialUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Please drop an image file (PNG, JPG, SVG, or WebP).");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError(`Logo must be under 2MB — that file is ${(file.size / 1024 / 1024).toFixed(1)}MB.`);
      return;
    }
    const fd = new FormData();
    fd.append("logo", file);
    setUploading(true);
    const res = await uploadLogo(fd);
    setUploading(false);
    if (res?.error) {
      setError(res.error);
      return;
    }
    setLogoUrl(res?.url ?? null);
  }, []);

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) void handleFile(file);
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
  };

  return (
    <div className="card space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="display text-2xl">Logo</h2>
        {logoUrl && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-xs font-semibold text-fm-muted hover:text-fm-ink"
          >
            Replace
          </button>
        )}
      </div>

      <div
        role="button"
        tabIndex={0}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && fileInputRef.current?.click()}
        className={`relative cursor-pointer select-none rounded-xl border-2 border-dashed p-8 text-center outline-none transition ${
          dragOver
            ? "border-fm-ink bg-fm-yellow/40"
            : "border-fm-line bg-fm-paper hover:border-fm-ink/40 hover:bg-white"
        } ${uploading ? "opacity-60 pointer-events-none" : ""}`}
      >
        {logoUrl ? (
          <div className="space-y-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl}
              alt="Logo"
              className="mx-auto"
              style={{ maxHeight: 96, maxWidth: "60%", objectFit: "contain" }}
            />
            <p className="text-xs text-fm-muted">
              {uploading ? "Uploading…" : "Drop a new image to replace · or click to browse"}
            </p>
          </div>
        ) : (
          <div>
            <UploadIcon />
            <p className="font-semibold mt-3">{uploading ? "Uploading…" : "Drag your logo here"}</p>
            <p className="text-xs text-fm-muted mt-1">PNG, JPG, SVG, or WebP · max 2MB</p>
            <p className="text-xs text-fm-muted">or click to browse</p>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = ""; // allow re-picking the same file
        }}
      />

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-900">
          {error}
        </div>
      )}
    </div>
  );
}

function UploadIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="mx-auto size-10 text-fm-muted"
    >
      <path d="M3 16.5V18a3 3 0 003 3h12a3 3 0 003-3v-1.5" strokeLinecap="round" />
      <path d="M12 14V3M8 7l4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
