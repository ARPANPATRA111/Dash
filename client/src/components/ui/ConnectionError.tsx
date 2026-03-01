import { motion } from 'framer-motion';
import { AlertCircle, RefreshCw, WifiOff } from 'lucide-react';
import { connectToSpacetimeDB } from '@/lib/spacetimedb';
import { useChatStore } from '@/stores';
import { useState } from 'react';

interface ConnectionErrorProps {
  error: string;
}

export function ConnectionError({ error }: ConnectionErrorProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  
  const handleRetry = async () => {
    setIsRetrying(true);
    useChatStore.getState().setConnectionError(null);
    
    try {
      await connectToSpacetimeDB();
    } catch (err) {
      console.error('Retry failed:', err);
    } finally {
      setIsRetrying(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-void flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <div className="card p-8">
          <div className="flex justify-center mb-6">
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity,
                ease: 'easeInOut'
              }}
              className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center"
            >
              <WifiOff className="w-10 h-10 text-red-400" />
            </motion.div>
          </div>
          
          <h1 className="text-2xl font-heading font-bold text-ghost text-center mb-2">
            Connection Failed
          </h1>
          
          <p className="text-ghost/60 text-center mb-6">
            Unable to connect to the Dash server. Please check your connection and try again.
          </p>
          
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-400 mb-1">Error Details</p>
                <p className="text-xs text-red-400/70 font-mono break-all">{error}</p>
              </div>
            </div>
          </div>
          
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {isRetrying ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <RefreshCw className="w-5 h-5" />
                </motion.div>
                <span>Retrying...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-5 h-5" />
                <span>Try Again</span>
              </>
            )}
          </button>
          
          <div className="mt-6 pt-6 border-t border-ghost/10">
            <p className="text-xs text-ghost/40 text-center">
              Make sure the SpacetimeDB server is running at the configured address.
              Check the console for more details.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
