import React from "react";
import { ArrowRight } from "lucide-react";

export interface AuthSubmitButtonProps {
  isSubmitting: boolean;
  loadingText: string;
  defaultText: string;
}

export const AuthSubmitButton: React.FC<AuthSubmitButtonProps> = ({
  isSubmitting,
  loadingText,
  defaultText,
}) => {
  return (
    <button
      type="submit"
      disabled={isSubmitting}
      className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#1E5AF6] to-[#0D44D9] hover:from-[#184FD8] hover:to-[#0A3AB8] active:scale-[0.99] text-white font-semibold text-sm shadow-md shadow-blue-500/25 transition duration-150 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
    >
      {isSubmitting ? (
        <>
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span>{loadingText}</span>
        </>
      ) : (
        <>
          <span>{defaultText}</span>
          <ArrowRight className="w-4 h-4" />
        </>
      )}
    </button>
  );
};

export default AuthSubmitButton;
