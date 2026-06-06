import { useEffect, useState, useCallback } from 'react'
import { useTour } from '../contexts/TourContext'

type Position = 'top' | 'right' | 'bottom' | 'left'

interface TourStep {
  target: string
  title: string
  body: string
  position: Position
}

const TOUR_STEPS: TourStep[] = [
  {
    target: 'tour-step-0',
    title: 'Welcome to KeyKing',
    body: 'This is your command center. The dashboard shows live stats for all your routed API requests, active keys, and token usage in real time.',
    position: 'right',
  },
  {
    target: 'tour-step-1',
    title: 'Your Secure Vault',
    body: "Head over to API Keys to manage your provider credentials. Every key is encrypted locally using AES-256-GCM derived from your machine's hardware fingerprint. They never leave your device.",
    position: 'right',
  },
  {
    target: 'tour-step-2',
    title: 'Add Provider Keys',
    body: 'Click here to add your API keys from any supported provider. We support OpenAI, Groq, Gemini, Mistral, Anthropic, xAI, DeepSeek, OpenRouter, Cohere, Cerebras, Sambanova, Cloudflare, and Github Models.',
    position: 'bottom',
  },
  {
    target: 'tour-step-3',
    title: 'Zero Token Costs',
    body: 'Open the Free Tier Catalog to discover 100+ free AI models across 16 providers. Grab free API keys from Mistral, Groq, Gemini, and more. Drop them into KeyKing and never pay for tokens again.',
    position: 'bottom',
  },
  {
    target: 'tour-step-4',
    title: 'Take It To The Cloud',
    body: 'When you are ready to deploy, export your entire vault as a single encrypted payload. It works seamlessly with Cloudflare Workers, Vercel Edge Functions, or any serverless platform.',
    position: 'bottom',
  },
  {
    target: 'tour-step-5',
    title: 'Bulletproof Routing',
    body: 'This is the Priority tab. Set up intelligent fallback chains so your app never crashes from rate limits or provider outages.',
    position: 'right',
  },
  {
    target: 'tour-step-6',
    title: 'Intelligent Fallbacks',
    body: 'Arrange your models in priority order. If your primary provider goes down or rate-limits you, KeyKing automatically routes to the next one. Drag and drop to reorder. Your app stays online, always.',
    position: 'top',
  },
  {
    target: 'tour-step-7',
    title: 'Real-Time Monitoring',
    body: 'The Routing Log gives you complete visibility into every API request. Track latency, token usage, provider, success/failure status, and errors. All in real time.',
    position: 'right',
  },
]

function getTooltipPosition(
  rect: DOMRect,
  position: Position,
): React.CSSProperties {
  const gap = 24
  const tooltipWidth = 360
  const tooltipHeight = 200 // approximate
  const vw = window.innerWidth
  const vh = window.innerHeight

  let style: React.CSSProperties = { position: 'fixed' }

  switch (position) {
    case 'right':
      style.left = Math.min(rect.right + gap, vw - tooltipWidth - 16)
      style.top = Math.max(8, Math.min(rect.top, vh - tooltipHeight - 16))
      break
    case 'bottom':
      style.left = Math.max(8, Math.min(rect.left, vw - tooltipWidth - 16))
      style.top = Math.min(rect.bottom + gap, vh - tooltipHeight - 16)
      break
    case 'top':
      style.left = Math.max(8, Math.min(rect.left, vw - tooltipWidth - 16))
      style.bottom = Math.max(8, vh - rect.top + gap)
      break
    case 'left':
      style.right = Math.max(8, vw - rect.left + gap)
      style.top = Math.max(8, Math.min(rect.top, vh - tooltipHeight - 16))
      break
  }

  return style
}

