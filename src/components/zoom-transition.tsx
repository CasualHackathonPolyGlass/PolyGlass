
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface ZoomTransitionProps {
  isActive: boolean;
  onComplete?: () => void;
}

export default function ZoomTransition({ isActive, onComplete }: ZoomTransitionProps) {
  const [showAnimation, setShowAnimation] = useState(false);

  useEffect(() => {
    if (isActive) {
      setShowAnimation(true);
      // Complete after animation
      const timer = setTimeout(() => {
        onComplete?.();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isActive, onComplete]);

  return (
    <AnimatePresence>
      {showAnimation && (
        <motion.div
          className="fixed inset-0 z-[200] bg-black flex items-center justify-center"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ 
            scale: [0, 1, 15], 
            opacity: [0, 1, 1] 
          }}
          transition={{ 
            duration: 1, 
            times: [0, 0.3, 1],
            ease: [0.22, 1, 0.36, 1] 
          }}
        >
          {/* Center point */}
          <motion.div
            className="w-4 h-4 bg-white rounded-full"
            initial={{ scale: 1 }}
            animate={{ scale: [1, 0] }}
            transition={{ duration: 0.8, delay: 0.2 }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
