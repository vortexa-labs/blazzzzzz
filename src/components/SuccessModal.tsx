import React, { useState } from 'react';

interface SuccessModalProps {
  title: string;
  message?: string;
  details?: { label: string; value: string; copy?: boolean }[];
  links?: { label: string; url: string }[];
  buttons: { label: string; onClick: () => void }[];
  onClose: () => void;
}

const SuccessModal: React.FC<SuccessModalProps> = ({
  title,
  message,
  details,
  links,
  buttons,
  onClose,
}) => {
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(value);
      setTimeout(() => setCopied(null), 1500);
    } catch (e) {
      // fallback or error
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Blurred background overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-[#0f0f0f] rounded-2xl shadow-xl max-w-[90vw] w-full sm:w-[400px] mx-4 p-6 flex flex-col items-center z-10">
        {/* Check icon */}
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-600 mb-4">
          <span className="text-3xl">✅</span>
        </div>
        {/* Title */}
        <h2 className="text-white text-xl font-bold mb-2 text-center">{title}</h2>
        {/* Message */}
        {message && <p className="text-gray-300 text-center mb-4">{message}</p>}
        {/* Details */}
        {details && (
          <div className="w-full mb-4 space-y-2">
            {details.map((d, i) => (
              <div key={i} className="flex items-center justify-between bg-[#181818] rounded px-3 py-2">
                <span className="text-gray-400 text-sm">{d.label}</span>
                <span className="text-white text-sm break-all">
                  {d.value}
                  {d.copy && (
                    <button
                      className="ml-2 text-red-400 hover:text-red-600 focus:outline-none"
                      onClick={() => handleCopy(d.value)}
                      aria-label={`Copy ${d.label}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="inline w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16h8M8 12h8m-8-4h8m-2 8v2a2 2 0 002 2h4a2 2 0 002-2V6a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" /></svg>
                    </button>
                  )}
                  {copied === d.value && (
                    <span className="ml-2 text-green-400 text-xs">Copied!</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
        {/* Links */}
        {links && links.length > 0 && (
          <div className="w-full mb-4 flex flex-col space-y-2">
            {links.map((l, i) => (
              <a
                key={i}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-red-400 hover:text-red-500 underline text-sm text-center"
              >
                {l.label}
              </a>
            ))}
          </div>
        )}
        {/* Buttons */}
        <div className="w-full flex flex-col space-y-2 mt-2">
          {buttons.map((b, i) => (
            <button
              key={i}
              onClick={b.onClick}
              className="w-full py-2 rounded bg-red-600 hover:bg-red-700 text-white font-semibold transition"
            >
              {b.label}
            </button>
          ))}
        </div>
        {/* Close button (X) */}
        <button
          className="absolute top-3 right-3 text-gray-400 hover:text-white text-xl focus:outline-none"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default SuccessModal; 