const VIEWER_ELEMENT_ID = "poly_viewer";
const NAME_PARAMETER = "name";
const MODE = "mode";
const MODE_META = "meta";
const MODE_MESH = "mesh";


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
 * Animate the poly viewer.
 */
function animate(viewer, delay, type, meshes, start, end, step=0) {
    if(-1 == end) {
        // play all the meshes
        end = meshes.length - 1;
    }
    
    const num_meshes = end - start + 1;
    
    if(num_meshes <= 0) {
        // nothing to show at all
        return;
    }
    
    // just change the source of the viewer to display a new mesh
    const mesh = meshes[step % meshes.length];
    viewer.setAttribute("src", mesh);
    #viewer.src = mesh;

    if(meshes.length == 1) {
        // there is only a single element to show, no need to animate
        return;
    }
    
    
    // loop
    step = step + 1;
    if(step > end) {
        step = start;
    }
    
    setTimeout(animate, 1000 * delay, viewer, delay, type, meshes, start, end, step);
}


$(document).ready(function() {
    var viewer = getPolyViewer();
    const name = getObjectName();
    const mode = getPresentationMode();
    const configurationDocument = name + ".json";
    
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
        
            animate(viewer, delay, type, meshes, start, end, start);
        }).fail(function() {
            console.log("Failed loading configuration: " + configuration);
        });
    } else if(mode == MODE_MESH) {
        // Mesh is loaded from a mesh file directly.
        animate(viewer, 0.0, "mesh", [name + ".glb"], 0, 0, 0);
    } else {
        console.log("Unknown mode: " + mode);
    }
});
