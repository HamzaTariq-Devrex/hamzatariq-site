import * as THREE from "three";
import {
  GLTFLoader,
  type GLTF,
} from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { setCharTimeline, setAllTimeline } from "../../utils/GsapScroll";
import { decryptFile } from "./decrypt";

const setCharacter = (
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera
) => {
  const loader = new GLTFLoader();
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath("/draco/");
  loader.setDRACOLoader(dracoLoader);

  const loadCharacter = async (): Promise<GLTF | null> => {
    const encryptedBlob = await decryptFile("/models/character.enc?v=2", "MyCharacter12");
    const blobUrl = URL.createObjectURL(new Blob([encryptedBlob]));

    return new Promise<GLTF | null>((resolve, reject) => {
      loader.load(
        blobUrl,
        async (gltf) => {
          const character = gltf.scene;
          await renderer.compileAsync(character, camera, scene);
          character.traverse((child) => {
            const mesh = child as THREE.Mesh;
            if (!mesh.isMesh) return;

            if (mesh.material) {
              if (mesh.name === "BODY.SHIRT") {
                const newMat = (mesh.material as THREE.Material).clone() as THREE.MeshStandardMaterial;
                newMat.color = new THREE.Color("#8B4513");
                mesh.material = newMat;
              } else if (mesh.name === "Pant") {
                const newMat = (mesh.material as THREE.Material).clone() as THREE.MeshStandardMaterial;
                newMat.color = new THREE.Color("#000000");
                mesh.material = newMat;
              }
            }

            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.frustumCulled = true;
          });
          resolve(gltf);
          setCharTimeline(character, camera);
          setAllTimeline();
          character.getObjectByName("footR")!.position.y = 3.36;
          character.getObjectByName("footL")!.position.y = 3.36;

          dracoLoader.dispose();
          URL.revokeObjectURL(blobUrl);
        },
        undefined,
        (error) => {
          console.error("Error loading GLTF model:", error);
          reject(error);
        }
      );
    });
  };

  return { loadCharacter };
};

export default setCharacter;
