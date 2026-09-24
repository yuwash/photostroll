<script lang="ts">
  import { Canvas } from '@threlte/core';
  import VRScene from './VRScene.svelte';
  import type { Readable } from 'svelte/store';

  export let imageSrc: Readable<string | null>;
  export let strollInstance: any;
</script>

<div class="vr-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;">
  <Canvas>
    <VRScene {imageSrc} {strollInstance} />
  </Canvas>
</div>
