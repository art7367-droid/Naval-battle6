import { ShipDatabaseEntry } from '../types/shipDatabase';

interface ShipSpecsTableProps {
  ship: ShipDatabaseEntry;
}

export default function ShipSpecsTable({ ship }: ShipSpecsTableProps) {
  return (
    <div className="bg-slate-900/50 rounded border border-slate-700 p-3">
      <h4 className="text-sm font-bold text-cyan-300 mb-2">📋 Тактико-технические характеристики</h4>
      <table className="w-full text-xs">
        <tbody>
          <tr className="border-b border-slate-700">
            <td className="py-1 text-slate-400 font-semibold">Класс:</td>
            <td className="py-1 text-white text-right">
              {ship.class === 'battleship' ? 'Линкор' : ship.class === 'cruiser' ? 'Крейсер' : ship.class === 'destroyer' ? 'Эсминец' : ship.class === 'aircraft_carrier' ? 'Авианосец' : ship.class === 'submarine' ? 'Подводная лодка' : ship.class}
            </td>
          </tr>
          <tr className="border-b border-slate-700"><td className="py-1 text-slate-400 font-semibold">Страна:</td><td className="py-1 text-white text-right">{ship.country}</td></tr>
          <tr className="border-b border-slate-700"><td className="py-1 text-slate-400 font-semibold">Год ввода:</td><td className="py-1 text-white text-right">{ship.year}</td></tr>
          <tr className="border-b border-slate-700 bg-slate-800/30"><td colSpan={2} className="py-1 text-cyan-400 font-semibold text-center">Размеры</td></tr>
          <tr className="border-b border-slate-700"><td className="py-1 text-slate-400">Длина:</td><td className="py-1 text-white text-right">{ship.length || '-'} м</td></tr>
          <tr className="border-b border-slate-700"><td className="py-1 text-slate-400">Ширина:</td><td className="py-1 text-white text-right">{ship.beam || '-'} м</td></tr>
          <tr className="border-b border-slate-700"><td className="py-1 text-slate-400">Осадка:</td><td className="py-1 text-white text-right">{ship.draft || '-'} м</td></tr>
          <tr className="border-b border-slate-700 bg-slate-800/30"><td colSpan={2} className="py-1 text-cyan-400 font-semibold text-center">Водоизмещение</td></tr>
          <tr className="border-b border-slate-700"><td className="py-1 text-slate-400">Стандартное:</td><td className="py-1 text-white text-right">{ship.displacementStandard ? `${ship.displacementStandard.toLocaleString()} т` : '-'}</td></tr>
          <tr className="border-b border-slate-700"><td className="py-1 text-slate-400">Полное:</td><td className="py-1 text-white text-right">{ship.displacementFull ? `${ship.displacementFull.toLocaleString()} т` : '-'}</td></tr>
          <tr className="border-b border-slate-700 bg-slate-800/30"><td colSpan={2} className="py-1 text-cyan-400 font-semibold text-center">Ходовые характеристики</td></tr>
          <tr className="border-b border-slate-700"><td className="py-1 text-slate-400">Скорость:</td><td className="py-1 text-white text-right">{ship.speed} узлов</td></tr>
          <tr className="border-b border-slate-700 bg-slate-800/30"><td colSpan={2} className="py-1 text-cyan-400 font-semibold text-center">Защита и вооружение</td></tr>
          <tr className="border-b border-slate-700"><td className="py-1 text-slate-400">Броня:</td><td className="py-1 text-white text-right">{ship.armor} мм</td></tr>
          <tr className="border-b border-slate-700"><td className="py-1 text-slate-400">Прочность (HP):</td><td className="py-1 text-white text-right">{ship.maxHP}</td></tr>
          <tr className="border-b border-slate-700"><td className="py-1 text-slate-400">Дальность стрельбы:</td><td className="py-1 text-white text-right">{ship.range} гексов</td></tr>
        </tbody>
      </table>
      {ship.description && <div className="mt-2 pt-2 border-t border-slate-700"><p className="text-xs text-slate-400 italic">{ship.description}</p></div>}
    </div>
  );
}
