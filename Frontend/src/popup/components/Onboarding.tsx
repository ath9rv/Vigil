import React, { useState } from 'react';

interface OnboardingProps {
  onComplete: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(1);

  if (step === 1) {
    return (
      <div className="flex flex-col h-full bg-white text-gray-800 p-6">
        <div className="flex-1 flex flex-col justify-center">
          <h1 className="text-2xl font-bold text-center mb-2">🛡️ VIGIL</h1>
          <p className="text-center text-gray-500 mb-6 font-medium">Your browser, with receipts.</p>
          
          <div className="bg-gray-50 p-4 rounded-xl mb-6">
            <h2 className="font-bold mb-3">Standard Protection</h2>
            <ul className="space-y-2 text-sm text-gray-600 mb-4">
              <li className="flex gap-2"><span>✓</span> Local threat intelligence</li>
              <li className="flex gap-2"><span>✓</span> Website behavior & dark-pattern scan</li>
              <li className="flex gap-2"><span>✓</span> Evidence-based warnings</li>
            </ul>
            
            <h2 className="font-bold mb-3">Vigil does NOT:</h2>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex gap-2"><span>•</span> upload your browsing history</li>
              <li className="flex gap-2"><span>•</span> read passwords or form values</li>
              <li className="flex gap-2"><span>•</span> silently audit legal documents</li>
              <li className="flex gap-2"><span>•</span> send every URL to a cloud service</li>
            </ul>
          </div>
          
          <p className="text-xs text-gray-400 text-center mb-4 px-2">
            By continuing, you understand that Standard Protection uses local analysis and does not require optional site-wide access.
          </p>
        </div>
        
        <button 
          onClick={() => setStep(2)}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors"
        >
          Continue
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white text-gray-800 p-6">
      <div className="flex-1 flex flex-col justify-center">
        <h1 className="text-xl font-bold mb-6 text-center">Power Features</h1>
        
        <div className="bg-gray-50 p-4 rounded-xl mb-4">
          <h2 className="font-bold flex items-center gap-2 mb-1">
            <span>🔒</span> Strict Privacy Mode
          </h2>
          <p className="text-sm text-gray-600 mb-2">
            Reduces browser fingerprint uniqueness across the sites you visit.
          </p>
          <div className="text-xs text-gray-500 pl-6 border-l-2 border-gray-200">
            <strong>Requires:</strong> access to sites you choose to protect or broader site access for universal protection.
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-xl mb-6">
          <h2 className="font-bold flex items-center gap-2 mb-1">
            <span>⚖️</span> Deep Legal Audit
          </h2>
          <p className="text-sm text-gray-600 mb-2">
            Reviews legal documents you explicitly ask Vigil to analyze.
          </p>
          <div className="text-xs text-gray-500 pl-6 border-l-2 border-gray-200">
            <strong>Requires:</strong> access to the legal document you ask Vigil to review.<br/>
            Optional external verification when enabled.
          </div>
        </div>
        
        <p className="text-sm text-center font-medium text-gray-700 mb-4">
          Nothing runs automatically. You stay in control.
        </p>
      </div>
      
      <button 
        onClick={onComplete}
        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors"
      >
        Finish Setup
      </button>
    </div>
  );
}
