import React, { useState } from "react";

interface NewSimulationButtonProps {
  onStartNewSimulation: () => void;
}

export function NewSimulationButton({
  onStartNewSimulation,
}: NewSimulationButtonProps) {
  return (
    <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-lg p-8 mb-8">
      <div className="text-center">
        <div className="mb-4">
          <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            新しいシミュレーションを開始
          </h2>
          <p className="text-blue-100 text-lg">
            AIを活用した投資戦略の仮説検証を始めましょう
          </p>
        </div>

        <button
          onClick={onStartNewSimulation}
          className="bg-white text-blue-600 hover:bg-blue-50 font-semibold py-3 px-8 rounded-lg transition-colors duration-200 flex items-center gap-2 mx-auto"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          シミュレーション開始
        </button>
      </div>
    </div>
  );
}
