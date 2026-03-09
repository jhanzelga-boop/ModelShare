import React, { useState, useEffect, useRef } from 'react';
import { Upload, Download, File, CheckCircle, AlertCircle, Loader2, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface FileData {
  id: string;
  original_name: string;
  filename: string;
  mime_type: string;
  size: number;
  upload_date: string;
}

export default function App() {
  const [files, setFiles] = useState<FileData[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = async () => {
    try {
      const response = await fetch('/api/files');
      const data = await response.json();
      setFiles(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch files:', err);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async (file: File) => {
    if (!file) return;
    
    setUploading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Upload failed');
      }

      const result = await response.json();
      setSuccess(`Successfully uploaded ${result.originalName}`);
      fetchFiles();
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to upload file. Please try again.');
      console.error(err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const copyLink = (id: string) => {
    const url = `${window.location.origin}/api/download/${id}`;
    navigator.clipboard.writeText(url);
    setSuccess('Download link copied to clipboard!');
    setTimeout(() => setSuccess(null), 3000);
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#1a1a1a] font-sans p-6 md:p-12 selection:bg-black selection:text-white">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <h1 className="text-6xl font-light tracking-tighter mb-4">ModelShare</h1>
            <p className="text-neutral-500 text-xl font-light max-w-lg leading-relaxed">
              A minimal platform for uploading and sharing files with instant download links.
            </p>
          </motion.div>
        </header>

        {/* Upload Section */}
        <section className="mb-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => !uploading && fileInputRef.current?.click()}
            className={cn(
              "relative border border-dashed rounded-[2rem] p-16 flex flex-col items-center justify-center transition-all duration-300 cursor-pointer group",
              dragActive ? "border-black bg-black/5 scale-[1.02]" : "border-neutral-200 hover:border-neutral-400 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]",
              uploading && "opacity-50 cursor-not-allowed"
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
            />
            
            <div className="mb-6 p-5 rounded-3xl bg-neutral-50 group-hover:bg-neutral-100 transition-colors">
              {uploading ? (
                <Loader2 className="w-10 h-10 animate-spin text-neutral-400" />
              ) : (
                <Upload className="w-10 h-10 text-neutral-600" />
              )}
            </div>
            
            <div className="text-center">
              <p className="text-2xl font-medium mb-2">
                {uploading ? "Uploading..." : "Click or drag to upload"}
              </p>
              <p className="text-neutral-400 font-light">
                Support for any file type up to 50MB
              </p>
            </div>
          </motion.div>

          {/* Messages */}
          <div className="h-16 mt-4 relative">
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute inset-0 p-4 rounded-2xl bg-red-50 text-red-600 flex items-center gap-3 border border-red-100"
                >
                  <AlertCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">{error}</span>
                </motion.div>
              )}
              {success && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute inset-0 p-4 rounded-2xl bg-green-50 text-green-600 flex items-center gap-3 border border-green-100"
                >
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">{success}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* Files List */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-medium tracking-tight">Recent Uploads</h2>
            <div className="px-4 py-1 rounded-full bg-neutral-100 text-neutral-500 text-sm font-medium">
              {files.length} {files.length === 1 ? 'file' : 'files'}
            </div>
          </div>

          <div className="grid gap-4">
            <AnimatePresence initial={false}>
              {files.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-24 bg-white rounded-[2rem] border border-neutral-100 shadow-sm"
                >
                  <File className="w-16 h-16 mx-auto mb-6 text-neutral-200" />
                  <p className="text-neutral-400 text-lg font-light">No files uploaded yet.</p>
                </motion.div>
              ) : (
                files.map((file) => (
                  <motion.div
                    layout
                    key={file.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white p-5 rounded-3xl border border-neutral-100 shadow-sm flex items-center gap-5 group hover:shadow-md hover:border-neutral-200 transition-all duration-300"
                  >
                    <div className="p-4 rounded-2xl bg-neutral-50 group-hover:bg-neutral-100 transition-colors">
                      <File className="w-7 h-7 text-neutral-600" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-medium truncate mb-1">{file.original_name}</h3>
                      <div className="flex items-center gap-3 text-sm text-neutral-400 font-light">
                        <span>{formatSize(file.size)}</span>
                        <span className="w-1 h-1 rounded-full bg-neutral-200" />
                        <span>{new Date(file.upload_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => copyLink(file.id)}
                        className="p-3 rounded-xl hover:bg-neutral-50 text-neutral-400 hover:text-neutral-900 transition-all"
                        title="Copy download link"
                      >
                        <Copy className="w-6 h-6" />
                      </button>
                      <a
                        href={`/api/download/${file.id}`}
                        className="p-3 rounded-xl bg-black text-white hover:bg-neutral-800 transition-all shadow-lg shadow-black/5"
                        title="Download"
                      >
                        <Download className="w-6 h-6" />
                      </a>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </section>
      </div>
    </div>
  );
}
