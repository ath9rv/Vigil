import React, { useState } from 'react';
import { useStorageState } from '../hooks/useStorageState';

export function OnboardingConsent() {
  const [, setOnboardingComplete] = useStorageState('onboarding_complete');
  const [agreed, setAgreed] = useState(false);
  const [ageGroup, setAgeGroup] = useState<'over18' | 'under18' | null>(null);

  const handleSubmit = () => {
    if (agreed && ageGroup) {
      setOnboardingComplete(true);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white p-6">
      <div className="flex items-center justify-center mb-6">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
      </div>
      
      <h2 className="text-2xl font-bold text-center text-gray-900 mb-4">Welcome to Vigil</h2>
      
      <div className="text-sm text-gray-600 mb-6 space-y-3">
        <p>Vigil protects you from dark patterns and deceptive practices while you browse.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>DOES:</strong> Scan pages locally for manipulative designs</li>
          <li><strong>DOES:</strong> Alert you to potential phishing threats</li>
          <li><strong>DOES NOT:</strong> Track your browsing history</li>
          <li><strong>DOES NOT:</strong> Collect personal information</li>
        </ul>
      </div>

      <div className="mt-auto space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-800">Age Declaration</p>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input 
                type="radio" 
                name="age" 
                value="over18" 
                checked={ageGroup === 'over18'}
                onChange={() => setAgeGroup('over18')}
                className="w-4 h-4 text-blue-600"
              />
              I am 18 years or older
            </label>
            <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
              <input 
                type="radio" 
                name="age" 
                value="under18" 
                checked={ageGroup === 'under18'}
                onChange={() => setAgeGroup('under18')}
                className="w-4 h-4 text-blue-600 mt-0.5"
              />
              <div>
                I am under 18
                {ageGroup === 'under18' && (
                  <p className="text-xs text-gray-500 mt-1">Children's Data Addendum applies. Vigil operates in strict local-only mode.</p>
                )}
              </div>
            </label>
          </div>
        </div>

        <label className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100 cursor-pointer">
          <input 
            type="checkbox" 
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
          />
          <span className="text-xs text-gray-600">
            I agree to the <a href="#" className="text-blue-600 hover:underline">Terms of Service</a> and <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>
          </span>
        </label>

        <button 
          onClick={handleSubmit}
          disabled={!agreed || !ageGroup}
          className="w-full py-2.5 px-4 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Get Started
        </button>
      </div>
    </div>
  );
}
