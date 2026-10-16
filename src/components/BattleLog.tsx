import { BattleLogEntry } from '../types';

interface BattleLogProps {
  entries: BattleLogEntry[];
  title?: string;
}

export default function BattleLog({ entries, title = 'Журнал боя' }: BattleLogProps) {
  const getSeverityColor = (severity: BattleLogEntry['severity']) => {
    switch (severity) {
      case 'critical': return 'text-red-400 bg-red-900/30 border-red-700';
      case 'warning': return 'text-orange-400 bg-orange-900/30 border-orange-700';
      default: return 'text-slate-300 bg-slate-900/30 border-slate-700';
    }
  };

  const getTypeIcon = (type: BattleLogEntry['type']) => {
    switch (type) {
      case 'fire_start': case 'fire_spread': return '🔥';
      case 'fire_extinguished': return '💨';
      case 'flooding_start': case 'flooding_spread': return '🌊';
      case 'ammo_detonation': return '💥';
      case 'ship_sunk': return '☠️';
      case 'critical_damage': return '⚠️';
      case 'shot_hit': return '🎯';
      case 'shot_miss': return '💨';
      default: return '•';
    }
  };

  const sortedEntries = [...entries].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-600 w-[750px]">
      <h3 className="text-sm font-bold text-cyan-300 mb-2 flex items-center gap-2">
        📜 {title}<span className="text-xs text-slate-400">({entries.length} записей)</span>
      </h3>
      <div className="max-h-[300px] overflow-y-auto space-y-1">
        {sortedEntries.length === 0 ? (
          <div className="text-center text-slate-500 text-xs py-4">Журнал пуст.</div>
        ) : (
          sortedEntries.map(entry => (
            <div key={entry.id} className={`text-xs p-2 rounded border ${getSeverityColor(entry.severity)}`}>
              <div className="flex items-start gap-2">
                <span className="flex-shrink-0">{getTypeIcon(entry.type)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 mb-0.5">
                    <span>Ход {entry.turn}</span><span>•</span><span className="font-semibold">{entry.shipName}</span>
                  </div>
                  <div className="text-slate-200">{entry.message}</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
