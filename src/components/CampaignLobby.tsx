import { useState } from 'react';

interface CampaignLobbyProps {
  onStart: (config: { player1Side: string, player1Type: string, player2Side: string, player2Type: string }) => void;
  onBack: () => void;
}

export default function CampaignLobby({ onStart, onBack }: CampaignLobbyProps) {
  const [p1Side, setP1Side] = useState('Japan');
  const [p1Type, setP1Type] = useState('Human');
  const [p2Side, setP2Side] = useState('USA');
  const [p2Type, setP2Type] = useState('AI');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 text-white p-4 flex items-center justify-center">
      <div className="max-w-md w-full bg-slate-800 p-6 rounded-lg border border-slate-700 shadow-xl">
        <h1 className="text-2xl font-bold text-cyan-300 mb-6 text-center">🌏 Настройка Кампании</h1>
        
        {/* Игрок 1 */}
        <div className="mb-4 p-3 bg-slate-700 rounded">
          <h2 className="text-sm font-bold text-blue-300 mb-2">Игрок 1 (Вы)</h2>
          <div className="flex gap-2 mb-2">
            <button onClick={() => setP1Side('Japan')} className={`flex-1 py-1 rounded text-sm ${p1Side === 'Japan' ? 'bg-red-600' : 'bg-slate-600'}`}>🇯🇵 Япония</button>
            <button onClick={() => setP1Side('USA')} className={`flex-1 py-1 rounded text-sm ${p1Side === 'USA' ? 'bg-blue-600' : 'bg-slate-600'}`}>🇺🇸 США</button>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setP1Type('Human')} className={`flex-1 py-1 rounded text-sm ${p1Type === 'Human' ? 'bg-green-600' : 'bg-slate-600'}`}>👤 Человек</button>
            <button onClick={() => setP1Type('AI')} className={`flex-1 py-1 rounded text-sm ${p1Type === 'AI' ? 'bg-green-600' : 'bg-slate-600'}`}>🤖 ИИ</button>
          </div>
        </div>

        {/* Игрок 2 */}
        <div className="mb-6 p-3 bg-slate-700 rounded">
          <h2 className="text-sm font-bold text-red-300 mb-2">Игрок 2 (Противник)</h2>
          <div className="flex gap-2 mb-2">
            <button onClick={() => setP2Side('Japan')} className={`flex-1 py-1 rounded text-sm ${p2Side === 'Japan' ? 'bg-red-600' : 'bg-slate-600'}`}>🇯🇵 Япония</button>
            <button onClick={() => setP2Side('USA')} className={`flex-1 py-1 rounded text-sm ${p2Side === 'USA' ? 'bg-blue-600' : 'bg-slate-600'}`}>🇺🇸 США</button>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setP2Type('Human')} className={`flex-1 py-1 rounded text-sm ${p2Type === 'Human' ? 'bg-green-600' : 'bg-slate-600'}`}>👤 Человек</button>
            <button onClick={() => setP2Type('AI')} className={`flex-1 py-1 rounded text-sm ${p2Type === 'AI' ? 'bg-green-600' : 'bg-slate-600'}`}>🤖 ИИ</button>
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={onBack} className="flex-1 py-2 bg-slate-600 hover:bg-slate-500 rounded font-bold">← Назад</button>
          <button 
            onClick={() => onStart({ player1Side: p1Side, player1Type: p1Type, player2Side: p2Side, player2Type: p2Type })} 
            className="flex-[2] py-2 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-500 hover:to-teal-500 rounded font-bold"
          >
            🚀 Начать Кампанию
          </button>
        </div>
      </div>
    </div>
  );
}