import { useEffect, useMemo, useRef, useState } from 'react';
import type { BuildTool, UISnapshot } from '../entities/types';
import { GameController } from '../engine/GameController';
import { formatTime } from '../engine/CanvasRenderer';

const DEFAULT_SNAPSHOT: UISnapshot = {
  money: 0,
  guestCount: 0,
  janitorCount: 0,
  mechanicCount: 0,
  rating: 0,
  day: 1,
  dayProgress: 0,
  incomeToday: 0,
  expensesToday: 0,
  notifications: [],
  objectives: [],
  selectedAttraction: null,
  selectedGuest: null,
  selectedStaff: null,
  sandboxMode: false,
  lastDaySummary: null,
};

export function useGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const controllerRef = useRef<GameController | null>(null);

  const [snapshot, setSnapshot] = useState<UISnapshot>(DEFAULT_SNAPSHOT);
  const [tool, setToolState] = useState<BuildTool>({ kind: 'inspect' });

  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }

    const controller = new GameController(canvasRef.current);
    controllerRef.current = controller;

    const unsubscribe = controller.subscribe((next) => {
      setSnapshot(next);
    });

    controller.start();

    return () => {
      unsubscribe();
      controller.stop();
      controllerRef.current = null;
    };
  }, []);

  const timeLabel = useMemo(() => formatTime(snapshot), [snapshot]);

  const setTool = (nextTool: BuildTool) => {
    setToolState(nextTool);
    controllerRef.current?.setTool(nextTool);
  };

  return {
    canvasRef,
    snapshot,
    tool,
    timeLabel,
    setTool,
    setAttractionOpen: (id: string, open: boolean) => controllerRef.current?.setAttractionOpen(id, open),
    setAttractionPrice: (id: string, price: number) => controllerRef.current?.setAttractionPrice(id, price),
    hireJanitor: () => controllerRef.current?.hireJanitor(),
    hireMechanic: () => controllerRef.current?.hireMechanic(),
    toggleSandbox: (enabled: boolean) => controllerRef.current?.setSandboxMode(enabled),
    saveNow: () => controllerRef.current?.saveNow(),
  };
}
