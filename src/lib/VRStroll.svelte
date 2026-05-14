<script>
  import { onMount, onDestroy, tick as svelteTick } from 'svelte';
  import { writable } from 'svelte/store';

  export let imageSrc;
  export let photoOriginalDimensions;
  export let zoomLevel;
  export let speedLevel;
  export let strollInstance;
  export let onExit;
  export let vrStrollComponent;

  let sceneEl;
  let planeWidth = 4;
  let planeHeight = 2.25;
  let animationFrameId;

  function tick(currentTime) {
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
          const plane = sceneEl.querySelector('#vr-plane');
          if (plane) {
            plane.setAttribute('material', {
              src: '#vr-photo',
              repeat: { x: rx, y: ry },
              offset: { x: ox, y: oy },
              shader: 'flat',
              side: 'double'
            });
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
    
    // Wait for the scene to be in the DOM
    svelteTick().then(() => {
      if (sceneEl) {
        // Try to enter VR mode if the browser supports it
        if (sceneEl.enterVR) {
          sceneEl.enterVR();
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
  >
    <a-assets>
      <img id="vr-photo" src={$imageSrc} alt="VR source" crossorigin="anonymous" />
    </a-assets>
    
    <!-- Fixed camera to ignore user movement/looking if requested, 
          but usually in VR you want to look at the plane. 
          Setting look-controls to false as per "ignoring movement of the user" 
    -->
    <a-entity 
      camera 
      look-controls="enabled: false" 
      wasd-controls="enabled: false" 
      position="0 1.6 0"
    ></a-entity>
    
    <a-plane
      id="vr-plane"
      position="0 1.6 -2"
      width={planeWidth}
      height={planeHeight}
      material="shader: flat; side: double; color: #fff"
    ></a-plane>
    
    <a-sky color="#000"></a-sky>
  </a-scene>
</div>
