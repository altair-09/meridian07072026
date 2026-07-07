import { bots } from "../mock/mockData";

export default function BotSelector({ value, onChange, includeAll = true, includeOrchestrator = false }) {
  return (
    <select className="input" style={{ height: 36, width: 220 }} value={value} onChange={(e) => onChange(e.target.value)}>
      {includeAll && <option value="all">Semua bot</option>}
      {bots.map((b) => (
        <option key={b.id} value={b.id}>{b.name}</option>
      ))}
      {includeOrchestrator && <option value="orchestrator">Orchestrator</option>}
    </select>
  );
}
