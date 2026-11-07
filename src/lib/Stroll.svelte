<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { writable, type Writable } from 'svelte/store';

  // Exported props are Svelte stores
  export let imageSrc: Writable<string | null>;
  export let photoOriginalDimensions: Writable<{ width: number; height: number }>;
  export let zoomLevel: Writable<number>;
  export let speedLevel: Writable<number>;
  export let cardboardOverlapRatio: Writable<number> = writable(0);
  export let onExit: (() => void) | undefined = undefined;
  export let strollInstance: any;

  let strollContainer: HTMLElement | null = null;
  let animationFrameId: number | null = null;
  let lastTickTime: number | null = null;

  // Internal reactive state for the Stroll component
  const viewportSize = writable<{ width: number; height: number }>({ width: 0, height: 0 });
  const currentBoundingBox = writable<{ x: number; y: number; width: number; height: number }>({ x: 0, y: 0, width: 0, height: 0 });

  // Cardboard mode state
  let isCardboardMode = false;

  // Dropdown state
  let isDropdownOpen = false;

  /**
   * Updates the internal viewportSize store based on the actual dimensions of the strollContainer.
   * This function is called on mount and whenever the window is resized.
   */
  function updateViewportSize() {
    if (strollContainer) {
      viewportSize.set({
        width: strollContainer.clientWidth,
        height: strollContainer.clientHeight,
      });
    }
  }

  /**
   * The main animation loop function.
   * It calculates the delta time, updates the Stroll instance, and requests the next frame.
   * @param {DOMHighResTimeStamp} currentTime - The current time provided by requestAnimationFrame.
   */
  function tick(currentTime: number) {
    if (!lastTickTime) {
      lastTickTime = currentTime; // Initialize lastTickTime on the first frame
    }
    const deltaTimeInSeconds = (currentTime - lastTickTime) / 1000; // Convert milliseconds to seconds
    lastTickTime = currentTime; // Update for the next frame

    if (strollInstance) { // Ensure strollInstance exists before calling tick
      strollInstance.tick(deltaTimeInSeconds); // Advance the image position
      currentBoundingBox.set(strollInstance.getBoundingBox()); // Get the new bounding box
    }

    animationFrameId = requestAnimationFrame(tick); // Request the next frame
  }

  /**
   * Calls the onExit callback prop to signal the parent component to exit stroll mode.
   */
  function handleExit() {
    if (onExit) {
      onExit();
    }
  }

  /**
   * Handles keyboard events, specifically the 'Escape' key to exit stroll mode.
   * @param {KeyboardEvent} event - The keyboard event object.
   */
  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      handleExit();
    }
  }

  /**
   * Toggles the dropdown menu open/closed state.
   */
  function toggleDropdown() {
    isDropdownOpen = !isDropdownOpen;
  }

  /**
   * Closes the dropdown menu.
   */
  function closeDropdown() {
    isDropdownOpen = false;
  }

  /**
   * Toggles Cardboard mode.
   */
  function toggleCardboardMode() {
    isCardboardMode = !isCardboardMode;
    closeDropdown();
  }

  // Lifecycle hook: runs when the component is first mounted to the DOM
  onMount(async () => {
    updateViewportSize(); // Get initial viewport dimensions
    window.addEventListener('resize', updateViewportSize); // Listen for window resize events
    window.addEventListener('keydown', handleKeyDown); // Listen for keyboard events

    // Close dropdown when clicking outside
    document.addEventListener('click', (event: MouseEvent) => {
      const dropdown = document.querySelector('.dropdown');
      if (dropdown && event.target instanceof Node && !dropdown.contains(event.target)) {
        closeDropdown();
      }
    });

    // If strollInstance is already available on mount, start the animation loop
    if (strollInstance) {
      animationFrameId = requestAnimationFrame(tick);
    }
  });

  // Lifecycle hook: runs when the component is destroyed
  onDestroy(() => {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId); // Stop the animation loop
      animationFrameId = null; // Clear the ID
    }
    window.removeEventListener('resize', updateViewportSize); // Clean up resize listener
    window.removeEventListener('keydown', handleKeyDown); // Clean up keyboard listener
  });

  /**
   * Reactive statement to update the Stroll instance settings
   * whenever relevant props or the viewport size change.
   * This also manages starting/stopping the animation loop.
   */
  // Compute effective virtual viewport dimensions for strollInstance.
  // In normal mode: virtual viewport is full screen (viewportSize.width, viewportSize.height).
  // In cardboard mode: each eye has width viewportSize.width / 2.
  // With overlap ratio r between 0 and 1:
  // At r = 0 (no overlap): virtual moving window width is full screen width (2 * eyeWidth).
  // At r = 1 (100% overlap, same area shown twice): virtual moving window width is single eye width (1 * eyeWidth).
  // In general: effectiveVirtualWidth = eyeWidth * (2 - r) = viewportSize.width * (1 - r / 2).
  $: effectiveVirtualViewport = {
    width: isCardboardMode
      ? $viewportSize.width * (1 - ($cardboardOverlapRatio ?? 0) / 2)
      : $viewportSize.width,
    height: $viewportSize.height
  };

  $: rightEyeOffsetShift = isCardboardMode
    ? ($viewportSize.width / 2) * (1 - ($cardboardOverlapRatio ?? 0))
    : 0;

  $: {
    if (strollInstance && effectiveVirtualViewport) {
      // Only update if all necessary data is available
      if ($photoOriginalDimensions && effectiveVirtualViewport.width > 0 && effectiveVirtualViewport.height > 0) {
        strollInstance.updateSettings(
          effectiveVirtualViewport,
          $zoomLevel,
          $speedLevel,
          $photoOriginalDimensions
        );
        // Immediately update the bounding box after settings change to reflect new state
        currentBoundingBox.set(strollInstance.getBoundingBox());
      }

      // Start animation if not already running and strollInstance is present
      if (!animationFrameId) {
        animationFrameId = requestAnimationFrame(tick);
      }
    } else {
      // If strollInstance becomes null (e.g., image cleared), stop animation
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      // Reset bounding box when no stroll instance is active
      currentBoundingBox.set({ x: 0, y: 0, width: 0, height: 0 });
    }
  }
