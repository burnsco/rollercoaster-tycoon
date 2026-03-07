import type { ObjectiveState } from '../../entities/types';

interface ObjectivesPanelProps {
  objectives: ObjectiveState[];
}

export function ObjectivesPanel({ objectives }: ObjectivesPanelProps) {
  return (
    <section className="panel objectives">
      <h2>Objectives</h2>
      <ul>
        {objectives.map((objective) => (
          <li key={objective.id} className={objective.completed ? 'done' : ''}>
            <strong>{objective.title}</strong>
            <span>{objective.description}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
