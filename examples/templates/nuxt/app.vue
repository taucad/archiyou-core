<script setup lang="ts">

import { onMounted, onUnmounted, ref } from 'vue'

import { Brep, init } from '../../../src/internal';

const ocLoaded = ref(false);
const gltfSourceUrl = ref<string | null>(null);
let blobUrl: string | null = null;

// Cleanup blob URL on unmount
onUnmounted(() => {
  if (blobUrl) {
    URL.revokeObjectURL(blobUrl);
  }
});

onMounted(async () => 
{
  console.log('**** Archiyou app mounted: Loading WASM ****')

  const ay = await init();
  ocLoaded.value = !!ay;
  
  // Now make some shapes
  const t0 = performance.now();

  const brep = new Brep();
  const box = brep.Box(10,10,10);

  const myModel = box.subtract(
                      brep.Sphere(5).move(5,5,5).hide()
                    )
                    .subtract(
                      brep.Cylinder(5,15).move(-5,-5,5).hide()
                    )
                    .subtract(
                      brep.Box(2,20,2).hide()
                    )
                    .color('red');

  const glbData = await myModel.toGLTF();
  blobUrl = URL.createObjectURL(new Blob([glbData], { type: 'model/gltf-binary' }));
  gltfSourceUrl.value = blobUrl;

  console.log(`==== Model generation: ${performance.now() - t0} ms`)

})

</script>

<template>
  <div id="container">
    <p v-if="!ocLoaded">Loading WASM...</p>
    <model-viewer
      v-if="gltfSourceUrl"
      :src="gltfSourceUrl"
      tone-mapping="linear"
      :shadow-intensity="1"
      :shadow-softness="1"
      :exposure="0.7"
      enable-pan
      auto-rotate
      camera-controls
    ></model-viewer>
  </div>
</template>

<style scoped>

  #container {
    width: 100%;
    height: 100vh;
  }

  model-viewer {
    width: 100%;
    height: 100%;
  }
</style>
