import './index.css';
import { useGame } from './app/useGame';
import { BuildMenu } from './ui/components/BuildMenu';
import { HUD } from './ui/components/HUD';
import { InspectorPanel } from './ui/components/InspectorPanel';
import { NotificationsPanel } from './ui/components/NotificationsPanel';
import { ObjectivesPanel } from './ui/components/ObjectivesPanel';

function App() {
  const {
    canvasRef,
    snapshot,
    tool,
    timeLabel,
    setTool,
    setAttractionOpen,
    setAttractionPrice,
    hireJanitor,
    hireMechanic,
    toggleSandbox,
    saveNow,
  } = useGame();

  return (
    <div className="app-shell">
      <HUD
        snapshot={snapshot}
        currentTime={timeLabel}
        onHireJanitor={hireJanitor}
        onHireMechanic={hireMechanic}
        onToggleSandbox={toggleSandbox}
        onSave={saveNow}
      />

      <main className="game-layout">
        <BuildMenu tool={tool} onToolChange={setTool} />

        <section className="map-stage">
          <canvas ref={canvasRef} className="game-canvas" />
          <div className="map-help">
            Left click to build/select. Right drag or WASD/Arrows to move camera. Mouse wheel zooms.
          </div>
        </section>

        <div className="right-column">
          <InspectorPanel
            snapshot={snapshot}
            onToggleAttraction={setAttractionOpen}
            onChangePrice={setAttractionPrice}
          />
          <ObjectivesPanel objectives={snapshot.objectives} />
          <NotificationsPanel notifications={snapshot.notifications} />
        </div>
      </main>
    </div>
  );
}

export default App;
