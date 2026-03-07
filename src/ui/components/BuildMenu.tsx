import { ATTRACTION_DEFINITIONS } from '../../data/attractions';
import { SCENERY_DEFINITIONS } from '../../data/scenery';
import type { BuildTool } from '../../entities/types';
import { getToolCost, getToolName } from '../../engine/GameController';

interface BuildMenuProps {
  tool: BuildTool;
  onToolChange: (tool: BuildTool) => void;
}

function toolEquals(a: BuildTool, b: BuildTool): boolean {
  if (a.kind !== b.kind) {
    return false;
  }

  if (a.kind === 'attraction' && b.kind === 'attraction') {
    return a.definitionId === b.definitionId;
  }

  if (a.kind === 'scenery' && b.kind === 'scenery') {
    return a.sceneryType === b.sceneryType;
  }

  return true;
}

function ToolButton({
  active,
  label,
  tool,
  onClick,
}: {
  active: boolean;
  label: string;
  tool: BuildTool;
  onClick: (tool: BuildTool) => void;
}) {
  const cost = getToolCost(tool);
  return (
    <button type="button" className={active ? 'active' : ''} onClick={() => onClick(tool)}>
      <span>{label}</span>
      {cost > 0 && <small>${cost}</small>}
    </button>
  );
}

export function BuildMenu({ tool, onToolChange }: BuildMenuProps) {
  const rides = ATTRACTION_DEFINITIONS.filter((item) => item.category === 'ride');
  const stalls = ATTRACTION_DEFINITIONS.filter((item) => item.category === 'stall');

  return (
    <aside className="panel build-menu">
      <h2>Build</h2>

      <div className="build-group">
        <h3>Tools</h3>
        <ToolButton active={tool.kind === 'inspect'} label="Inspect" tool={{ kind: 'inspect' }} onClick={onToolChange} />
        <ToolButton active={tool.kind === 'path'} label="Path" tool={{ kind: 'path' }} onClick={onToolChange} />
        <ToolButton active={tool.kind === 'demolish'} label="Demolish" tool={{ kind: 'demolish' }} onClick={onToolChange} />
      </div>

      <div className="build-group">
        <h3>Rides</h3>
        {rides.map((ride) => {
          const candidate: BuildTool = { kind: 'attraction', definitionId: ride.id };
          return (
            <ToolButton
              key={ride.id}
              active={toolEquals(tool, candidate)}
              label={ride.name}
              tool={candidate}
              onClick={onToolChange}
            />
          );
        })}
      </div>

      <div className="build-group">
        <h3>Stalls</h3>
        {stalls.map((stall) => {
          const candidate: BuildTool = { kind: 'attraction', definitionId: stall.id };
          return (
            <ToolButton
              key={stall.id}
              active={toolEquals(tool, candidate)}
              label={stall.name}
              tool={candidate}
              onClick={onToolChange}
            />
          );
        })}
      </div>

      <div className="build-group">
        <h3>Scenery</h3>
        {SCENERY_DEFINITIONS.map((scenery) => {
          const candidate: BuildTool = { kind: 'scenery', sceneryType: scenery.id };
          return (
            <ToolButton
              key={scenery.id}
              active={toolEquals(tool, candidate)}
              label={scenery.name}
              tool={candidate}
              onClick={onToolChange}
            />
          );
        })}
      </div>

      <footer className="build-footer">Selected: {getToolName(tool)}</footer>
    </aside>
  );
}
