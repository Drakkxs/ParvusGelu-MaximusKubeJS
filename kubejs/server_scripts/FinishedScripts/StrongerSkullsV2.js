// priority: 0
// This script is designed to make wither skulls react to the strenght of the player
// It is not the best way to do it, but it is a way to do it.
let strongerSkullsDebug = false; // Want some debug?

// Create a variable to hold the data for the skull
// With this single global object we can access it from anywhere
let skull = {};

// A function to get the player that spawned the skull
// This function will be called when the skull is spawned

/**
 * Finds an entity by its UUID and type. If multiple entities are found with the same UUID, warns the log and returns the first one.
 * @param {string} uuid The UUID to search for
 * @param {string} type The type of entity to search for
 * @returns {Entity|null} The entity found or null if not found
 */
function findByUUID(uuid, type) {
    let entities = Utils.server.getEntities().filter(entity => entity.type == type && entity.uuid == uuid);
    if (entities.length > 1) {
        // If there are multiple entities with the same UUID, warn the log
        console.warn(`Found ${entities.length} entities with the same UUID: ${uuid} of type ${type} using first entity`);
    } 

    if (entities.length == 1) {
        return entities[0];
    }
    return null;
}

EntityEvents.spawned("minecraft:wither_skull", event => {
    skull.entity = event.entity;
    skull.owner = skull.entity.getNbt().getUUID("Owner");

    // Get the player that spawned the skull
    skull.player = findByUUID(skull.owner, "minecraft:player");

    
    if (strongerSkullsDebug) console.log(`${skull.player} with UUID ${skull.owner} spawned wither skull`);
})

LevelEvents.beforeExplosion(event => {
    if (strongerSkullsDebug) console.log(`Explosion at ${event.x}, ${event.y}, ${event.z}`);
    if (skull.owner == null) return;
})