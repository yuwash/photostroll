<script>
  import { base } from '$app/paths';
  import { RandomDirectionStroll } from './randomDirectionStroll.ts';
  import { HorizontalSweepStroll } from './horizontalSweepStroll.ts';
  import { strollPatterns } from './patterns.ts';

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
  export let strollPattern; // This is now the writable store

  export let canExplore; // This is now the writable store
  export let isPhotoLoaded; // Track if the file is user-provided
  export let strollInstance; // NEW: Accept strollInstance as a prop

  $: {
    if ($imageSrc && $photoOriginalDimensions && $strollPattern) {
      // Instantiate Stroll object here
      // Initial viewport size is 0,0; StrollComponent will update it once mounted
      if ($strollPattern === 'Random Direction') {
        strollInstance = new RandomDirectionStroll(
          { width: window.innerWidth, height: window.innerHeight }, // Placeholder viewport size
          { width: $photoOriginalDimensions.width, height: $photoOriginalDimensions.height },
          $zoomLevel, // Use current value of zoomLevel store
          $speedLevel  // Use current value of speedLevel store
        );
      } else if ($strollPattern === 'Horizontal Sweep') {
        strollInstance = new HorizontalSweepStroll(
          { width: window.innerWidth, height: window.innerHeight }, // Placeholder viewport size
          { width: $photoOriginalDimensions.width, height: $photoOriginalDimensions.height },
          $zoomLevel, // Use current value of zoomLevel store
          $speedLevel  // Use current value of speedLevel store
        );
      }
    }
  }

  let animationFrameId; // ID for requestAnimationFrame
  let lastTickTime; // Timestamp of the last animation frame

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
  position: absolute;
  border: 1px solid red;
  box-sizing: border-box; /* Ensure border is included in width/height */
  pointer-events: none; /* Make sure it doesn't interfere with clicks */
  z-index: 10; /* Ensure it's above the image */
}
.preview-container {
  position: relative;
  display: inline-block;
  overflow: hidden;
}
</style>

<div class="columns is-centered">
  <div class="column is-12-mobile is-8-tablet is-6-desktop">
    <div class="card">
      <header class="card-header">
        <h1 class="card-header-title is-centered is-size-1">Photostroll</h1>
      </header>

      <div class="card-content columns is-centered">
        <div class="preview-container">
          {#if $imageSrc && $photoOriginalDimensions}
            <img
              src={$imageSrc}
              alt="Selected photo thumbnail"
              style="width: {thumbImgWidth}px; height: {thumbImgHeight}px; position: relative;"
              data-ai-hint="abstract photo"
            />
          {/if}
          {#if $imageSrc && $photoOriginalDimensions && viewportRect.width > 0}
            <div
              class="viewport-rect"
              aria-hidden="true"
              style="left: {viewportRect.x}px; top: {viewportRect.y}px; width: {viewportRect.width}px; height: {viewportRect.height}px;"
            ></div>
          {/if}
        </div>
      </div>

      <div class="card-content">
        <label for="zoom-slider" class="is-flex is-align-items-center mb-1">
          <span class="mr-1">🔎</span> Zoom Level: {$zoomLevel}x
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

      <div class="card-content">
        <label for="speed-slider" class="is-flex is-align-items-center mb-1">
          <span class="mr-1">⚡</span> Speed: {$speedLevel} (screen widths/sec)
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

      <div class="card-content">
        <label for="stroll-pattern" class="is-flex is-align-items-center mb-1">
          <span class="mr-1">🚶</span> Stroll Pattern
        </label>
        <div class="select">
          <select
            id="stroll-pattern"
            bind:value={$strollPattern}
            aria-label="Stroll pattern"
          >
            {#each strollPatterns as pattern}
              <option value={pattern}>{pattern}</option>
            {/each}
          </select>
        </div>
      </div>

      <div class="card-content">
        <div class="buttons has-addons">
          <button
            on:click={() => fileInputRef.click()}
            class={["button", ...($isPhotoLoaded ? [] : ["is-primary"])]}
            aria-label={$isPhotoLoaded ? "Change photo" : "Choose photo"}
          >
            <span class="mr-1">📸</span>
            {$isPhotoLoaded ? "Change Photo" : "Choose Photo"}
          </button>
          <button
            on:click={handleExploreInternal}
            class="button"
            aria-label="Explore photo"
            disabled={!$canExplore}
          >
            <span class="mr-1">▶</span> Explore
          </button>
        </div>
      </div>
      <input
        type="file"
        bind:this={fileInputRef}
        on:change={handleFileChangeInternal}
        accept="image/*"
        class="is-hidden"
      />
    </div>
  </div>
</div>
