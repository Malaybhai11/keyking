import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

interface TourContextValue {
  tourActive: boolean
  currentStep: number
  totalSteps: number
  nextStep: () => void
  skipTour: () => void
}

const TOTAL_STEPS = 8
const STORAGE_KEY = 'keyking_tour_completed'

const TourContext = createContext<TourContextValue>({
  tourActive: false,
  currentStep: 0,
  totalSteps: TOTAL_STEPS,
  nextStep: () => {},
  skipTour: () => {},
})

export function TourProvider({ children }: { children: ReactNode }) {
  const [tourActive, setTourActive] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) !== 'true'
    } catch {
      return true
    }
  })
  const [currentStep, setCurrentStep] = useState(0)

  const completeTour = useCallback(() => {
    setTourActive(false)
    setCurrentStep(0)
    try {
      localStorage.setItem(STORAGE_KEY, 'true')
    } catch {
      // localStorage unavailable — silently continue
    }
  }, [])

  const nextStep = useCallback(() => {
    if (currentStep >= TOTAL_STEPS - 1) {
      completeTour()
    } else {
      setCurrentStep((prev) => prev + 1)
    }
  }, [currentStep, completeTour])

  const skipTour = useCallback(() => {
    completeTour()
  }, [completeTour])

  return (
    <TourContext.Provider
      value={{
        tourActive,
        currentStep,
        totalSteps: TOTAL_STEPS,
        nextStep,
        skipTour,
      }}
    >
      {children}
    </TourContext.Provider>
  )
}

export function useTour() {
  const ctx = useContext(TourContext)
  if (!ctx) {
    throw new Error('useTour must be used within a TourProvider')
  }
  return ctx
}
