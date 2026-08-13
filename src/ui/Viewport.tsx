import { Bounds, GizmoHelper, GizmoViewport, OrbitControls, useBounds } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { MeshData } from '../geometry/types';

type Props = {
  mesh: MeshData | null;
  wireframe: boolean;
  fitToken: number;
  bodyLength: number;
};

export function Viewport({ mesh, wireframe, fitToken, bodyLength }: Props) {
  return (
    <Canvas camera={{ position: [1.6, 0.55, 0.55], fov: 40, near: 0.001, far: 200 }} dpr={[1, 2]}>
      <color attach="background" args={['#0b0e13']} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 4, 2]} intensity={1.1} />
      <directionalLight position={[-2, -1, -3]} intensity={0.25} />
      <axesHelper args={[0.3]} />
      <StationGrid length={bodyLength} />
      <Bounds clip margin={1.35}>
        {mesh && <RocketMesh mesh={mesh} wireframe={wireframe} />}
        <FitOnDemand mesh={mesh} fitToken={fitToken} />
      </Bounds>
      <OrbitControls makeDefault />
      <GizmoHelper alignment="bottom-right" margin={[72, 72]}>
        <GizmoViewport axisColors={['#e05c5c', '#5cc46e', '#5c9ee0']} labelColor="#d8dee9" />
      </GizmoHelper>
    </Canvas>
  );
}

function FitOnDemand({ mesh, fitToken }: { mesh: MeshData | null; fitToken: number }) {
  const bounds = useBounds();
  const first = useRef(true);
  const lastToken = useRef(fitToken);

  useEffect(() => {
    if (!mesh) return;
    const userFit = fitToken !== lastToken.current;
    lastToken.current = fitToken;
    if (!(first.current || userFit)) return;
    first.current = false;
    const id = requestAnimationFrame(() => {
      bounds.refresh().clip().fit();
    });
    return () => cancelAnimationFrame(id);
  }, [mesh, fitToken, bounds]);

  return null;
}

function StationGrid({ length }: { length: number }) {
  const span = Math.max(2, Math.ceil(Math.max(length, 0) + 0.5));
  const divisions = Math.max(10, Math.round(span / 0.1));
  return (
    <gridHelper
      args={[span, divisions, '#2a3342', '#1a222e']}
      rotation={[Math.PI / 2, 0, 0]}
      position={[span / 2, 0, 0]}
    />
  );
}

function RocketMesh({ mesh, wireframe }: { mesh: MeshData; wireframe: boolean }) {
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(mesh.positions, 3));
    g.setIndex(new THREE.BufferAttribute(mesh.indices, 1));
    g.computeVertexNormals();
    g.computeBoundingSphere();
    return g;
  }, [mesh]);

  useEffect(() => () => geom.dispose(), [geom]);

  return (
    <mesh geometry={geom}>
      <meshStandardMaterial
        color="#9ec9e3"
        metalness={0.12}
        roughness={0.42}
        wireframe={wireframe}
        side={THREE.DoubleSide}
        polygonOffset
        polygonOffsetFactor={1}
        polygonOffsetUnits={1}
      />
    </mesh>
  );
}
