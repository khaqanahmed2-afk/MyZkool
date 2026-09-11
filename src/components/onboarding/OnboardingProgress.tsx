import React from "react";
import { Check } from "lucide-react";
import { ONBOARDING_STEPS } from "../../types/school";

interface OnboardingProgressProps {
  currentStepNumber: number; // 1 through 8
  completedStepNumbers?: number[]; // list of completed step numbers
}

export const OnboardingProgress: React.FC<OnboardingProgressProps> = ({
  currentStepNumber,
  completedStepNumbers = [],
}) => {
  const currentStep =
    ONBOARDING_STEPS.find((s) => s.stepNumber === currentStepNumber) ||
    ONBOARDING_STEPS[0];

  const percentage = Math.round(((currentStepNumber - 1) / (ONBOARDING_STEPS.length - 1)) * 100);

  return (
    <div className="w-full" aria-label="Onboarding Progress">
      {/* Header Info */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#2158E0]/10 text-[#2158E0]">
            Step {currentStepNumber} of 8
          </span>
          <span className="text-sm font-semibold text-[#141A2E]">
            {currentStep.title}
          </span>
        </div>
        <span className="text-xs font-medium text-[#5B6478]">
          {percentage}% Completed
        </span>
      </div>

      {/* Progress Bar Track */}
      <div className="w-full h-1.5 bg-[#E6EAF3] rounded-full overflow-hidden mb-5">
        <div
          className="h-full bg-[#2158E0] rounded-full transition-all duration-500 ease-out"
          style={{ width: `${Math.max(percentage, 12)}%` }}
        />
      </div>

      {/* Responsive Step Indicator Nodes (Desktop & Tablet) */}
      <div className="hidden sm:grid grid-cols-8 gap-2 mb-6" role="list">
        {ONBOARDING_STEPS.map((step) => {
          const isCompleted =
            completedStepNumbers.includes(step.stepNumber) ||
            step.stepNumber < currentStepNumber;
          const isActive = step.stepNumber === currentStepNumber;
          const isUpcoming = !isCompleted && !isActive;

          return (
            <div
              key={step.stepNumber}
              role="listitem"
              aria-current={isActive ? "step" : undefined}
              className="flex flex-col items-center text-center group"
            >
              {/* Circle Node */}
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                  isCompleted
                    ? "bg-[#10B981] text-white shadow-sm"
                    : isActive
                    ? "bg-[#2158E0] text-white ring-4 ring-[#2158E0]/20 shadow-sm"
                    : "bg-[#F1F5F9] text-[#94A3B8] border border-[#E2E8F0]"
                }`}
                title={`${step.title}: ${step.subtitle}`}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4 stroke-[2.5]" />
                ) : (
                  step.stepNumber
                )}
              </div>

              {/* Step Label */}
              <span
                className={`mt-1.5 text-[11px] leading-tight truncate w-full px-0.5 ${
                  isActive
                    ? "font-semibold text-[#2158E0]"
                    : isCompleted
                    ? "font-medium text-[#141A2E]"
                    : "text-[#94A3B8]"
                }`}
              >
                {step.title}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
