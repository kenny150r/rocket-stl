import { useCallback, useEffect, useRef, useState } from 'react';
import type { RocketSpec } from '../geometry/types';
import { loadSpec, saveSpec } from './storage';

const LIMIT = 80;
const COALESCE_MS = 500;

function clone(spec: RocketSpec): RocketSpec {
  return structuredClone(spec);
}

function same(a: RocketSpec, b: RocketSpec): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Geometry fingerprint — name-only edits do not count as dirty for preset confirm. */
export function specFingerprint(spec: RocketSpec): string {
  const { name: _name, ...rest } = spec;
  return JSON.stringify(rest);
}

export function useUndoableSpec() {
  const [spec, setSpecState] = useState<RocketSpec>(loadSpec);
  const [history, setHistory] = useState({ undo: 0, redo: 0 });
  const specRef = useRef(spec);
  const past = useRef<RocketSpec[]>([]);
  const future = useRef<RocketSpec[]>([]);
  const lastPush = useRef(0);
  specRef.current = spec;

  useEffect(() => saveSpec(spec), [spec]);

  const setSpec = useCallback((next: RocketSpec, opts?: { checkpoint?: boolean }) => {
    const prev = specRef.current;
    if (same(prev, next)) return;
    const now = Date.now();
    const force = Boolean(opts?.checkpoint);
    if (force || now - lastPush.current > COALESCE_MS || past.current.length === 0) {
      past.current.push(clone(prev));
      if (past.current.length > LIMIT) past.current.shift();
    }
    lastPush.current = force ? 0 : now;
    future.current = [];
    specRef.current = next;
    setHistory({ undo: past.current.length, redo: 0 });
    setSpecState(next);
  }, []);

  const undo = useCallback(() => {
    const snap = past.current.pop();
    if (!snap) return;
    future.current.push(clone(specRef.current));
    lastPush.current = 0;
    specRef.current = snap;
    setHistory({ undo: past.current.length, redo: future.current.length });
    setSpecState(snap);
  }, []);

  const redo = useCallback(() => {
    const snap = future.current.pop();
    if (!snap) return;
    past.current.push(clone(specRef.current));
    lastPush.current = 0;
    specRef.current = snap;
    setHistory({ undo: past.current.length, redo: future.current.length });
    setSpecState(snap);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z') return;
      const t = e.target;
      if (t instanceof HTMLInputElement) {
        if (t.type === 'email' || t.type === 'password') return;
        if (t.type === 'text' && t.inputMode !== 'decimal') return;
      }
      if (t instanceof HTMLTextAreaElement) return;
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  return {
    spec,
    setSpec,
    undo,
    redo,
    canUndo: history.undo > 0,
    canRedo: history.redo > 0,
  };
}