export default function TourOverlay() {
  const { tourActive, currentStep, nextStep, skipTour, totalSteps } = useTour()
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)

  const findTarget = useCallback(() => {
    if (!tourActive) return
    const step = TOUR_STEPS[currentStep]
    if (!step) return

    const el = document.querySelector(`[data-tour="${step.target}"]`)
    if (el) {
      setTargetRect(el.getBoundingClientRect())
    } else {
      setTargetRect(null)
    }
  }, [tourActive, currentStep])

  useEffect(() => {
    if (!tourActive) return

    // Small delay to let page transitions settle
    const timeout = setTimeout(findTarget, 100)
    const interval = setInterval(findTarget, 250)
    window.addEventListener('resize', findTarget)
    window.addEventListener('scroll', findTarget, true)

    return () => {
      clearTimeout(timeout)
      clearInterval(interval)
      window.removeEventListener('resize', findTarget)
      window.removeEventListener('scroll', findTarget, true)
    }
  }, [tourActive, currentStep, findTarget])

  if (!tourActive || !targetRect) return null

  const step = TOUR_STEPS[currentStep]
  if (!step) return null

  // Cutout coordinates with padding
  const pad = 10
  const cutX = targetRect.left - pad
  const cutY = targetRect.top - pad
  const cutW = targetRect.width + pad * 2
  const cutH = targetRect.height + pad * 2

  const isLastStep = currentStep === totalSteps - 1
  const tooltipStyle = getTooltipPosition(targetRect, step.position)

  return (
    <>
      {/* Layer 1: SVG backdrop with mask cutout */}
      <svg
        className="fixed inset-0 w-full h-full"
        style={{ zIndex: 9998, pointerEvents: 'none' }}
      >
        <defs>
          <mask id="tour-spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <rect
              x={cutX}
              y={cutY}
              width={cutW}
              height={cutH}
              rx="6"
              fill="black"
            />
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.6)"
          mask="url(#tour-spotlight-mask)"
        />
      </svg>

      {/* Clickable blocker for non-highlighted areas */}
      <div
        className="fixed inset-0"
        style={{ zIndex: 9998, pointerEvents: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Transparent pass-through hole for the highlighted element */}
        <div
          style={{
            position: 'absolute',
            left: cutX,
            top: cutY,
            width: cutW,
            height: cutH,
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Layer 2: Hand-drawn watercolor circle highlight */}
      <svg
        className="fixed pointer-events-none"
        style={{
          left: targetRect.left - 22,
          top: targetRect.top - 18,
          width: targetRect.width + 44,
          height: targetRect.height + 36,
          zIndex: 9999,
        }}
        viewBox="0 0 220 90"
        preserveAspectRatio="none"
      >
        {/* Outer rough ring */}
        <ellipse
          cx="110"
          cy="45"
          rx="102"
          ry="38"
          fill="none"
          stroke="#ff2a85"
          strokeWidth="3.5"
          strokeDasharray="10 3 14 5 8 3 6 5"
          strokeLinecap="round"
          opacity="0.9"
        >
          <animate
            attributeName="stroke-dashoffset"
            from="0"
            to="60"
            dur="3s"
            repeatCount="indefinite"
          />
        </ellipse>
        {/* Inner feathered ring */}
        <ellipse
          cx="110"
          cy="45"
          rx="96"
          ry="32"
          fill="none"
          stroke="#ff2a85"
          strokeWidth="1.8"
          strokeDasharray="5 10 18 5"
          strokeLinecap="round"
          opacity="0.35"
        >
          <animate
            attributeName="stroke-dashoffset"
            from="60"
            to="0"
            dur="4s"
            repeatCount="indefinite"
          />
        </ellipse>
        {/* Soft glow fill */}
        <ellipse
          cx="110"
          cy="45"
          rx="96"
          ry="32"
          fill="#ff2a85"
          opacity="0.06"
        />
      </svg>

      {/* Layer 3: Tooltip card */}
      <div
        key={currentStep}
        className="pointer-events-auto"
        style={{
          ...tooltipStyle,
          zIndex: 9999,
          width: 360,
          animation: 'tour-fade-in 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div className="bg-white border-3 border-neo-dark shadow-neo-md">
          {/* Header bar */}
          <div className="bg-neo-pink px-4 py-3 flex items-center justify-between border-b-3 border-neo-dark">
            <span className="font-display font-black text-white text-sm uppercase tracking-wide">
              {step.title}
            </span>
            <span className="font-display font-bold text-white/70 text-xs tabular-nums bg-white/15 px-2 py-0.5 border border-white/30">
              {currentStep + 1} / {totalSteps}
            </span>
          </div>

          {/* Body */}
          <div className="px-5 py-4">
            <p className="text-sm font-medium text-neo-dark/80 font-body leading-relaxed">
              {step.body}
            </p>
          </div>

          {/* Footer */}
          <div className="px-5 pb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={skipTour}
              className="text-neo-dark/40 hover:text-neo-dark text-xs font-bold uppercase cursor-pointer font-display transition-colors"
            >
              Skip Tour
            </button>
            <button
              type="button"
              onClick={nextStep}
              className="bg-neo-yellow text-neo-dark border-3 border-neo-dark px-5 py-2 font-display font-black uppercase text-sm shadow-neo-sm hover:-translate-y-0.5 hover:shadow-neo-md transition-all cursor-pointer"
            >
              {isLastStep ? 'Finish Tour' : 'Next'}
            </button>
          </div>
        </div>
      </div>

      {/* Keyframe styles */}
      <style>{`
        @keyframes tour-fade-in {
          from {
            opacity: 0;
            transform: translateY(10px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </>
  )
}
