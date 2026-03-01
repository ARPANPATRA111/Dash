import { motion } from 'framer-motion';

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = 'Loading...' }: LoadingScreenProps) {
  return (
    <div className="min-h-screen bg-void flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-6"
      >
        <motion.div
          animate={{ 
            scale: [1, 1.05, 1],
            opacity: [0.8, 1, 0.8]
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity,
            ease: 'easeInOut'
          }}
          className="relative"
        >
          <div className="w-20 h-20 rounded-[1.5rem] bg-gradient-to-br from-plasma to-plasma/60 flex items-center justify-center shadow-glow">
            <span className="text-3xl font-heading font-bold text-white">D</span>
          </div>
          <div className="absolute inset-0 rounded-[1.5rem] bg-plasma/20 blur-xl -z-10" />
        </motion.div>
        
        <div className="relative w-12 h-12">
          <motion.div
            className="absolute inset-0 border-2 border-plasma/30 rounded-full"
          />
          <motion.div
            className="absolute inset-0 border-2 border-transparent border-t-plasma rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
        </div>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-ghost/70 text-sm font-medium"
        >
          {message}
        </motion.p>
      </motion.div>
    </div>
  );
}
