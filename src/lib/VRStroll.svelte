<script>
  import { onMount, onDestroy } from 'svelte';
  import { Canvas, T } from '@threlte/core';
  import { XR, useXR } from '@threlte/xr';
  import { useTexture } from '@threlte/extras';
  import * as THREE from 'three';

  export let imageSrc;
  export let strollInstance;
  export let vrStrollComponent;

  let planeMesh;
  let planeWidth = 4;
  let planeHeight = 2.25;
  let animationFrameId;
  let sceneLoaded = false;

  // Load texture reactively using Threlte's useTexture
  const texture = useTexture(imageSrc, {
    transform: (tex) => {
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    }
  });

  function tick(currentTime) {
    if (strollInstance && $texture) {
      const box = strollInstance.getViewportInOriginalImageScale();
      const imgSize = strollInstance.getOriginalImageSize();
      
      if (imgSize.width > 0 && imgSize.height > 0 && box.width > 0 && box.height > 0) {
        const rx = box.width / imgSize.width;
        const ry = box.height / imgSize.height;
        const ox = box.x / imgSize.width;
        const oy = 1 - (box.y + box.height) / imgSize.height;

        if (isFinite(rx) && isFinite(ry) && isFinite(ox) && isFinite(oy)) {
          $texture.repeat.set(rx, ry);
          $texture.offset.set(ox, oy);
          $texture.needsUpdate = true;
        }
      }
    }
  }

  onMount(() => {
    vrStrollComponent = {
      tick,
      handleExitVR
    };

    sceneLoaded = true;

    const aspect = window.innerWidth / window.innerHeight;
    planeWidth = 4;
    planeHeight = 4 / aspect;
  });

  onDestroy(() => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
  });
</script>

<div class="vr-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;">
{#if sceneLoaded}
  <Canvas>
    <XR>
      <!-- Ambient/Background setup -->
      <T.Color attach="background" args={['#aaaaaa']} />

      <!-- Camera container fixed at head height, looking forward -->
      <T.PerspectiveCamera position={[0, 1.6, 0]} makeDefault>
        <!-- Plane positioned relative to camera view -->
        <T.Mesh position={[0, 0, -2]} bind:ref={planeMesh}>
          <T.PlaneGeometry args={[planeWidth, planeHeight]} />
          {#if $texture}
            <T.MeshBasicMaterial map={$texture} side={THREE.DoubleSide} />
          {/if}
        </T.Mesh>
      </T.PerspectiveCamera>
    </XR>
  </Canvas>
{/if}
</div>
