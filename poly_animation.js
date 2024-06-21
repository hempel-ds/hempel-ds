const VIEWER_ELEMENT_ID = "poly_viewer";
const NAME_PARAMETER = "name";
const MODE = "mode";
const MODE_META = "meta";
const MODE_MESH = "mesh";
const MODE_CLOUD = "cloud";
const POINT_SIZE = 4.0;


/**
 * Get the poly viewer as an HTML element.
 */
function getPolyViewer() {
    return document.getElementById(VIEWER_ELEMENT_ID);
}


/**
 * Extract the object name from the URL.
 *
 * The object name determines which poly is loaded.
 */
function getObjectName() {
    var url = new URL(window.location.href);
    
    return url.searchParams.get(NAME_PARAMETER);
}


function getPresentationMode() {
    var url = new URL(window.location.href);
    
    return url.searchParams.get(MODE);
}


/**
 * Mesh animation.
 *
 * Cycles a sequence of meshes and renders them.
 *
 * To mitigate loading times of mesh files, which might be larger than you
 * expect, the animation waits until a frame is loaded and then triggers the
 * next frame. This is not correct from an animation point of view, but the
 * results a visible at the first cycle. Otherwise there are some ugly gaps
 * in the sequence.
 */
class Animation {
    /**
     * Parameters:
     *    viewer: viewer the mesh is rendered with (Google Mesh Viewer)
     *    delay: delay between two frames (in seconds)
     *    type: type of the animation; use "mesh" for a single frame.
     *    meshes: all the meshes which could be rendered
     *    start: first mesh to render (index)
     *    end: last mesh to render (index)
     */
    constructor(viewer, delay, type, meshes, start, end) {
        this.viewer = viewer;
        this.delay = delay;
        this.type = type;
        this.meshes = meshes;
        this.start = start;
        this.end = end;
        this.step = start;
        
        if(-1 == end) {
	    // play all the meshes
            this.end = meshes.length - 1;
        }
        
        this.num_meshes = end - start + 1;
    }
    
    /**
     * Run the animation.
     *
     * This method should only be called once per viewer. A callback is
     * registered for the viewer (on load) to get a nice and smooth animation.
     */
    run() {
        if(this.num_meshes <= 0) {
	    // nothing to show at all
    	    return;
        }
    
        // just change the source of the viewer to display a new mesh
        const mesh = this.meshes[this.step];
        
        if(this.type == "cloud") {
            // point clouds are upside down; a cleaner solution would receive
            // a URL parameter indicating the operation (or storing a correct
            // version of the point clouds in the first place). Anayway, this
            // solution is good enough for our purposes :)
            this.viewer.scale = `1.0 -1.0 -1.0`;
        }
    
        if(this.meshes.length == 1) {
	    // there is only a single element to show, no need to animate
            this.setMesh(mesh);
	    return;
        }
        
        // set the new mesh
        let that = this;
        this.viewer.addEventListener(
            "load",
            function() {
                setTimeout(that.nextImage, 1000 * that.delay, that);
            });
        
        this.setMesh(mesh);
    }
    
    setMesh(mesh) {
        this.viewer.src = mesh;
    }
    
    /**
     * Called when the next frame is enabled for rendering.
     */
    nextImage(that) {
        that.step = that.step + 1;
        if(that.step > that.end) {
            that.step = that.start;
        }
        
        that.viewer.src = that.meshes[that.step];
    }
};


/*
 * Get the dimensions of the viewport.
 *
 * Returns:
 *   width and height of the viewport
 */
function getViewportSize() {
    let width = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    let height = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
    
    return [width, height];
}


/**
 * Fit the model viewer to the viewport.
 */
function fitViewerToViewport() {
    var viewer = getPolyViewer();
    const dims = getViewportSize();
    
    viewer.style.width = dims[0] + "px";
    viewer.style.height = dims[1] + "px";
}


/**
 * Get the THREE.js scene from the viewer.
 *
 * In case of a point cloud, we want to slightly modify the material
 * properties of the model. I.e. we want to change the render size of the
 * points.
 *
 * WARNING: We are accessing some internal data structures here, this might
 *     just break with newer versions of themodel viewer.
 *
 * Parameters:
 *   viewer - model viewer instance.
 *
 * Returns:
 *   scene belonging to the model-viewer instance.
 */
function getSceneFromViewer(viewer) {
    const sceneSymbol = Object.getOwnPropertySymbols(viewer).find(
        x => x.description === "scene");
    
    return viewer[sceneSymbol];
}


/**
 * Get the model from the viewer.
 *
 * The model viewer handels a single model. This functions accesses and
 * returns it.
 *
 * WARNING: This is an internal implementation of the model viewer. The
 *     functionality might break with a newer version!
 *
 * Parameters:
 *   viewer - model-viewer instance
 *
 * Returns:
 *   model handled by the viewer.
 */
function getModelFromViewer(viewer) {
    var scene = getSceneFromViewer(viewer);
    
    return scene._model;
}


/**
 * Set the point size of a model.
 *
 * Iterate every child object in a model and set the size property of the
 * materials to the provided value. This changes the radius of the rendered
 * points.
 *
 * Paramters:
 *   model - model which is changed
 *   size - radius of the rendered points in pixels
 */
function setPointSize(model, size) {

    for(let child of model.children) {
	child.material.size = size;
	child.material.needsUpdate = true;
    }
}


$(document).ready(function() {
    var viewer = getPolyViewer();
    const name = getObjectName();
    const mode = getPresentationMode();
    const configurationDocument = name + ".json";
    
    // maximize the viewer and update it if the viewport changes!
    fitViewerToViewport();
    window.addEventListener("resize", fitViewerToViewport);
    
    // in case of a point cloud, set the point size
    viewer.addEventListener('before-render', function() {
        var model = getModelFromViewer(viewer);
	setPointSize(model, POINT_SIZE);
    })

    if(mode == MODE_META) {
        // Meshes are managed within a configuration file.
        
        $.getJSON(configurationDocument, function(configuration) {
            // before we can actually animate something, we have to load the
            // configuration; it contains all the necessary data
            const name = configuration.name;
            const delay = configuration.delay;
            const type = configuration.type;
            const meshes = configuration.meshes;
            const start = configuration.start;
            const end = configuration.end;
    
            var animation = new Animation(viewer, delay, type, meshes, start, end, start);
            animation.run();
        }).fail(function() {
            console.log("Failed loading configuration: " + configuration);
        });
    } else if(mode == MODE_MESH) {
        // Mesh is loaded from a mesh file directly.
        var animation = new Animation(viewer, 0, "mesh", [name + ".glb"], 0, 0, 0);
        animation.run();
    } else if(mode == MODE_CLOUD) {
        // Point cloud is loaded from a mesh file directly.
        var animation = new Animation(viewer, 0, "cloud", [name + ".glb"], 0, 0, 0);
        animation.run();
    }else {
        console.log("Unknown mode: " + mode);
    }
});
