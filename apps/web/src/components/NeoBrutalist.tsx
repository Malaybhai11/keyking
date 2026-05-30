"use client";

import React, { useState } from "react";
import { AlertCircle, X } from "lucide-react";

// ==========================================
// NEO BUTTON COMPONENT
// ==========================================
interface NeoButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "yellow" | "pink" | "green" | "cyan" | "purple" | "orange" | "dark" | "light" | "outline";
  size?: "sm" | "md" | "lg";
  shadowColor?: "dark" | "pink" | "green" | "yellow" | "none";
  tiltOnHover?: boolean;
}

export const NeoButton: React.FC<NeoButtonProps> = ({
  children,
  variant = "yellow",
  size = "md",
  shadowColor = "dark",
  tiltOnHover = false,
  className = "",
  ...props
}) => {
  const baseStyles = "relative font-display font-bold uppercase border-[3px] border-black transition-all duration-150 select-none active:translate-x-[2px] active:translate-y-[2px] active:shadow-none outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2";
  
  const variants = {
    yellow: "bg-[#fde047] text-black hover:-translate-x-[4px] hover:-translate-y-[4px]",
    pink: "bg-[#ff2a85] text-white hover:-translate-x-[4px] hover:-translate-y-[4px]",
    green: "bg-[#00e676] text-black hover:-translate-x-[4px] hover:-translate-y-[4px]",
    cyan: "bg-[#00f0ff] text-black hover:-translate-x-[4px] hover:-translate-y-[4px]",
    purple: "bg-[#9d4edd] text-white hover:-translate-x-[4px] hover:-translate-y-[4px]",
    orange: "bg-[#ff6d00] text-white hover:-translate-x-[4px] hover:-translate-y-[4px]",
    dark: "bg-black text-white hover:bg-neutral-800 hover:-translate-x-[4px] hover:-translate-y-[4px]",
    light: "bg-white text-black hover:-translate-x-[4px] hover:-translate-y-[4px]",
    outline: "bg-transparent text-black hover:bg-black/5 hover:-translate-x-[4px] hover:-translate-y-[4px]",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs tracking-wider",
    md: "px-6 py-3 text-sm tracking-wide",
    lg: "px-8 py-4 text-base tracking-wider",
  };

  const shadows = {
    dark: "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]",
    pink: "shadow-[4px_4px_0px_0px_#ff2a85] hover:shadow-[8px_8px_0px_0px_#ff2a85]",
    green: "shadow-[4px_4px_0px_0px_#00e676] hover:shadow-[8px_8px_0px_0px_#00e676]",
    yellow: "shadow-[4px_4px_0px_0px_#fde047] hover:shadow-[8px_8px_0px_0px_#fde047]",
    none: "shadow-none hover:shadow-none hover:translate-x-0 hover:translate-y-0 active:translate-x-0 active:translate-y-0",
  };

  const tiltClass = tiltOnHover ? "hover:rotate-1" : "";

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${shadows[shadowColor]} ${tiltClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

// ==========================================
// NEO BADGE COMPONENT
// ==========================================
interface NeoBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "yellow" | "pink" | "green" | "cyan" | "purple" | "orange" | "dark" | "light";
  interactive?: boolean;
}

export const NeoBadge: React.FC<NeoBadgeProps> = ({
  children,
  variant = "yellow",
  interactive = false,
  className = "",
  ...props
}) => {
  const baseStyles = "inline-flex items-center gap-1.5 px-3 py-1 text-xs font-display font-extrabold uppercase border-2 border-black tracking-wide select-none";
  
  const variants = {
    yellow: "bg-[#fde047] text-black",
    pink: "bg-[#ff2a85] text-white",
    green: "bg-[#00e676] text-black",
    cyan: "bg-[#00f0ff] text-black",
    purple: "bg-[#9d4edd] text-white",
    orange: "bg-[#ff6d00] text-white",
    dark: "bg-black text-white",
    light: "bg-white text-black",
  };

  const interactiveStyles = interactive
    ? "transition-all duration-150 hover:-translate-y-0.5 hover:rotate-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
    : "";

  return (
    <span
      className={`${baseStyles} ${variants[variant]} ${interactiveStyles} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};

// ==========================================
// NEO INPUT COMPONENT
// ==========================================
interface NeoInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

export const NeoInput: React.FC<NeoInputProps> = ({
  label,
  error,
  helperText,
  icon,
  className = "",
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="flex flex-col w-full font-body">
      {label && (
        <label className="mb-2 font-display text-xs font-black uppercase tracking-wider text-black flex items-center gap-1">
          {label}
          {props.required && <span className="text-[#ff2a85]">*</span>}
        </label>
      )}
      
      <div 
        className={`relative flex items-center border-[3px] border-black bg-white transition-all duration-150
          ${isFocused ? "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -translate-x-[2px] -translate-y-[2px]" : "shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"}
          ${error ? "border-[#ff2a85]" : ""}
        `}
      >
        {icon && (
          <div className="pl-3 text-neutral-500 pointer-events-none flex items-center justify-center">
            {icon}
          </div>
        )}
        <input
          className={`w-full px-4 py-3 text-sm font-medium text-black placeholder-neutral-400 bg-transparent outline-none ${className}`}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          {...props}
        />
      </div>

      {error ? (
        <p className="mt-1.5 font-display text-xs font-bold text-[#ff2a85] uppercase tracking-wide flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
        </p>
      ) : helperText ? (
        <p className="mt-1.5 text-xs text-neutral-600">
          {helperText}
        </p>
      ) : null}
    </div>
  );
};

// ==========================================
// NEO CARD / CONTAINER COMPONENT
// ==========================================
interface NeoCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "yellow" | "pink" | "green" | "cyan" | "purple" | "orange" | "dark" | "light" | "transparent";
  shadowColor?: "dark" | "pink" | "green" | "yellow" | "cyan" | "none";
  shadowSize?: "sm" | "md" | "lg" | "xl";
  titleBar?: React.ReactNode;
  onClose?: () => void;
  hoverExpand?: boolean;
}

export const NeoCard: React.FC<NeoCardProps> = ({
  children,
  variant = "light",
  shadowColor = "dark",
  shadowSize = "md",
  titleBar,
  onClose,
  hoverExpand = false,
  className = "",
  ...props
}) => {
  const baseStyles = "relative border-[3px] border-black overflow-hidden flex flex-col font-body transition-all duration-200";

  const variants = {
    yellow: "bg-[#fde047] text-black",
    pink: "bg-[#ff2a85] text-white",
    green: "bg-[#00e676] text-black",
    cyan: "bg-[#00f0ff] text-black",
    purple: "bg-[#9d4edd] text-white",
    orange: "bg-[#ff6d00] text-white",
    dark: "bg-black text-white",
    light: "bg-white text-black",
    transparent: "bg-[#fcf6e6]/60 backdrop-blur-sm text-black",
  };

  const shadowMap = {
    sm: {
      dark: "shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
      pink: "shadow-[2px_2px_0px_0px_#ff2a85]",
      green: "shadow-[2px_2px_0px_0px_#00e676]",
      yellow: "shadow-[2px_2px_0px_0px_#fde047]",
      cyan: "shadow-[2px_2px_0px_0px_#00f0ff]",
      none: "shadow-none",
    },
    md: {
      dark: "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
      pink: "shadow-[4px_4px_0px_0px_#ff2a85]",
      green: "shadow-[4px_4px_0px_0px_#00e676]",
      yellow: "shadow-[4px_4px_0px_0px_#fde047]",
      cyan: "shadow-[4px_4px_0px_0px_#00f0ff]",
      none: "shadow-none",
    },
    lg: {
      dark: "shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]",
      pink: "shadow-[8px_8px_0px_0px_#ff2a85]",
      green: "shadow-[8px_8px_0px_0px_#00e676]",
      yellow: "shadow-[8px_8px_0px_0px_#fde047]",
      cyan: "shadow-[8px_8px_0px_0px_#00f0ff]",
      none: "shadow-none",
    },
    xl: {
      dark: "shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]",
      pink: "shadow-[12px_12px_0px_0px_#ff2a85]",
      green: "shadow-[12px_12px_0px_0px_#00e676]",
      yellow: "shadow-[12px_12px_0px_0px_#fde047]",
      cyan: "shadow-[12px_12px_0px_0px_#00f0ff]",
      none: "shadow-none",
    },
  };

  const shadowClass = shadowMap[shadowSize][shadowColor];

  const hoverClass = hoverExpand 
    ? "hover:-translate-x-1.5 hover:-translate-y-1.5 hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] cursor-default"
    : "";

  return (
    <div
      className={`${baseStyles} ${variants[variant]} ${shadowClass} ${hoverClass} ${className}`}
      {...props}
    >
      {/* Title Bar like a windows/mac classic window */}
      {titleBar && (
        <div className="flex items-center justify-between px-4 py-2 border-b-[3px] border-black bg-black text-white select-none">
          <span className="font-display font-black text-xs uppercase tracking-wider">
            {titleBar}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 border border-white/40 bg-zinc-700/80 rounded-sm"></span>
            <span className="w-3 h-3 border border-white/40 bg-zinc-700/80 rounded-sm"></span>
            {onClose ? (
              <button 
                onClick={onClose} 
                className="w-4.5 h-4.5 border-2 border-white bg-[#ff2a85] hover:bg-[#ff0055] text-white flex items-center justify-center cursor-pointer"
                title="Close"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            ) : (
              <span className="w-3.5 h-3.5 border-2 border-white bg-zinc-600 rounded-sm"></span>
            )}
          </div>
        </div>
      )}
      <div className="p-5 flex-1 flex flex-col">
        {children}
      </div>
    </div>
  );
};
