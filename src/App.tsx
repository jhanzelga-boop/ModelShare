import React, { useState, useEffect, useRef } from 'react';
import { Upload, Download, File, CheckCircle, AlertCircle, Loader2, Copy, Sun, Moon } from 'lucide-react';
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
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved as 'light' | 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

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
    <div className="min-h-screen bg-white dark:bg-[#050505] text-[#1a1a1a] dark:text-[#f0f0f0] font-mono p-4 md:p-8 transition-colors duration-300 selection:bg-black dark:selection:bg-white selection:text-white dark:selection:text-black">
      <div className="max-w-5xl mx-auto border border-neutral-200 dark:border-neutral-800 min-h-[calc(100vh-4rem)] flex flex-col">
        {/* Top Bar */}
        <div className="border-bottom border-neutral-200 dark:border-neutral-800 p-4 flex justify-between items-center bg-neutral-50 dark:bg-neutral-900/50">
          <div className="flex items-center gap-4">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="ml-4 text-xs font-bold tracking-widest uppercase opacity-50">Vault v1.0.4</span>
          </div>
          <button
            onClick={toggleTheme}
            className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors rounded"
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>
        </div>

        <div className="flex-1 p-6 md:p-12">
          {/* Header */}
          <header className="mb-12">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-4xl font-bold tracking-tighter mb-2 uppercase">My Private Vault</h1>
              <div className="h-1 w-24 bg-black dark:bg-white mb-4" />
              <p className="text-neutral-500 dark:text-neutral-400 text-sm max-w-md leading-relaxed">
                Secure, local-first file storage and distribution system.
                Authoritative data store initialized.
              </p>
            </motion.div>
          </header>

          {/* Main Content Grid */}
          <div className="grid md:grid-cols-[1fr_350px] gap-12">
            {/* Left Column: Files */}
            <section>
              <div className="flex items-center justify-between mb-6 border-b border-neutral-200 dark:border-neutral-800 pb-2">
                <h2 className="text-xs font-bold uppercase tracking-widest opacity-50">Stored Assets</h2>
                <span className="text-[10px] font-mono">{files.length} ITEMS</span>
              </div>

              <div className="space-y-2">
                <AnimatePresence initial={false}>
                  {files.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="py-12 border border-dashed border-neutral-200 dark:border-neutral-800 flex flex-col items-center justify-center grayscale opacity-50"
                    >
                      <File size={32} className="mb-4" />
                      <p className="text-xs uppercase tracking-tighter">Vault Empty</p>
                    </motion.div>
                  ) : (
                    files.map((file) => (
                      <motion.div
                        layout
                        key={file.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="group flex items-center gap-4 p-3 border border-neutral-100 dark:border-neutral-900 hover:border-black dark:hover:border-white transition-all cursor-default"
                      >
                        <div className="w-10 h-10 flex items-center justify-center bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 group-hover:bg-black group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-black transition-colors">
                          <File size={18} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-bold truncate uppercase">{file.original_name}</h3>
                          <div className="flex items-center gap-2 text-[10px] opacity-50">
                            <span>{formatSize(file.size)}</span>
                            <span>/</span>
                            <span>{new Date(file.upload_date).toISOString().split('T')[0]}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => copyLink(file.id)}
                            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                            title="Copy Link"
                          >
                            <Copy size={14} />
                          </button>
                          <a
                            href={`/api/download/${file.id}`}
                            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                            title="Download"
                          >
                            <Download size={14} />
                          </a>
                        </div>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </section>

            {/* Right Column: Upload & Status */}
            <aside className="space-y-8">
              <div className="border border-neutral-200 dark:border-neutral-800 p-6 bg-neutral-50 dark:bg-neutral-900/30">
                <h2 className="text-xs font-bold uppercase tracking-widest mb-4 opacity-50">Ingest</h2>
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => !uploading && fileInputRef.current?.click()}
                  className={cn(
                    "border-2 border-dashed p-8 flex flex-col items-center justify-center transition-all duration-200 cursor-pointer",
                    dragActive ? "border-black dark:border-white bg-black/5 dark:bg-white/5" : "border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600",
                    uploading && "opacity-50 cursor-wait"
                  )}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                  />
                  {uploading ? (
                    <Loader2 className="w-6 h-6 animate-spin mb-2" />
                  ) : (
                    <Upload className="w-6 h-6 mb-2" />
                  )}
                  <span className="text-[10px] font-bold uppercase tracking-tighter">
                    {uploading ? "Processing..." : "Drop File"}
                  </span>
                </div>

                <div className="mt-4 space-y-2">
                  <AnimatePresence mode="wait">
                    {error && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-[10px] text-red-500 font-bold uppercase flex items-center gap-2"
                      >
                        <AlertCircle size={12} /> {error}
                      </motion.div>
                    )}
                    {success && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-[10px] text-green-500 font-bold uppercase flex items-center gap-2"
                      >
                        <CheckCircle size={12} /> {success}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="border border-neutral-200 dark:border-neutral-800 p-6">
                <h2 className="text-xs font-bold uppercase tracking-widest mb-4 opacity-50">System Status</h2>
                <div className="space-y-3">
                  <div className="flex justify-between text-[10px]">
                    <span className="opacity-50 uppercase">Database</span>
                    <span className="text-green-500 font-bold uppercase">Online</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="opacity-50 uppercase">Storage</span>
                    <span className="font-bold uppercase">50MB Limit</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="opacity-50 uppercase">Network</span>
                    <span className="text-green-500 font-bold uppercase">Connected</span>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-neutral-200 dark:border-neutral-800 p-6 bg-neutral-50 dark:bg-neutral-900/50 flex justify-between items-center">
          <div className="text-[10px] font-bold uppercase tracking-widest opacity-30">
            &copy; {new Date().getFullYear()} My Private Vault
          </div>
          <div className="text-[10px] font-bold uppercase tracking-widest opacity-50">
            Handcrafted with precision
          </div>
        </footer>
      </div>
    </div>
  );
}
