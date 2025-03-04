/// priority: 0
/// requires: botania
// This script is designed to control startup of the Maximus ScriptPack
// It is not the best way to do it, but it is a way to do it.
let debuglogs = false; // Want some debug?

// === Event Landscape ===
StartupEvents.registry('mob_effect', event => {
  console.log('Registering Emberflow Mob Effect');
  event.create("kubejs:emberflow")
    .color(Color.rgba(159, 97, 32, 255))
    .beneficial()
    .effectTick((entity, lvl) => {
      global.effectActionEmberflow(event, entity, lvl)
    })
  .createObject();
});

StartupEvents.registry('potion', event => {
  console.log('Registering Emberwine Potions');
  let created = event.created; let b;
  // Create base potion effect.
  potRegister(event, "kubejs:emberflow", "kubejs:emberwine", "45s", 1);
  potRegister(event, "kubejs:emberflow", "kubejs:long_emberwine", "1m30s", 1);
  potRegister(event, "kubejs:emberflow", "kubejs:strong_emberwine", "22s", 2);
});

StartupEvents.registry('item', event => {
  event.create("kubejs:fermented_heart")
  // https://wiki.latvian.dev/books/kubejs/page/custom-items
  .texture('maximus:item/fermented_heart')
  .food(f => {
    f.hunger(1) 
    f.saturation(2)
    // min(hunger * saturation * 2 + saturation, foodAmountAfterEating)
    f.effect('toughasnails:internal_warmth', parseDuration("30s"), 2, 1)
    f.meat()
    f.alwaysEdible()
  })
})

// === Recipe Landscape ===
MoreJSEvents.registerPotionBrewing(event => {
  // Register Emberwine Brewing recipes
  // Brewing recipes for Emberwine potions
  event.addPotionBrewing("minecraft:gold_nugget", "minecraft:mundane", "kubejs:emberwine");
  event.addPotionBrewing("minecraft:redstone", "kubejs:emberwine", "kubejs:long_emberwine");
  event.addPotionBrewing("minecraft:glowstone_dust", "kubejs:long_emberwine", "kubejs:strong_emberwine");

});

ItemEvents.modification(event => {
  event.modify("kubejs:fermented_heart", item => {
    item.setFireResistant(true)
  })
})

// === Function Landscape ===
/**
 * Parses a string duration into the number of ticks it represents.
 *
 * Accepted formats are:
 * - "1h" (1 hour)
 * - "1m" (1 minute)
 * - "1s" (1 second)
 * - "1h30m45s" (1 hour, 30 minutes, 45 seconds)
 *
 * Throws an Error if the format is invalid.
 *
 * @param {string} duration - The duration string.
 * @return {number} The number of ticks the duration represents.
 */
function parseDuration(duration) {
  let regex = /^(\d+h)?(\d+m)?(\d+s)?$/;
  let match = duration.match(regex);
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`);
  }
  
  let hours = match[1] ? parseInt(match[1].slice(0, -1)) : 0;
  let minutes = match[2] ? parseInt(match[2].slice(0, -1)) : 0;
  let seconds = match[3] ? parseInt(match[3].slice(0, -1)) : 0;
  
  return (hours * 60 * 60 * 20) + (minutes * 60 * 20) + (seconds * 20);
}

/**
 * Registers a custom potion.
 *
 * @param {Registry.Potion} e - The registry event to which the potion is added.
 * @param {string} effect - The mob effect identifier (e.g., "kubejs:emberflow").
 * @param {string} potion - The potion identifier (e.g., "kubejs:emberwine").
 * @param {string} duration - The duration string (e.g., "45s", "1m30s").
 * @param {number} amplifier - The amplifier level for the potion effect.
 * @returns {void}
 */
function potRegister(e, effect, potion, duration, amplifier) {
  e.createCustom(potion, () => {
    return new PotionBuilder(effect)
      .effect(effect, parseDuration(duration), amplifier - 1)
      .createObject();
  });
}

/**
 * Creates an ItemStack for a specified potion type and variation.
 * @param {string} potionID - The potion identifier (e.g., "kubejs:emberwine").
 * @param {string} [variation] - The potion variation: "splash", "lingering", or undefined for a regular potion.
 */
function getPotionItem(potionID, variation) {
  let baseType = {
    splash: 'minecraft:splash_potion',
    lingering: 'minecraft:lingering_potion'
  };

  let itemType = baseType[variation] || 'minecraft:potion';

  let created = potionID;

  if (debug) console.log(potionID);
  return created
}

// A better version of the drink function.
function realswig(event, instance, thirst, hydration) {
  if (!instance) return;
  let ThirstInstance = instance;
  let calcThirst = ThirstInstance.getThirst() + thirst;
  let calcHydration = ThirstInstance.getHydration() + hydration;
  ThirstInstance.setThirst(Math.max(0, Math.min(20, calcThirst)));
  ThirstInstance.setHydration(Math.max(0, Math.min(20, calcHydration)));

  if (debug) {
    console.log(`Player thirst: ${ThirstInstance.getThirst()}`);
    console.log(`Player hydration: ${ThirstInstance.getHydration()}`);
    console.log(`Player exhaustion: ${ThirstInstance.getExhaustion()}`);
    console.log(`Is player thirsty? ${ThirstInstance.isThirsty()}`);
  }
}

global.effectActionEmberflow = (event, entity, lvl) => {
  // Adjust level to start at 1 for calculation purposes
  let adjustedLevel = lvl + 1;

  if (entity.isPlayer()) {
    let ThirstInstance = ThirstHelper.getThirst(entity);
    if (!ThirstInstance) return;

    if (entity.age % 20 === 0) {
      // Apply base hydration effect, ensuring minimum effect even at level 0
      let currentThirst = ThirstInstance.getThirst();
      realswig(event, ThirstInstance, 1 * adjustedLevel, 0);
      realswig(event, ThirstInstance, 0, 0.5 * adjustedLevel);

      // Adjust chance and boost of random bonus hydration with adjusted level
      if (Math.random() < (0.1 + 0.05 * adjustedLevel)) {
        realswig(event, ThirstInstance, 2 * adjustedLevel, 0);
        realswig(event, ThirstInstance, 0, 1 * adjustedLevel);
      }

      // Adjust exhaustion reduction with adjusted level
      if (entity.age % 100 === 0) {
        ThirstInstance.setExhaustion(Math.max(0, Math.min(20, ThirstInstance.getExhaustion() + -0.25 * adjustedLevel)));
      }

      let isInNether = entity.level.dimension == 'minecraft:the_nether';
      if (isInNether && Math.random() < (0.15 + 0.05 * adjustedLevel)) {
        realswig(event, ThirstInstance, 1 * adjustedLevel, 0.5 * adjustedLevel);
      }
    }

  } else {
    if (entity.age % 20 === 0) {
      // Increase damage dealt to non-player entities with adjusted level
      Utils.server.runCommandSilent(`damage ${entity.username} ${2 * adjustedLevel} ${"minecraft:magic"}`);

      // Visual effect remains the same
      Utils.server.runCommandSilent(`particle minecraft:smoke ${entity.x} ${entity.y + entity.bbHeight / 2} ${entity.z} 0 1 0 0 5 force`);
    }
  }
}