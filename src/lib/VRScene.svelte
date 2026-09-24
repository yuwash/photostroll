<script lang="ts">
  import { onMount } from 'svelte';
  import { T, useTask } from '@threlte/core';
  import { XR, useXR } from '@threlte/xr';

  const { isPresenting } = useXR();
  import { useTexture } from '@threlte/extras';
  import * as THREE from 'three';
  import type { Readable } from 'svelte/store';

  export let imageSrc: Readable<string | null>;
  export let strollInstance: any;

  let planeWidth = 4;
  let planeHeight = 2.25;

  // Load texture reactively using Threlte's useTexture within Canvas context
  const texture = useTexture($imageSrc || '', {
    transform: (tex: THREE.Texture) => {
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    }
  });

  useTask((delta) => {
    if (strollInstance) {
      // 1. Advance the stroll instance state
      strollInstance.tick(delta);

      // 2. Update texture coordinates if texture is loaded
      const tex = $texture;
      if (tex && 'repeat' in tex && 'offset' in tex) {
        const box = strollInstance.getViewportInOriginalImageScale();
        const imgSize = strollInstance.getOriginalImageSize();

        if (imgSize.width > 0 && imgSize.height > 0 && box.width > 0 && box.height > 0) {
          const rx = box.width / imgSize.width;
          const ry = box.height / imgSize.height;
          const ox = box.x / imgSize.width;
          const oy = 1 - (box.y + box.height) / imgSize.height;

          if (isFinite(rx) && isFinite(ry) && isFinite(ox) && isFinite(oy)) {
            tex.repeat.set(rx, ry);
            tex.offset.set(ox, oy);
            tex.needsUpdate = true;
          }
        }
      }
    }
  });

  onMount(() => {
    const aspect = window.innerWidth / window.innerHeight;
    planeWidth = 4;
    planeHeight = 4 / aspect;
  });
</script>

<XR>
  {#if $isPresenting}
    <!-- Ambient/Background setup -->
    <T.Color attach="background" args={['#aaaaaa']} />

    <!-- Camera container fixed at head height, looking forward -->
    <T.PerspectiveCamera position={[0, 1.6, 0]} makeDefault>
      <!-- Plane positioned relative to camera view -->
      <T.Mesh position={[0, 0, -2]}>
        <T.PlaneGeometry args={[planeWidth, planeHeight]} />
        {#if $texture && !Array.isArray($texture) && 'isTexture' in $texture}
          <T.MeshBasicMaterial map={$texture} side={THREE.DoubleSide} />
        {/if}
      </T.Mesh>
    </T.PerspectiveCamera>
  {/if}
</XR>
