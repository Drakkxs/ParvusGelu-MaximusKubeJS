/// priority: 0
// This script is designed to control the server side of the Maximus ScriptPack
// It is not the best way to do it, but it is a way to do it.
let maximusServerEventsDebugLogs = false; // Want some debug?

/** @type {Internal.IForgeRegistry<Internal.Potion>} */
let PotionItems = ForgeRegistries.POTIONS;

/** @type {Internal.IForgeRegistry<Internal.MobEffect>} */
let MobEffects = ForgeRegistries.MOB_EFFECTS;

let recipeMap = new Map();
let a = 0;

ServerEvents.tags('item', event => {
    event.add('kubejs:flesh_crafting_materials', [
        'minecraft:netherrack',
        'minecraft:nether_wart_block',
        'minecraft:crimson_nylium',
        'minecraft:warped_wart_block',
        'minecraft:shroomlight',
        'minecraft:crimson_fungus',
        'minecraft:warped_fungus',
        'minecraft:nether_wart'
        // You can add more items that fit the theme
    ]);
});

ServerEvents.recipes(event =>{

    // Recipe handling for potion ringss
    event.remove({output: 'justpotionrings:ring'})
    event.remove({output: 'justpotionrings:potion_ring'})

    // Recipe for fermented heart
    event.shaped(
        Item.of("kubejs:fermented_heart", 1),
        [
            'FFF',
            'RMC',
            'FFF'
        ],
        {
            F: '#kubejs:flesh_crafting_materials',
            R: 'minecraft:rotten_flesh',
            M: 'minecraft:magma_cream',
            C: '#forge:tools/gold'
        }
    ).damageIngredient('#forge:tools/gold')

    // MobEffects.getEntries().forEach(
    // /** @param {Internal.RegistryObject<Internal.MobEffect>} effect */
    // (effect) => {
    //     /**
    //      * @type {Internal.ResourceKey<Internal.MobEffect>}
    //      */
    //     let key = effect.getKey();
        
    //     MobEffectsDict.push(key.location());
    //     a++
    // });

    PotionItems.getEntries().forEach(entry => {
        /** @type {Internal.ResourceKey<Internal.Potion>} */
        let resourceKey = entry.getKey();
        /** @type {Internal.Potion} */
        let potion = entry.getValue();

        // If the potion has only one effect, create the recipe for that effect.
        if (potion.getEffects().size() === 1) {
            potionringrecipes(event, potion, resourceKey, 'justpotionrings:ring', 'justpotionrings:potion_ring');
            potionringrecipes(event, potion, resourceKey, 'thaumatics:necklace', 'thaumatics:necklace');
        }
    });
})

/**
 * Finds the corresponding potion for the given effect, if any.
 * @param {Internal.RecipesEventJS} event
 * @param {Internal.Potion} potion
 * @param {Internal.ResourceKey<Internal.Potion>} resourceKey
 * @param {String} outputID
 * @param {String} baseID
 * @returns {void}
 */
function potionringrecipes(event, potion, resourceKey, outputID, baseID) {

    let potionEffect = potion.getEffects().get(0).getEffect()

    // If the potion effect is instant avoid granting access to it
    if (potionEffect.isInstantenous()) {
        if (maximusServerEventsDebugLogs) {
            console.log(`Found instant effect ${potionEffect} from potion ${resourceKey.location()}`);
            console.log("Instant effects are BANNED!");}
        return;
    }

    let mobEffectResource = MobEffects.getKey(potionEffect);
    if (mobEffectResource.toString().length === 0) return;
    if (maximusServerEventsDebugLogs) console.log(`Found effect ${mobEffectResource} from potion ${resourceKey.location()}`);
    let nbtPotion = resourceKey.location();

    let potionItem = Item.of("minecraft:potion", {Potion: nbtPotion.toString()}).weakNBT();
    let ringItem = Item.of(outputID, {effect: mobEffectResource.toString()});
    let ringItemID = ringItem.getId();
    if (ringItemID === "thaumatics:necklace") {
        event.shaped(
            ringItem,
            [
                "ABA",
                "ACA",
                "ADA"
            ],
            {
                A: 'botania:livingrock',
                B: potionItem,
                C: baseID,
                D: 'botania:manasteel_block'
            }
        )
    } else {
        event.shaped(
            ringItem,
            [
                "ABA",
                "ACA",
                "ADA"
            ],
            {
                A: 'botania:livingrock',
                B: potionItem,
                C: baseID,
                D: 'botania:manasteel_block'
            }
        )
    }

    // To avoid creating duplicate recipes we create a map of the outputID to the baseID
    // Then check if the baseID is already in the map
    if (recipeMap.has(baseID)) {
        return;
    }
    // Log the baseID to the map to avoid creating duplicate recipes
    recipeMap.set(baseID, outputID);
    if (baseID === "thaumatics:necklace") {
        event.shaped(
            Item.of(baseID),
            [
                "ECE",
                "EDE",
                "ABA"
            ],
            {
                A: 'minecraft:air',
                B: 'botania:rune_mana',
                C: 'minecraft:gold_ingot',
                D: 'minecraft:lapis_block',
                E: 'minecraft:string'
            }
        )
    } else {
        event.shaped(
            Item.of(baseID),
            [
                "BCA",
                "CDC",
                "ACA"
            ],
            {
                A: 'minecraft:air',
                B: 'botania:rune_mana',
                C: 'minecraft:gold_ingot',
                D: 'minecraft:lapis_block'
            }
        )
    }
}

ItemEvents.crafted("kubejs:fermented_heart", event => {

    sqiush(event.player)
})

ItemEvents.canPickUp("kubejs:fermented_heart", event =>{
    sqiush(event.player)
})

function sqiush(player) {
    // sound effect to play
    Utils.server.runCommandSilent(`/playsound minecraft:entity.magma_cube.squish block ${player.username} ${player.x} ${player.y} ${player.z} 3 2`)
}