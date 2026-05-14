<script lang="ts">
  import { onMount, onDestroy, tick as svelteTick } from 'svelte';
  import type { Writable } from 'svelte/store';
  import type { Stroll } from './stroll';

  export let imageSrc: Writable<string | null>;
  export let photoOriginalDimensions: any;
  export let zoomLevel: any;
  export let speedLevel: any;
  export let strollInstance: Stroll;
  export let onExit: () => void;
  export let vrStrollComponent: any;

  let sceneEl: any;
  let planeEl: any;
  let planeWidth = 4;
  let planeHeight = 2.25;
  let animationFrameId: number | null;

  function tick(currentTime: number) {
    if (sceneEl && strollInstance) {
      const box = strollInstance.getViewportInOriginalImageScale();
      const imgSize = strollInstance.getOriginalImageSize();
      
      if (imgSize.width > 0 && imgSize.height > 0 && box.width > 0 && box.height > 0) {
        const rx = box.width / imgSize.width;
        const ry = box.height / imgSize.height;
        const ox = box.x / imgSize.width;
        const oy = 1 - (box.y + box.height) / imgSize.height;

        // Check for valid numbers to prevent A-Frame errors
        if (isFinite(rx) && isFinite(ry) && isFinite(ox) && isFinite(oy)) {
          const plane = planeEl || sceneEl.querySelector('#vr-plane');
          if (plane) {
            planeEl = plane;
            // Update material properties individually to avoid full material re-parse
            plane.setAttribute('material', 'repeat', { x: rx, y: ry });
            plane.setAttribute('material', 'offset', { x: ox, y: oy });
          }
        }
      }
    }
  }

  function enterVR() {
    // Calculate plane dimensions based on aspect ratio
    const aspect = window.innerWidth / window.innerHeight;
    planeWidth = 4;
    planeHeight = 4 / aspect;
    
    // Wait for the scene to be in the DOM and A-Frame to be ready
    svelteTick().then(() => {
      if (sceneEl) {
        const enterVRMode = () => {
          if (sceneEl.enterVR) {
            sceneEl.enterVR();
          }
        };

        if (sceneEl.hasLoaded) {
          enterVRMode();
        } else {
          sceneEl.addEventListener('loaded', enterVRMode, { once: true });
        }
      }
    });
  }

  function handleExitVR() {
    if (onExit) {
      onExit();
    }
  }

  onMount(() => {
    // Set the component reference for parent access
    vrStrollComponent = {
      tick,
      enterVR,
      handleExitVR
    };

    // Update plane dimensions on mount
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

<div class="vr-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 2000;">
  <a-scene 
    bind:this={sceneEl} 
    on:exit-vr={handleExitVR}
    vr-mode-ui="enabled: true"
    embedded
  >
    <!-- Fixed camera to ignore user movement/looking if requested, 
          but usually in VR you want to look at the plane. 
          Setting look-controls to false as per "ignoring movement of the user" 
    -->
    <a-entity 
      camera 
      look-controls="enabled: false" 
      wasd-controls="enabled: false" 
      position="0 1.6 0"
    >
      <a-plane
        id="vr-plane"
        position="0 0 -2"
        width={planeWidth}
        height={planeHeight}
        material="shader: flat; side: double; color: #fff; src: {$imageSrc}"
      ></a-plane>
    </a-entity>
    
    <a-sky color="#aaa"></a-sky>
  </a-scene>
</div>
