import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  File,
  Image as ImageIcon,
  Video,
  Music,
  X,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  accept?: string;
  className?: string;
}

const MAX_FILE_SIZE_MB = 50;

const getFileIcon = (type: string) => {
  if (type.startsWith('image/')) return ImageIcon;
  if (type.startsWith('video/')) return Video;
  if (type.startsWith('audio/')) return Music;
  return File;
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function FileUpload({
  onFilesSelected,
  maxFiles = 5,
  maxSizeMB = MAX_FILE_SIZE_MB,
  accept,
  className,
}: FileUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const validateFiles = useCallback((files: File[]) => {
    const errors: string[] = [];
    const validFiles: File[] = [];
    
    for (const file of files) {
      if (file.size > maxSizeMB * 1024 * 1024) {
        errors.push(`${file.name} exceeds ${maxSizeMB}MB limit`);
        continue;
      }
      
      if (validFiles.length >= maxFiles) {
        errors.push(`Maximum ${maxFiles} files allowed`);
        break;
      }
      
      validFiles.push(file);
    }
    
    if (errors.length > 0) {
      setError(errors[0]);
    } else {
      setError(null);
    }
    
    return validFiles;
  }, [maxFiles, maxSizeMB]);
  
  const handleFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles = validateFiles(fileArray);
    setSelectedFiles(validFiles);
    
    if (validFiles.length > 0) {
      onFilesSelected(validFiles);
    }
  }, [validateFiles, onFilesSelected]);
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);
  
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);
  
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);
  
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);
  
  const removeFile = useCallback((index: number) => {
    setSelectedFiles((prev) => {
      const newFiles = prev.filter((_, i) => i !== index);
      onFilesSelected(newFiles);
      return newFiles;
    });
    setError(null);
  }, [onFilesSelected]);
  
  const clearAll = useCallback(() => {
    setSelectedFiles([]);
    setError(null);
    onFilesSelected([]);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, [onFilesSelected]);
  
  return (
    <div className={cn('space-y-3', className)}>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'relative border-2 border-dashed rounded-2xl p-6 cursor-pointer transition-colors',
          isDragging
            ? 'border-plasma bg-plasma/10'
            : 'border-ghost/20 hover:border-ghost/40 hover:bg-ghost/5'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          onChange={handleInputChange}
          accept={accept}
          multiple={maxFiles > 1}
          className="hidden"
        />
        
        <div className="flex flex-col items-center gap-3">
          <div className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center transition-colors',
            isDragging ? 'bg-plasma/20' : 'bg-ghost/10'
          )}>
            <Upload className={cn(
              'w-6 h-6 transition-colors',
              isDragging ? 'text-plasma' : 'text-ghost/60'
            )} />
          </div>
          
          <div className="text-center">
            <p className="text-sm text-ghost">
              <span className="text-plasma font-medium">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-ghost/50 mt-1">
              Max {maxFiles} files, up to {maxSizeMB}MB each
            </p>
          </div>
        </div>
      </div>
      
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl"
          >
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span className="text-sm text-red-400">{error}</span>
          </motion.div>
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {selectedFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-ghost/60">
                {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  clearAll();
                }}
                className="text-xs text-ghost/50 hover:text-ghost/70"
              >
                Clear all
              </button>
            </div>
            
            {selectedFiles.map((file, index) => {
              const Icon = getFileIcon(file.type);
              
              return (
                <motion.div
                  key={`${file.name}-${index}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="flex items-center gap-3 p-3 bg-ghost/5 rounded-xl"
                >
                  <div className="w-10 h-10 rounded-lg bg-ghost/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-ghost/60" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-ghost truncate">{file.name}</p>
                    <p className="text-xs text-ghost/50">{formatFileSize(file.size)}</p>
                  </div>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(index);
                    }}
                    className="p-1.5 hover:bg-ghost/10 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 text-ghost/60" />
                  </button>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
