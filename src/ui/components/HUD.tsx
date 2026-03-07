import type { UISnapshot } from '../../entities/types';

interface HUDProps {
  snapshot: UISnapshot;
  currentTime: string;
  onHireJanitor: () => void;
  onHireMechanic: () => void;
  onToggleSandbox: (enabled: boolean) => void;
  onSave: () => void;
}

export function HUD({
  snapshot,
  currentTime,
  onHireJanitor,
  onHireMechanic,
  onToggleSandbox,
  onSave,
}: HUDProps) {
  return (
    <header className="hud">
      <div className="hud__stats">
        <span>Cash: ${snapshot.money.toLocaleString()}</span>
        <span>Guests: {snapshot.guestCount}</span>
        <span>Rating: {snapshot.rating}%</span>
        <span>
          Day {snapshot.day} ({currentTime})
        </span>
      </div>

      <div className="hud__finance">
        <span className="income">Income ${snapshot.incomeToday.toLocaleString()}</span>
        <span className="expense">Expenses ${snapshot.expensesToday.toLocaleString()}</span>
      </div>

      <div className="hud__actions">
        <button type="button" onClick={onHireJanitor}>
          Hire Janitor
        </button>
        <button type="button" onClick={onHireMechanic}>
          Hire Mechanic
        </button>
        <button
          type="button"
          className={snapshot.sandboxMode ? 'toggle-active' : ''}
          onClick={() => onToggleSandbox(!snapshot.sandboxMode)}
        >
          Sandbox: {snapshot.sandboxMode ? 'On' : 'Off'}
        </button>
        <button type="button" onClick={onSave}>
          Save
        </button>
      </div>
    </header>
  );
}
