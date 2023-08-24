import { update } from "lodash"
import * as BABYLON from '@babylonjs/core'
import * as BABYLONMMD from 'babylon-mmd'

type SvelteAction = (node: HTMLElement, parameters: any) => {
    update?: (parameters: any) => void,
    destroy?: () => void
}
async function createEngine(node:HTMLCanvasElement) {
    const webGPUSupported = await BABYLON.WebGPUEngine.IsSupportedAsync;
    if (webGPUSupported) {
        const engine = new BABYLON.WebGPUEngine(node);
        await engine.initAsync();
        return engine;
    }
    return new BABYLON.Engine(node, true);
}

async function BabylonLoad(node:HTMLCanvasElement){
    const engine = await createEngine(node);
    const scene = new BABYLON.Scene(engine);
    const camera = new BABYLONMMD.MmdCamera("mmdCamera", new BABYLON.Vector3(0, 10, 0), scene);

    //transparent background
    scene.clearColor = new BABYLON.Color4(0, 0, 0, 0);

    const havokPlugin = new BABYLON.HavokPlugin();
    scene.enablePhysics(new BABYLON.Vector3(0, -9.8 * 10, 0), havokPlugin);

    const mmdRuntime = new BABYLONMMD.MmdRuntime(new BABYLONMMD.MmdPhysics(scene));
    mmdRuntime.register(scene);

    const meshes = await BABYLON.SceneLoader.ImportMeshAsync(null, "your/root/path/", "your_file_name.pmx", scene)
    const model = meshes.meshes[0];
    const mmdModel = mmdRuntime.createMmdModel(model as BABYLON.Mesh);
    const vmdLoader = new BABYLONMMD.VmdLoader(scene);
    const modelMotion = await vmdLoader.loadAsync("model_motion_1", "your_model_motion_path.vmd");
    mmdModel.addAnimation(modelMotion);
    mmdModel.setAnimation("model_motion_1");
    mmdRuntime.setCamera(camera);
    
    return scene;
}
