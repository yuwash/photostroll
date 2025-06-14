<script>
  import { base } from '$app/paths';
  let fileInputRef;
  let thumbImgWidth = 150;
  let thumbImgHeight = 150;
  let viewportRect = { x: 0, y: 0, width: 0, height: 0 };

  // Exported props are now the Svelte store objects themselves
  export let handleExplore;
  export let handleFileChange;
  export let imageSrc; // This is now the writable store
  export let photoOriginalDimensions; // This is now the writable store
  export let zoomLevel; // This is now the writable store
  export let speedLevel; // This is now the writable store
  export let canExplore; // This is now the writable store
  export let strollInstance; // NEW: Accept strollInstance as a prop

  let animationFrameId; // ID for requestAnimationFrame
  let lastTickTime; // Timestamp of the last animation frame

  // Derive isPhotoLoaded from the imageSrc store
  // The '$' prefix here correctly auto-subscribes to the imageSrc store prop
  $: isPhotoLoaded = $imageSrc && $imageSrc.length > 0;

  export const MIN_ZOOM = 1.5;
  export const MAX_ZOOM = 12;
  export const MIN_SPEED = 0.05;
  export const MAX_SPEED = 0.4;

  const handleFileChangeInternal = (event) => {
    if(handleFileChange) {
      handleFileChange(event);
    }
  }

  const handleExploreInternal = (event) => {
    if(handleExplore) {
      handleExplore(event);
    }
  }

  /**
   * The main animation loop function for the preview rectangle.
   * It calculates the delta time, updates the Stroll instance, and updates the viewportRect.
   * @param {DOMHighResTimeStamp} currentTime - The current time provided by requestAnimationFrame.
   */
  function tick(currentTime) {
    if (!lastTickTime) {
      lastTickTime = currentTime; // Initialize lastTickTime on the first frame
    }
    const deltaTimeInSeconds = (currentTime - lastTickTime) / 1000; // Convert milliseconds to seconds
    lastTickTime = currentTime; // Update for the next frame

    if ($imageSrc && 0 < $photoOriginalDimensions.width && 0 < $photoOriginalDimensions.height && strollInstance) {
      strollInstance.tick(deltaTimeInSeconds);
      // Use current window dimensions as the hypothetical viewport for preview calculation.
      // This simulates the full-screen environment for the Stroll instance.
      const strollViewportSize = {
        width: window.innerWidth,
        height: window.innerHeight
      };

      // Temporarily update the strollInstance with current modal settings and hypothetical viewport.
      // This will affect the strollInstance's internal state, but it will be corrected
      // when StrollComponent mounts and calls updateSettings with its actual dimensions.
      strollInstance.updateSettings(
        strollViewportSize,
        $zoomLevel,
        $speedLevel,
        $photoOriginalDimensions
      );

      const viewportBox = strollInstance.getViewportInOriginalImageScale();
      const scaleFactor = thumbImgWidth / $photoOriginalDimensions.width;
      viewportRect = {
        x: viewportBox.x * scaleFactor,
        y: viewportBox.y * scaleFactor,
        width: viewportBox.width * scaleFactor,
        height: viewportBox.height * scaleFactor
      };
      thumbImgHeight = $photoOriginalDimensions.height * scaleFactor;
    } else {
      viewportRect = { x: 0, y: 0, width: 0, height: 0 };
    }

    animationFrameId = requestAnimationFrame(tick); // Request the next frame
  }

  $: {
    if ($imageSrc && $photoOriginalDimensions && strollInstance) {
      // Start animation
      if (!animationFrameId) {
        animationFrameId = requestAnimationFrame(tick);
      }
    } else {
      // Stop animation
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      viewportRect = { x: 0, y: 0, width: 0, height: 0 };
    }
  }
</script>

<style>
.width-100 {
  /* Although this is a foundation class, somehow it doesn’t work without this. */
  width: 100%;
}
.viewport-rect {
  position: relative;
  border: 1px solid red;
  boxSizing: border-box; /* Ensure border is included in width/height */
  pointerEvents: none; /* Make sure it doesn't interfere with clicks */
  zIndex: 10; /* Ensure it's above the image */
}
</style>

<div class="grid-x align-center">
  <div class="cell small-12 medium-8 large-6">
    <div class="card">
      <div class="card-divider">
        <h1 class="text-center">Photostroll</h1>
      </div>
      
      <div class="card-section grid-x align-center">
        <div
          class="thumbnail"
        >
          {#if $imageSrc && $photoOriginalDimensions}
            <img
              src={$imageSrc}
              alt="Selected photo thumbnail"
              style="width: {thumbImgWidth}px; height: {thumbImgHeight}px; overflow: hidden; position: relative;"
              data-ai-hint="abstract photo"
            />
          {/if}
          {#if $imageSrc && $photoOriginalDimensions && viewportRect.width > 0}
            <div
              class="viewport-rect"
              aria-hidden="true"
              style="left: {viewportRect.x}px; top: {viewportRect.y}px; width: {viewportRect.width}px; height: {viewportRect.height}px; transform: translateY({-thumbImgHeight}px); margin-bottom: -{viewportRect.height}px;"
            />
          {/if}
        </div>
      </div>

      <div class="card-section">
        <label for="zoom-slider" class="flex-container align-middle margin-bottom-1">
          <span class="margin-right-1">🔎</span> Zoom Level: {$zoomLevel}x
        </label>
        <input
          type="range"
          id="zoom-slider"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={0.5}
          bind:value={$zoomLevel}
          class="width-100"
          on:input={(e) => zoomLevel.set(parseFloat(e.target.value))}
          aria-label={`Zoom level ${$zoomLevel}x`}
        />
      </div>

      <div class="card-section">
        <label for="speed-slider" class="flex-container align-middle margin-bottom-1">
          <span class="margin-right-1">⚡</span> Speed: {$speedLevel} (screen widths/sec)
        </label>
        <input
          type="range"
          id="speed-slider"
          min={MIN_SPEED}
          max={MAX_SPEED}
          step={0.05}
          bind:value={$speedLevel}
          class="width-100"
          on:input={(e) => speedLevel.set(parseFloat(e.target.value))}
          aria-label={`Movement speed ${$speedLevel.toFixed(1)} screen widths per second`}
        />
      </div>

      <div class="card-section">
        <div class="button-group expanded">
          <button
            on:click={() => fileInputRef.click()}
            class={['button', ...(isPhotoLoaded ? ['hollow'] : [])]}
            aria-label={isPhotoLoaded ? "Change photo" : "Choose photo"}
          >
            <span class="margin-right-1">📸</span> {isPhotoLoaded ? "Change Photo" : "Choose Photo"}
          </button>
          <button
            on:click={handleExploreInternal}
            class="button"
            aria-label="Explore photo"
            disabled={!$canExplore}
          >
            <span class="margin-right-1">▶</span> Explore
          </button>
        </div>
      </div>
      <input
        type="file"
        bind:this={fileInputRef}
        on:change={handleFileChangeInternal}
        accept="image/*"
        class="hide"
      />
    </div>
  </div>
</div>
