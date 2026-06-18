<script>
  import { onMount, onDestroy, tick as svelteTick } from 'svelte';
  import { writable } from 'svelte/store';
  import VRStroll from './VRStroll.svelte';

  // Exported props are Svelte stores
  export let imageSrc; // writable store for image data URL
  export let photoOriginalDimensions; // writable store for original image dimensions {width, height}
  export let zoomLevel; // writable store for zoom level
  export let speedLevel; // writable store for speed level
  export let onExit; // Callback function to trigger exit from stroll mode
  export let strollInstance; // NEW: Stroll instance is now passed as a prop

  let strollContainer; // Reference to the div element that acts as the viewport
  let animationFrameId; // ID for requestAnimationFrame
  let lastTickTime; // Timestamp of the last animation frame

  // Internal reactive state for the Stroll component
  // These are derived from the container's actual size
  const viewportSize = writable({ width: 0, height: 0 });
  // This store holds the current position and size of the image as calculated by the Stroll class
  const currentBoundingBox = writable({ x: 0, y: 0, width: 0, height: 0 });
  const imageOffset = writable({ x: 0, y: 0 });

  // Dropdown state
  let isDropdownOpen = false;
  let isVRMode = false;
  let vrStrollComponent;

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
  function tick(currentTime) {
    if (!lastTickTime) {
      lastTickTime = currentTime; // Initialize lastTickTime on the first frame
    }
    const deltaTimeInSeconds = (currentTime - lastTickTime) / 1000; // Convert milliseconds to seconds
    lastTickTime = currentTime; // Update for the next frame

    if (strollInstance) { // Ensure strollInstance exists before calling tick
      strollInstance.tick(deltaTimeInSeconds); // Advance the image position
      currentBoundingBox.set(strollInstance.getBoundingBox()); // Get the new bounding box

      if (isVRMode && vrStrollComponent) {
        vrStrollComponent.tick(currentTime);
      }
    }

    animationFrameId = requestAnimationFrame(tick); // Request the next frame
  }

  /**
   * Calls the onExit callback prop to signal the parent component to exit stroll mode.
   */
  function handleExit() {
    isVRMode = false;
    if (onExit) {
      onExit();
    }
  }

  /**
   * Handles keyboard events, specifically the 'Escape' key to exit stroll mode.
   * @param {KeyboardEvent} event - The keyboard event object.
   */
  function handleKeyDown(event) {
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
   * Toggles VR mode.
   */
  async function toggleVR() {
    isVRMode = !isVRMode;
    closeDropdown();
    
    if (isVRMode) {
      // Create VRStroll component when entering VR mode
      if (typeof window !== 'undefined') {
        // Wait for the next tick to ensure DOM is ready
        await svelteTick();
        
        // Call enterVR on the VRStroll component
        if (vrStrollComponent && vrStrollComponent.enterVR) {
          vrStrollComponent.enterVR();
        }
      }
    } else {
      // Exit VR mode
      if (vrStrollComponent && vrStrollComponent.handleExitVR) {
        vrStrollComponent.handleExitVR();
      }
    }
  }

  function handleExitVR() {
    isVRMode = false;
  }

  // Lifecycle hook: runs when the component is first mounted to the DOM
  onMount(async () => {
    updateViewportSize(); // Get initial viewport dimensions
    window.addEventListener('resize', updateViewportSize); // Listen for window resize events
    window.addEventListener('keydown', handleKeyDown); // Listen for keyboard events

    // Close dropdown when clicking outside
    document.addEventListener('click', (event) => {
      const dropdown = document.querySelector('.dropdown');
      if (dropdown && !dropdown.contains(event.target)) {
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
    cancelAnimationFrame(animationFrameId); // Stop the animation loop
    animationFrameId = null; // Clear the ID
    window.removeEventListener('resize', updateViewportSize); // Clean up resize listener
    window.removeEventListener('keydown', handleKeyDown); // Clean up keyboard listener
  });

  /**
   * Reactive statement to update the Stroll instance settings
   * whenever relevant props or the viewport size change.
   * This also manages starting/stopping the animation loop.
   */
  $: {
    if (strollInstance && $viewportSize) {
      // Only update if all necessary data is available
      if ($photoOriginalDimensions && $viewportSize.width > 0 && $viewportSize.height > 0) {
        strollInstance.updateSettings(
          $viewportSize,
          $zoomLevel,
          $speedLevel,
          $photoOriginalDimensions
        );
        // Immediately update the bounding box after settings change to reflect new state
        currentBoundingBox.set(strollInstance.getBoundingBox());
        imageOffset.set({
          x: $currentBoundingBox.x,
          y: $currentBoundingBox.y,
        });
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

  .stroll-image {
    position: absolute; /* Positioned relative to the stroll-container */
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
    {#if !isVRMode}
      <img
        src={$imageSrc}
        alt="Strolling photo"
        class="stroll-image"
        style="
          width: {$currentBoundingBox.width}px;
          height: {$currentBoundingBox.height}px;
          max-width: initial;
          transform: translate({$imageOffset.x}px, {$imageOffset.y}px);
        "
      />
    {/if}
  {:else}
    <p style="color: white; font-size: 1.5rem;">No image loaded for strolling.</p>
  {/if}

  {#if isVRMode}
    <svelte:component this={VRStroll} 
      imageSrc={imageSrc}
      photoOriginalDimensions={photoOriginalDimensions}
      zoomLevel={zoomLevel}
      speedLevel={speedLevel}
      bind:strollInstance={strollInstance}
      onExit={handleExitVR}
      bind:vrStrollComponent={vrStrollComponent}
    />
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
          <button class="dropdown-item button" on:click={toggleVR}>
            {isVRMode ? 'Exit VR' : 'Enter VR'}
          </button>
        </div>
      </div>
    </div>
  </div>
</div>
