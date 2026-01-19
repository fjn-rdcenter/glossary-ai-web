"use client"

import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

interface Step {
  id: string
  label: string
}

interface StepIndicatorProps {
  steps: Step[]
  currentStep: number
  className?: string
}

export function StepIndicator({ steps, currentStep, className }: StepIndicatorProps) {
  return (
    <div className={cn("flex items-center justify-center", className)}>
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center">
          <div className="flex flex-col items-center">
            <motion.div
              initial={false}
              animate={{
                scale: index === currentStep ? 1.1 : 1,
                backgroundColor: index <= currentStep ? "var(--primary)" : "var(--muted)",
              }}
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors duration-300",
                index <= currentStep ? "text-primary-foreground" : "text-muted-foreground",
              )}
            >
              {index < currentStep ? <Check className="w-5 h-5" /> : <span>{index + 1}</span>}
            </motion.div>
            <span
              className={cn(
                "mt-2 text-xs font-medium transition-colors duration-300 whitespace-nowrap",
                index <= currentStep ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div className="flex-1 mx-4 h-0.5 w-16 bg-muted relative overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{
                  width: index < currentStep ? "100%" : "0%",
                }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="absolute inset-y-0 left-0 bg-primary"
              />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
