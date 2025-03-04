/// priority: 0
// serverside
// Global variables
let attackDamage = 0;
let commandresult = 0;
let damageTried = 0;
let affectedEntities = [];

// Scoreboard selector syntax
let scoreboard = "stronger_skulls";
let positiveTarget = `@e[scores={${scoreboard}=1..}]`;
let negativeTarget = `@e[scores={${scoreboard}=..0}]`;

let recentExplosion = {
    x: Infinity,
    y: Infinity,
    z: Infinity,
    size: Infinity,
    newSize: Infinity,
    exactSize: Infinity,
    radius: Infinity,
    sourceEntity: null,
    ownerEntity: null,
};

function createScoreboard() {
    Utils.server.runCommandSilent(`scoreboard objectives add ${scoreboard} dummy`);
}

// Server initializes scoreboard
ServerEvents.loaded(event => {
    createScoreboard();
});

// Track explosion details
LevelEvents.beforeExplosion(event => {
    // Reset variables
    recentExplosion = {
        x: event.x,
        y: event.y,
        z: event.z,
        size: Math.min(Math.max(Math.pow(Math.ceil(event.size)*2, 2)), 15),
        exactSize: event.size,
    };
    recentExplosion.radius = recentExplosion.size * 2;
    let closestDistance = Infinity;
    let blockDistance = Infinity;

    // Gather Information
    event.server.getEntities().forEach(entity => {
        blockDistance = (
            Math.abs(entity.x - recentExplosion.x) +
            Math.abs(entity.y - recentExplosion.y) +
            Math.abs(entity.z - recentExplosion.z)
        );

        // Is the entity within range
        if (blockDistance <= recentExplosion.size && blockDistance <= closestDistance) {
            closestDistance = blockDistance;

            // Is the entity likely the cause
            if (blockDistance == 0 && entity.getOwner() === event.exploder) {
                recentExplosion.sourceEntity = entity;
                recentExplosion.ownerEntity = entity.getOwner();
                
                let note = entity.deltaMovement
                // console.log(`Something Noteworthy: ${note}`);
            }

            // Is the entity a player
            if (recentExplosion.ownerEntity && recentExplosion.ownerEntity) {
            attackDamage = Math.max(recentExplosion.ownerEntity.getAttributeValue('minecraft:generic.attack_damage'), 0) || 0;
            
            // debuglogsing attack damage
            // console.log(`Attack damage of ${recentExplosion.ownerEntity}: ${attackDamage}`);
            }
        }
    });
    
    // Is the cause of a explosion a wither skull
    if (recentExplosion.sourceEntity && recentExplosion.sourceEntity.type === `minecraft:wither_skull`) {

        // Increase explosion size by attack damage
        let rawCalculation = recentExplosion.exactSize + attackDamage
        recentExplosion.newSize = Math.min(Math.max(rawCalculation), 15);
        event.setSize(recentExplosion.newSize);
    }

});

LevelEvents.afterExplosion(event => {
    // Is this our explosion
    if (recentExplosion.x === event.x && recentExplosion.y === event.y && recentExplosion.z === event.z) {
        // console.log(`Explosion at ${event.x}, ${event.y}, ${event.z} internal size ${recentExplosion.exactSize} new size ${recentExplosion.newSize}`);
        let blockDistance = Infinity;
        
        event.affectedEntities.forEach(entity => {
        blockDistance = (
            Math.abs(entity.x - recentExplosion.x) +
            Math.abs(entity.y - recentExplosion.y) +
            Math.abs(entity.z - recentExplosion.z)
        );

            // Document Entity
            // console.log(`Entity Affeced ${entity} distance ${blockDistance} `);

            affectedEntities.push(entity);
        });

        // Actions based on size
        switch (recentExplosion.newSize) {
            case 15:
                Utils.server.runCommandSilent(`playsound minecraft:entity.wither.ambient ambient @a ${recentExplosion.sourceEntity.x} ${recentExplosion.sourceEntity.y} ${recentExplosion.sourceEntity.z} ${recentExplosion.newSize} 2 0`);
            break;
        }

    }

});

EntityEvents.hurt(event => {
    let sourceEntity = event.source.actual;
    let targetEntity = event.entity;
    let amountHurt = event.damage;
    let damageSource = event.source;

    

    // If the damage is coming from our own explosion we can ignore it to avoid killing ourselves
    if (sourceEntity === recentExplosion.ownerEntity && targetEntity === recentExplosion.ownerEntity && damageSource.toString().includes("explosion")) {
        // console.log(`Cancelled Source: ${sourceEntity} Amount hurt: ${amountHurt} Damage Source: ${damageSource} Target: ${targetEntity}`);
        event.cancel();
    } 
    // Otherwise we will apply more damage based on the attack damage of the owner of the attacking entity
    // We still have to check that it is our explosion, and that these are affected entities
    else if (sourceEntity === recentExplosion.ownerEntity && affectedEntities.indexOf(targetEntity) > -1 && damageSource.toString().includes("player")) {

        // Apply more damage based on the attack damage of the owner of the attacking entity
        Utils.server.runCommandSilent(`damage ${targetEntity.username} ${attackDamage} minecraft:wither_skull by ${recentExplosion.sourceEntity.username} from ${recentExplosion.ownerEntity.username}`);
        damageTried = attackDamage;
        // console.log(`Source: ${sourceEntity} Amount hurt: ${amountHurt} Damage Source: ${damageSource} Target: ${targetEntity} Damage Tried ${damageTried}`);

    }

});