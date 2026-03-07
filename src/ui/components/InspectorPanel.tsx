import { ATTRACTION_BY_ID } from '../../data/attractions';
import type { AttractionInstance, UISnapshot } from '../../entities/types';
import { isRide } from '../../simulation/Simulation';

interface InspectorPanelProps {
  snapshot: UISnapshot;
  onToggleAttraction: (id: string, open: boolean) => void;
  onChangePrice: (id: string, price: number) => void;
}

function AttractionDetails({
  attraction,
  onToggle,
  onPrice,
}: {
  attraction: AttractionInstance;
  onToggle: (id: string, open: boolean) => void;
  onPrice: (id: string, price: number) => void;
}) {
  const definition = ATTRACTION_BY_ID[attraction.definitionId];

  return (
    <div className="inspector-block">
      <h3>{attraction.name}</h3>
      <p>Status: {attraction.broken ? 'Broken' : attraction.open ? 'Open' : 'Closed'}</p>
      <p>
        Queue: {attraction.queue.length}/{attraction.maxQueue}
      </p>
      <p>Riders: {attraction.riders.length}</p>
      <p>Ticket: ${attraction.ticketPrice}</p>

      {isRide(attraction) && definition?.category === 'ride' && (
        <>
          <p>Excitement: {definition.excitement}</p>
          <p>Intensity: {definition.intensity}</p>
          <p>Nausea: {definition.nausea}</p>
          <p>Breakdowns: {attraction.timesBroken}</p>
        </>
      )}

      <div className="inspector-actions">
        <button
          type="button"
          disabled={attraction.broken}
          onClick={() => onToggle(attraction.id, !attraction.open)}
        >
          {attraction.open ? 'Close' : 'Open'}
        </button>

        <label>
          Ticket Price
          <input
            type="range"
            min={1}
            max={30}
            value={attraction.ticketPrice}
            onChange={(event) => onPrice(attraction.id, Number(event.target.value))}
          />
        </label>
      </div>
    </div>
  );
}

export function InspectorPanel({ snapshot, onToggleAttraction, onChangePrice }: InspectorPanelProps) {
  return (
    <aside className="panel inspector">
      <h2>Inspector</h2>

      {snapshot.selectedAttraction && (
        <AttractionDetails
          attraction={snapshot.selectedAttraction}
          onToggle={onToggleAttraction}
          onPrice={onChangePrice}
        />
      )}

      {snapshot.selectedGuest && (
        <div className="inspector-block">
          <h3>Guest</h3>
          <p>Thought: {snapshot.selectedGuest.thought}</p>
          <p>Happiness: {snapshot.selectedGuest.happiness.toFixed(0)}</p>
          <p>Hunger: {snapshot.selectedGuest.hunger.toFixed(0)}</p>
          <p>Thirst: {snapshot.selectedGuest.thirst.toFixed(0)}</p>
          <p>Energy: {snapshot.selectedGuest.energy.toFixed(0)}</p>
          <p>Nausea: {snapshot.selectedGuest.nausea.toFixed(0)}</p>
          <p>Cash: ${snapshot.selectedGuest.money.toFixed(0)}</p>
        </div>
      )}

      {snapshot.selectedStaff && (
        <div className="inspector-block">
          <h3>{snapshot.selectedStaff.type === 'mechanic' ? 'Mechanic' : 'Janitor'}</h3>
          <p>State: {snapshot.selectedStaff.state}</p>
          <p>Wage / day: ${snapshot.selectedStaff.wage}</p>
        </div>
      )}

      {!snapshot.selectedAttraction && !snapshot.selectedGuest && !snapshot.selectedStaff && (
        <p className="hint">Select a ride, guest, or staff member from the map.</p>
      )}

      {snapshot.lastDaySummary && (
        <div className="inspector-block summary">
          <h3>Day {snapshot.lastDaySummary.day} Report</h3>
          <p>Income: ${snapshot.lastDaySummary.income}</p>
          <p>Expenses: ${snapshot.lastDaySummary.expenses}</p>
          <p>Profit: ${snapshot.lastDaySummary.profit}</p>
        </div>
      )}
    </aside>
  );
}
