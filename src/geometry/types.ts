export type Units = 'm' | 'mm' | 'in';

export type NoseKind =
  | 'conic'
  | 'power'
  | 'vonKarman'
  | 'haack'
  | 'tangentOgive'
  | 'secantOgive'
  | 'elliptical'
  | 'parabolic';

export type NoseSegment = {
  id: string;
  kind: 'nose';
  nose: NoseKind;
  length: number;
  baseDiameter: number;
  powerN: number;
  haackC: number;
  ogiveRadius: number;
  bluntRadius: number;
};

export type CylinderSegment = {
  id: string;
  kind: 'cylinder';
  length: number;
  diameter: number;
};

export type TaperKind = 'frustum' | 'flare' | 'boattail';

export type TaperSegment = {
  id: string;
  kind: TaperKind;
  length: number;
  foreDiameter: number;
  aftDiameter: number;
};

export type BodySegment = NoseSegment | CylinderSegment | TaperSegment;

export type FinPreset = 'rectangular' | 'trapezoidal' | 'clippedDelta' | 'delta';
export type FinPlanformMode = 'preset' | 'datcom' | 'custom';
export type FinSection = 'doubleWedge' | 'plate';

export type FinSet = {
  id: string;
  name: string;
  xLe: number;
  nFins: number;
  rollDeg: number;
  cantDeg: number;
  /** Axial hinge station from the nose; `null` = ½ root chord from the LE. */
  hingeX: number | null;
  /** How a manual hingeX is entered in the UI. Geometry always uses station from the nose. */
  hingeRef: 'nose' | 'rootTip';
  /** + tips up (+Y) on the horizontal pair. */
  elevatorDeg: number;
  /** + trailing tips of the vertical pair toward +Z (yaw about +Y). */
  rudderDeg: number;
  /** + clockwise roll, viewed from aft looking forward. */
  aileronDeg: number;
  planformMode: FinPlanformMode;
  preset: FinPreset;
  area: number;
  aspectRatio: number;
  taperRatio: number;
  sweepLeDeg: number;
  span: number;
  rootChord: number;
  tipChord: number;
  thickness: number;
  leRadius: number;
  section: FinSection;
};

export type Tessellation = {
  nTheta: number;
  axialPerSegment: number;
  finSectionSamples: number;
  maxEdge: number;
  mergeTol: number;
  tipMinRadiusFrac: number;
  finRootInsetFrac: number;
};

export type LabelGroup = {
  id: string;
  name: string;
  members: string[];
};

export type AtomicComponent = {
  id: number;
  key: string;
  name: string;
};

export type RocketSpec = {
  name: string;
  units: Units;
  segments: BodySegment[];
  finSets: FinSet[];
  tessellation: Tessellation;
  labelGroups?: LabelGroup[];
};

export type ProfilePoint = { x: number; r: number };

export type Vec3 = [number, number, number];

export type MeshData = {
  positions: Float32Array;
  indices: Uint32Array;
};

export type WatertightReport = {
  ok: boolean;
  nTris: number;
  nOpenEdges: number;
  nNonmanifold: number;
  nDegenerate: number;
  minEdge: number;
  maxEdge: number;
  worstAspect: number;
  bbox: { lo: Vec3; hi: Vec3 } | null;
  volume?: number;
  area?: number;
  message: string;
  warnings: string[];
  /** Non-blocking mesh quality notes (e.g. high-aspect slivers). */
  hints: string[];
};

export type IssueTarget = {
  kind: 'segment' | 'fin' | 'tessellation' | 'body';
  id?: string;
  field?: string;
};

export type BlockingIssue = {
  level: 'error' | 'warning';
  message: string;
  target?: IssueTarget;
};
