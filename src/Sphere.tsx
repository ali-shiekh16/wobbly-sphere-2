import { useTexture } from '@react-three/drei';
import { useMemo } from 'react';
import { IcosahedronGeometry } from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const Sphere = () => {
  const geometry = useMemo(() => {
    const geometry = mergeVertices(
      // new IcosahedronGeometry(1.3, shouldReduceQuality ? 128 : 200)
      new IcosahedronGeometry(1.3, 32)
    );
    geometry.computeTangents();
    return geometry;
  }, []);

  const baseMap = useTexture('/texture/base.png');
  const normalMap = useTexture('/texture/normal.png');
  const metallicMap = useTexture('/texture/metallic.png');
  const roughnessMap = useTexture('/texture/roughness.png');

  return (
    <mesh geometry={geometry}>
      {/* <sphereGeometry args={[1, 32, 32]} /> */}
      <meshStandardMaterial
        color='white'
        map={baseMap}
        normalMap={normalMap}
        roughnessMap={roughnessMap}
        metalnessMap={metallicMap}
        roughness={1}
      />
    </mesh>
  );
};

export default Sphere;
