<script>
  // Use specific imports for jQuery and Foundation for better tree-shaking and consistency
  import 'foundation-sites/dist/css/foundation.min.css';
  // Foundation needs to be initialized after the DOM is ready
  // and jQuery is available.

  import { base } from '$app/paths';
  import { writable } from 'svelte/store';
  import { onMount, onDestroy } from 'svelte';
  import ConfigModal from '../lib/ConfigModal.svelte';
  import StrollComponent from '../lib/Stroll.svelte';
  import { RandomDirectionStroll } from '../lib/randomDirectionStroll.ts';
  import { HorizontalSweepStroll } from '../lib/horizontalSweepStroll.ts';
  import { strollPatterns } from '../lib/patterns.ts';

  // Define writable stores for the application's state
  const placeholderUrl = base + "/placeholder.svg";
  const imageSrc = writable(null);
  const photoOriginalDimensions = writable({ width: 150, height: 150 });
  const zoomLevel = writable(1.5);
  const speedLevel = writable(0.1);
  const canExplore = writable(false);
  const isExploring = writable(false);
  const strollPattern = writable(strollPatterns[0]);

  // Variable to hold the Stroll instance
  let strollInstance;

  // Function to handle file input change
  const handleFileChange = (event) => loadFile(event.target.files[0]);

  const loadFile = (file) => {
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        imageSrc.set(e.target.result);
        const img = new Image();
        img.onload = () => {
          photoOriginalDimensions.set({ width: img.width, height: img.height });
          canExplore.set(true); // Enable explore once photo is loaded

          // Instantiate Stroll object here
          // Initial viewport size is 0,0; StrollComponent will update it once mounted
          if ($strollPattern === 'Random Direction') {
            strollInstance = new RandomDirectionStroll(
              { width: 0, height: 0 }, // Placeholder viewport size
              { width: img.width, height: img.height },
              $zoomLevel, // Use current value of zoomLevel store
              $speedLevel  // Use current value of speedLevel store
            );
          } else if ($strollPattern === 'Horizontal Sweep') {
            strollInstance = new HorizontalSweepStroll(
              { width: 0, height: 0 }, // Placeholder viewport size
              { width: img.width, height: img.height },
              $zoomLevel, // Use current value of zoomLevel store
              $speedLevel  // Use current value of speedLevel store
            );
          }
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    } else {
      imageSrc.set(null);
      photoOriginalDimensions.set(null);
      canExplore.set(false);
      strollInstance = null; // Clear stroll instance when no file is selected
    }
  };

  // Function to handle explore button click
  const handleExplore = () => {
    if ($canExplore && strollInstance) {
      isExploring.set(true);
      // Request fullscreen when entering explore mode
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(err => {
          console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
        });
      }
    }
  };

  // Function to handle exiting stroll mode
  const handleExitStroll = () => {
    isExploring.set(false);
    // Exit fullscreen when exiting explore mode
    if (document.exitFullscreen) {
      document.exitFullscreen().catch(err => {
        console.error(`Error attempting to exit full-screen mode: ${err.message} (${err.name})`);
      });
    }
  };

  // Function to handle fullscreen change events
  function handleFullscreenChange() {
    // Update isExploring based on whether an element is currently in fullscreen mode
    isExploring.set(!!document.fullscreenElement);
  }

  // Lifecycle hooks for fullscreen event listener
  onMount(() => {
    if (typeof window !== 'undefined') {
      document.addEventListener('fullscreenchange', handleFullscreenChange);
      document.addEventListener('webkitfullscreenchange', handleFullscreenChange); // For Safari
      document.addEventListener('mozfullscreenchange', handleFullscreenChange);    // For Firefox
      document.addEventListener('MSFullscreenChange', handleFullscreenChange);     // For IE/Edge

      if (placeholderUrl) {
        fetch(placeholderUrl)
          .then(response => response.blob())
          .then(blob => {
            const file = new File([blob], "placeholder.svg", { type: "image/svg+xml" });
            loadFile(file);
          })
          .catch(error => console.error("Error loading placeholder image:", error));
      }
    }
  });

  onDestroy(() => {
    if (typeof window !== 'undefined') {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    }
  });
</script>

{#if $isExploring}
  <!-- Render StrollComponent when isExploring is true -->
  <StrollComponent
    imageSrc={imageSrc}
    photoOriginalDimensions={photoOriginalDimensions}
    zoomLevel={zoomLevel}
    speedLevel={speedLevel}
    onExit={handleExitStroll}
    strollInstance={strollInstance}
  />
{:else}
  <!-- Render ConfigModal when isExploring is false -->
  <ConfigModal
    imageSrc={imageSrc}
    photoOriginalDimensions={photoOriginalDimensions}
    zoomLevel={zoomLevel}
    speedLevel={speedLevel}
    canExplore={canExplore}
    handleExplore={handleExplore}
    handleFileChange={handleFileChange}
    strollInstance={strollInstance}
    strollPattern={strollPattern}
  />
{/if}
