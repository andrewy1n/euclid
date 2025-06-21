import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="max-w-4xl mx-auto p-8 text-center min-h-screen flex flex-col items-center justify-center">
      <div className="flex justify-center gap-8 mb-8">
        <a href="https://vite.dev" target="_blank" rel="noopener noreferrer">
          <img
            src={viteLogo}
            alt="Vite logo"
            className="h-24 p-6 transition duration-300 hover:drop-shadow-[0_0_2em_#646cffaa]"
          />
        </a>
        <a href="https://react.dev" target="_blank" rel="noopener noreferrer">
          <img
            src={reactLogo}
            alt="React logo"
            className="h-24 p-6 transition duration-300 hover:drop-shadow-[0_0_2em_#61dafbaa] animate-spin-slow"
          />
        </a>
      </div>
      <h1 className="text-4xl font-bold mb-8">Vite + React</h1>
      <div className="p-8 bg-white/80 rounded-lg shadow-md mb-8">
        <button
          onClick={() => setCount((count) => count + 1)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors mb-4"
        >
          count is {count}
        </button>
        <p>
          Edit <code className="bg-gray-100 px-2 py-1 rounded">src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="text-gray-500">Click on the Vite and React logos to learn more</p>
      <style>{`
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin-slow { animation: spin-slow 20s linear infinite; }
      `}</style>
    </div>
  )
}

export default App
