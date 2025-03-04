/// priority: 0
// Actions based on origins
// It is not the best way to do it, but it is a way to do it.
let originsIronManaDebugLogs = false; // Want some debug?

let KubejsIronManaUUID = "01954177-9272-73a4-8455-38c3c21d7070"; // Don't touch this unless you know what you're doing.
PlayerEvents.tick(event => {
    let player = event.player;
    if (!event.entity.age % 20) return; // Slowed down a bit for performance and because it doesn't need to run every tick
    
    // Get origins
    let origins = [];
    getPlayerOrigins(player).forEach(origin => {
        if (originsIronManaDebugLogs) console.log(`Origin: ${origin.origin}`);
        origins.push(origin.origin);
    })
    if (origins && origins.length > 0) {
        // It's recommended to use the same UUID for all modifications and to install Apotic Attributes Lib to see the changes
        if (origins.some(origin => origin.includes("fox"))) {
            // Add specific logic for the origin here:
            // Add your custom logic here. For example, all fox origins are born with double mana!
            // Base mana is 100
            player.modifyAttribute("irons_spellbooks:max_mana", KubejsIronManaUUID, 1, "multiply_total");
            if (originsIronManaDebugLogs) console.log(`Fox origin detected, modified max mana to be ${player.getAttributeValue("irons_spellbooks:max_mana")}`);
        } else {
            // For example default logic is that unattuned species have no mana
            // This punishes players that want to use iron spells for not choosing attuned species
            let attribute = player.getAttribute("irons_spellbooks:max_mana");
            if (attribute) {
                player.modifyAttribute("irons_spellbooks:max_mana", KubejsIronManaUUID, -1.00, "multiply_base");
                if (originsIronManaDebugLogs) console.warn(`Unattuned origin detected, modified max mana to be ${player.getAttributeValue("irons_spellbooks:max_mana")}`);
            } else {
                if (originsIronManaDebugLogs) console.warn("Max mana attribute not found");
            }   
        }
    }

    // Immunities
    // Get all power types
    let powerContainer = ApoliAPI.getPowerContainer(player);
    if (!powerContainer) return;
    let powerTypes = powerContainer.getPowerTypes(true);

    let a = 0;
    let immunites = [];
    let powerName = "";
    powerTypes.forEach(powerType => {
        
        powerName = new String(powerType.location());

        if (powerName.includes("fire") && (powerName.includes("immune") || powerName.includes("immunity")) ) {
            if (originsIronManaDebugLogs) console.log(`Fire immunity detected. PowerName: ${powerName}`);
            immunites.push("fire");
        }

        if (powerName.includes("freeze") && (powerName.includes("immune") || powerName.includes("immunity"))) {
            if (originsIronManaDebugLogs) console.log(`Freeze immunity detected. PowerName: ${powerName}`);
            immunites.push("freeze");
        }
        a++;
    });

    if (powerTypes.size() > 0) {
        // Logic to avoid blinking effect badgee
        // This happens because we used to remove every effect before reapplying them
        if (immunites.indexOf("fire") > -1 && immunites.indexOf("freeze") > -1) {
            if (originsIronManaDebugLogs) console.log(`${player.username} is immune to fire and freezing damage`);
            player.addEffect(new MobEffectInstance("toughasnails:internal_chill", 2, 0, true, false));
            player.addEffect(new MobEffectInstance("toughasnails:internal_warmth", 2, 0, true, false));
        } else if (immunites.indexOf("fire") > -1) {
            if (originsIronManaDebugLogs) console.log(`${player.username} is immune to only fire damage`);
            player.addEffect(new MobEffectInstance("toughasnails:internal_chill", 2, 0, true, false));
        } else if (immunites.indexOf("freeze") > -1) {
            if (originsIronManaDebugLogs) console.log(`${player.username} is immune to only freezing damage`);
            player.addEffect(new MobEffectInstance("toughasnails:internal_warmth", 2, 0, true, false));
        } else {
            if (originsIronManaDebugLogs) console.log(`${player.username} is not immune to any damage`);
        }
    }
    
});

/**
 * Returns an array of objects, each containing the origin and layer of the player.
 * Each object has the following properties:
 * @property {string} origin - The identifier of the origin, for example "origins:human"
 * @property {string} layer - The identifier of the layer, for example "origins:human"
 * @return {Array<Object<string, string>>}
 */
function getPlayerOrigins(player) {
    if (!player.isPlayer()) return [];

    if (originsIronManaDebugLogs) console.log(`Checking player ${player.username} for origins`);
    let originContainerOptional = IOriginContainer.get(player);
    if (!originContainerOptional.isPresent()) return [];

    let originContainer = originContainerOptional.orElse(null);
    if (!originContainer) return [];

    // Get all origins for this player
    let origins = originContainer.getOrigins();
    let playerOrigins = [];

    origins.forEach((layerKey, originKey) => {
        let originIdentifier = originKey.location().toString();
        let layerIdentifier = layerKey.location().toString();
        if (originsIronManaDebugLogs) console.log(`Player has origin ${originIdentifier} in layer ${layerIdentifier}`);
        
        // Store the origin and layer of the player in an object
        playerOrigins.push({
            /**
             * The identifier of the origin, for example "origins:human"
             * @type {string}
             */
            origin: originIdentifier,
            /**
             * The identifier of the layer, for example "origins:human"
             * @type {string}
             */
            layer: layerIdentifier
        });
    });

    return playerOrigins;
}
