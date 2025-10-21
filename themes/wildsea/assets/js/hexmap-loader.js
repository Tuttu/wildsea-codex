// Wait for the OI library to be ready
OI.ready(function() {

    // Find all hexmap wrappers on the page
    const allMaps = document.querySelectorAll('.hexmap-wrapper');
    
    allMaps.forEach(wrapper => {
        // Get the config from the data attributes
        const config = {
            mapID: wrapper.dataset.mapId,
            hexjsonPath: wrapper.dataset.hexjsonPath,
            overflowImagesPath: wrapper.dataset.overflowImagesPath,
            labelImagesPath: wrapper.dataset.labelImagesPath,
            showLegend: wrapper.dataset.showLegend === 'true',
            mapElement: wrapper.querySelector('.hexmap-container'),
            legendElement: wrapper.querySelector('.legend-container')
        };
        
        // Launch this specific map
        if (config.mapElement && config.hexjsonPath) {
            initializeHexmap(config);
        } else {
            console.error('Hexmap init failed. Missing map element or hexjson path.', config);
        }
    });

});

/**
 * Initializes a single hexmap instance.
 * All logic from your original map.js is now inside here.
 */
async function initializeHexmap(config) {

    // --- 1. Fetch Image JSONs ---
    // We must fetch the image JSON files before initializing the map.
    // We use Promise.all to fetch them in parallel.
    let overflowImages = [];
    let labelImages = [];

    try {
        const [overflowResponse, labelResponse] = await Promise.all([
            fetch(config.overflowImagesPath),
            fetch(config.labelImagesPath)
        ]);
        overflowImages = await overflowResponse.json();
        labelImages = await labelResponse.json();
    } catch (e) {
        console.warn(`Could not load image JSONs for map ${config.mapID}.`, e);
    }
    
    // --- 2. Define Map Configuration ---
    // This is your config object from map.js, but using dynamic variables.
    const mapConfig = {
        'grid': {'show':true},
        'label': {
            'show': false,
            'clip': true,
            format: txt => `${txt}`
        },
        // Use the paths and data we loaded
        'hexjson': config.hexjsonPath, // oi.hexmap.js fetches this one itself
        'overflowImages': overflowImages,
        'labelImages': labelImages,

        // --- 3. Define Ready Function (Legend/Tooltip Logic) ---
        // This logic is now fully SCOPED to this map and its legend.
        'ready': function() {
            const hexmap = this; // 'this' is the map instance

            // --- Tooltip Logic (Scoped) ---
            // We attach the tooltip to the map's container div
            const mapContainer = hexmap.el;
            let tip = mapContainer.querySelector('.tooltip-hexmap');
            if (!tip) {
                tip = document.createElement('div');
                tip.classList.add('tooltip-hexmap');
                mapContainer.appendChild(tip);
            }
            
            hexmap.on('mouseover',function(e){
                // If the hex has the 'anchor' property,
                // stop right here and don't show a tooltip.
                if (e.data.data.anchor === true) {
                    return;
                }
                tip.style.display = 'block';
                tip.innerHTML = e.data.data.n+' ('+e.data.data.q+','+e.data.data.r+')<br />Region: '+(e.data.data.region || 'N/A');
                const bb = e.target.getBoundingClientRect();
                const bbo = mapContainer.getBoundingClientRect();
                tip.style.left = Math.round(bb.left + bb.width/2 - bbo.left + mapContainer.scrollLeft)+'px';
                tip.style.top = Math.round(bb.top + bb.height/2 - bbo.top)+'px';
            });

            hexmap.on('mouseout', function(e){
                tip.style.display = 'none';
            });

            // --- Legend Logic (Scoped) ---
            // Only run if the legend exists for this map
            if (config.showLegend && config.legendElement) {
                const legendEl = config.legendElement;

                // --- Collapsible Sections ---
                const headers = legendEl.querySelectorAll('.collapsible-header');
                headers.forEach(header => {
                    header.addEventListener('click', () => {
                        header.classList.toggle('active');
                    });
                });

                // --- Legend Filter ---
                const filterInput = legendEl.querySelector('.legend-filter'); // Use class
                filterInput.addEventListener('input', (e) => {
                    const searchTerm = e.target.value.toLowerCase();
                    const sections = legendEl.querySelectorAll('.legend-section');

                    sections.forEach(section => {
                        const items = section.querySelectorAll('.hexmap-legend li');
                        let visibleItems = 0;
                        items.forEach(item => {
                            const itemText = item.textContent.toLowerCase();
                            if (itemText.includes(searchTerm)) {
                                item.classList.remove('hidden');
                                visibleItems++;
                            } else {
                                item.classList.add('hidden');
                            }
                        });
                        const header = section.querySelector('.collapsible-header');
                        if (visibleItems === 0 && searchTerm) {
                            header.classList.add('hidden');
                        } else {
                            header.classList.remove('hidden');
                        }
                    });
                });

                // --- Legend Hover (POI) ---
                const poiLegendItems = legendEl.querySelectorAll('.poi-legend li'); // Use class
                poiLegendItems.forEach(item => {
                    const hexId = item.getAttribute('data-hex-id');
                    if (hexId && hexmap.areas[hexId]) {
                        item.addEventListener('mouseover', () => hexmap.regionFocus(hexId));
                        item.addEventListener('mouseout', () => hexmap.regionBlur(hexId));
                    }
                });

                // --- Legend Hover (Region) ---
                // Find all collapsible headers that have a region ID
                const regionLegendHeaders = legendEl.querySelectorAll('.collapsible-header[data-region-id]'); 
                regionLegendHeaders.forEach(item => {
                    const regionId = item.getAttribute('data-region-id');
                    // Find the corresponding SVG path for this boundary
                    const boundaryPath = hexmap.lines[regionId];
                    
                    if (regionId && boundaryPath) {
                        // Add mouseover event to highlight the boundary
                        item.addEventListener('mouseover', () => {
                            // Bring the path to the front (for z-index)
                            if (boundaryPath.parentNode) {
                                boundaryPath.parentNode.appendChild(boundaryPath);
                            }
                            boundaryPath.classList.add('boundary-highlight');
                        });
                        
                        // Add mouseout event to remove the highlight
                        item.addEventListener('mouseout', () => 
                            boundaryPath.classList.remove('boundary-highlight'));
                    }
                });
            }
        } // end ready function
    }; // end mapConfig

    // --- 4. Create the Map! ---
    // Finally, initialize the map on its specific container element.
    new OI.hexmap(config.mapElement, mapConfig);
}