</script>

<style>
  :global(html.a-fullscreen .stroll-container) {
    background-color: transparent !important;
  }

  .stroll-container {
    position: fixed; /* Position fixed to cover the entire viewport */
    top: 0;
    left: 0;
    width: 100vw; /* Full viewport width */
    height: 100vh; /* Full viewport height */
    overflow: hidden; /* Crucial to hide parts of the image outside the viewport */
    background-color: black; /* Default background color */
  }

  .cardboard-container {
    display: flex;
    flex-direction: row;
    width: 100%;
    height: 100%;
    position: absolute;
    top: 0;
    left: 0;
  }

  .cardboard-eye {
    flex: 1;
    height: 100%;
    position: relative;
    overflow: hidden;
  }

  .cardboard-divider {
    position: absolute;
    left: 50%;
    top: 0;
    width: 2px;
    height: 100%;
    background-color: #000;
    transform: translateX(-50%);
    z-index: 10;
  }

  .stroll-image {
    position: absolute; /* Positioned relative to the stroll-container or cardboard-eye */
    left: 0;
    top: 0;
    /* The transform property will be dynamically set via the style attribute */
    will-change: transform; /* Hint to the browser for performance optimization */
    image-rendering: optimize-quality; /* Adjust as needed: auto, crisp-edges, pixelated */
  }

  .control-bar {
    position: absolute;
    top: 1rem;
    right: 1rem;
    z-index: 1000; /* Ensure it's above the image */
  }

  .control-bar .is-outlined {
    transition: background-color 0.2s ease;
  }

  .control-bar .is-outlined:hover {
    background-color: white;
  }
</style>

<div class="stroll-container" bind:this={strollContainer}>
  {#if $imageSrc}
    {#if isCardboardMode}
      <div class="cardboard-container">
        <!-- Left eye: shows left portion [0, W/2] of the virtual moving window -->
        <div class="cardboard-eye left-eye">
          <img
            src={$imageSrc}
            alt="Strolling photo left view"
            class="stroll-image"
            style="
              width: {$currentBoundingBox.width}px;
              height: {$currentBoundingBox.height}px;
              max-width: initial;
              transform: translate({$currentBoundingBox.x}px, {$currentBoundingBox.y}px);
            "
          />
        </div>
        <!-- Center divider line -->
        <div class="cardboard-divider"></div>
        <!-- Right eye: shows right portion of the virtual moving window shifted according to overlap ratio -->
        <div class="cardboard-eye right-eye">
          <img
            src={$imageSrc}
            alt="Strolling photo right view"
            class="stroll-image"
            style="
              width: {$currentBoundingBox.width}px;
              height: {$currentBoundingBox.height}px;
              max-width: initial;
              transform: translate({$currentBoundingBox.x - rightEyeOffsetShift}px, {$currentBoundingBox.y}px);
            "
          />
        </div>
      </div>
    {:else}
      <img
        src={$imageSrc}
        alt="Strolling photo"
        class="stroll-image"
        style="
          width: {$currentBoundingBox.width}px;
          height: {$currentBoundingBox.height}px;
          max-width: initial;
          transform: translate({$currentBoundingBox.x}px, {$currentBoundingBox.y}px);
        "
      />
    {/if}
  {:else}
    <p style="color: white; font-size: 1.5rem;">No image loaded for strolling.</p>
  {/if}

  <div class="control-bar buttons">
    <button class="exit-button button is-outlined" on:click={handleExit}
      >Exit (Esc)</button
    >
    <div class="dropdown is-right" class:is-active={isDropdownOpen}>
      <div class="dropdown-trigger">
        <button class="button is-outlined" aria-haspopup="true" aria-controls="control-dropdown-menu" title="More options" aria-label="More options" on:click={toggleDropdown}>
          <span class="icon is-small">
            <span class="mr-1">┇</span>
          </span>
        </button>
      </div>
      <div class="dropdown-menu" id="control-dropdown-menu" role="menu">
        <div class="dropdown-content">
          <button
            class="dropdown-item button"
            class:is-active={isCardboardMode}
            on:click={toggleCardboardMode}
          >
            {isCardboardMode ? 'Exit cardboard mode' : 'Cardboard mode'}
          </button>
        </div>
      </div>
    </div>
  </div>
</div>
