import { Canvas } from '@react-three/fiber';
import { Bounds, GizmoHelper, GizmoViewport, OrbitControls } from '@react-three/drei';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { MeshData } from '../geometry/types';

type Props = {
  mesh: MeshData | null;
  wireframe: boolean;
};

export function Viewport({ mesh, wireframe }: Props) {
  return (
    <Canvas camera={{ position: [1.6, 0.55, 0.55], fov: 40, near: 0.001, far: 200 }} dpr={[1, 2]}>
      <color attach="background" args={['#0b0e13']} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 4, 2]} intensity={1.1} />
      <directionalLight position={[-2, -1, -3]} intensity={0.25} />
      <axesHelper args={[0.3]} />
      {mesh && (
        <Bounds fit clip observe margin={1.35} key={mesh.indices.length}>
          <RocketMesh mesh={mesh} wireframe={wireframe} />
        </Bounds>
      )}
      <OrbitControls makeDefault />
      <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
        <GizmoViewport axisColors={['#e05c5c', '#5cc46e', '#5c9ee0']} labelColor="#d8dee9" />
      </GizmoHelper>
    </Canvas>
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
      />
    </mesh>
  );
}
