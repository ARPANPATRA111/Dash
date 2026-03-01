import { forwardRef } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'glass';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children?: React.ReactNode;
}

const variantStyles = {
  primary: 'bg-gradient-to-r from-plasma to-purple-500 text-white shadow-lg shadow-plasma/25 hover:shadow-xl hover:shadow-plasma/40',
  secondary: 'bg-white/80 dark:bg-void-100/80 text-graphite dark:text-ghost border-2 border-ghost-400/50 dark:border-void-100/50 backdrop-blur-sm shadow-sm hover:border-plasma/50 hover:shadow-md',
  ghost: 'bg-transparent text-graphite dark:text-ghost hover:bg-ghost-400/30 dark:hover:bg-void-100/30 border border-transparent hover:border-ghost-400/50 dark:hover:border-void-100/50',
  danger: 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/40',
  glass: 'bg-white/10 dark:bg-white/5 backdrop-blur-md border border-white/20 dark:border-white/10 text-graphite dark:text-ghost shadow-lg hover:bg-white/20 dark:hover:bg-white/10 hover:shadow-xl',
};

const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-5 py-2.5 text-sm rounded-xl',
  lg: 'px-7 py-3.5 text-base rounded-xl',
  icon: 'p-2.5 rounded-xl aspect-square',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: disabled || isLoading ? 1 : 1.02 }}
        whileTap={{ scale: disabled || isLoading ? 1 : 0.97 }}
        className={cn(
          'relative inline-flex items-center justify-center gap-2 font-semibold',
          'transition-all duration-300 ease-out',
          'focus:outline-none focus:ring-2 focus:ring-plasma/50 focus:ring-offset-2 focus:ring-offset-background',
          'select-none overflow-hidden',
          variantStyles[variant],
          sizeStyles[size],
          (disabled || isLoading) && 'opacity-50 cursor-not-allowed pointer-events-none',
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : leftIcon ? (
          <span className="flex-shrink-0">{leftIcon}</span>
        ) : null}
        {children}
        {!isLoading && rightIcon && (
          <span className="flex-shrink-0">{rightIcon}</span>
        )}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';
