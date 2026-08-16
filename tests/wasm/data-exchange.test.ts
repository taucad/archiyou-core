import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { describe, expect, test } from 'vitest';
import { Brep, init } from '../../src/internal';
import initSingle from '../../src/wasm/archiyou-opencascade.js';
import initMulti from '../../src/wasm/archiyou-opencascade-multi.js';

const variants = [
  ['single', initSingle, 'archiyou-opencascade.wasm'],
  ['multi', initMulti, 'archiyou-opencascade-multi.wasm'],
] as const;

describe.each(variants)('%s-threaded data exchange', (_, init, wasm) => {
  test('exports an indexed colored GLB', async () => {
    const oc = await init({
      locateFile: (file) =>
        file.endsWith('.wasm')
          ? fileURLToPath(new URL(`../../src/wasm/${wasm}`, import.meta.url))
          : file,
    });

    const box = new oc.BRepPrimAPI_MakeBox(10, 20, 30);
    const shape = box.Shape();
    const documentName = new oc.TCollection_ExtendedString();
    const document = new oc.TDocStd_Document(documentName);
    const mainLabel = document.Main();
    const shapeTool = oc.XCAFDoc_DocumentTool.ShapeTool(mainLabel);
    const colorTool = oc.XCAFDoc_DocumentTool.ColorTool(mainLabel);
    const shapeLabel = shapeTool.NewShape();
    shapeTool.SetShape(shapeLabel, shape);
    const color = new oc.Quantity_ColorRGBA(1, 0, 0, 0.5);
    colorTool.SetColor(shapeLabel, color, oc.XCAFDoc_ColorType.XCAFDoc_ColorSurf);
    const mesh = new oc.BRepMesh_IncrementalMesh(shape, 0.1, false, 0.1, false);
    const outputPath = new oc.TCollection_AsciiString('/colored.glb');
    const writer = new oc.RWGltf_CafWriter(outputPath, true);
    const metadata = new oc.TColStd_IndexedDataMapOfStringString();
    const progress = new oc.Message_ProgressRange();

    expect(writer.Perform(document, metadata, progress)).toBe(true);
    const io = new NodeIO();
    const parsed = await io.readBinary(oc.FS.readFile('/colored.glb'));
    const roundTripped = await io.readBinary(await io.writeBinary(parsed));
    const primitives = roundTripped
      .getRoot()
      .listMeshes()
      .flatMap((entry) => entry.listPrimitives());
    expect(primitives.length).toBeGreaterThan(0);
    expect(primitives.every((entry) => entry.getIndices()?.getCount())).toBe(true);
    expect(primitives.every((entry) => entry.getAttribute('POSITION')?.getCount())).toBe(true);
    const material = primitives[0]?.getMaterial();
    expect(material?.getBaseColorFactor()).toStrictEqual([1, 0, 0, 0.5]);
    expect(material?.getMetallicFactor()).toBe(0);
    expect(material?.getRoughnessFactor()).toBe(1);
    expect(material?.getAlphaMode()).toBe('BLEND');
    expect(material?.getDoubleSided()).toBe(true);

    for (const value of [
      progress,
      metadata,
      writer,
      outputPath,
      mesh,
      color,
      shapeLabel,
      colorTool,
      shapeTool,
      mainLabel,
      document,
      documentName,
      shape,
      box,
    ]) {
      value.delete();
    }
    oc.PThread?.terminateAllThreads?.();
  }, 60_000);
});

test('exports a parseable GLB through Shape.toGLTF', async () => {
  await init();
  const glb = await new Brep().Box(10, 20, 30).color('red').toGLTF();
  const document = await new NodeIO().readBinary(new Uint8Array(glb));
  const primitives = document
    .getRoot()
    .listMeshes()
    .flatMap((mesh) => mesh.listPrimitives());

  expect(primitives.length).toBeGreaterThan(0);
  expect(primitives.every((primitive) => primitive.getAttribute('POSITION')?.getCount())).toBe(true);
  const material = primitives[0]?.getMaterial();
  expect(material?.getBaseColorFactor()).toStrictEqual([1, 0, 0, 1]);
  expect(material?.getMetallicFactor()).toBe(1);
  expect(material?.getRoughnessFactor()).toBe(1);
  expect(material?.getDoubleSided()).toBe(true);
  expect(document.getRoot().getAsset().extras?.archiyou?.pipelines).toStrictEqual([]);
}, 60_000);
