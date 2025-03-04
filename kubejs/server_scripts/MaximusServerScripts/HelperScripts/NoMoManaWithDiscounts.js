/// priority: 0
// This script is designed to make items require mana to be used.
// It is not the best way to do it, but it is a way to do it.
let noMoManaWithDiscountsDebug = false; // Want some debug?

/**
 * A list of accepted mana sources.
 * 
 * This list is used to determine which items are considered a valid
 * source of mana for the purposes of the script.
 * Mana sources are usually above zero. 
 * If it has zero, it's a special case like the mana mirror where
 * the mana comes from somewhere else.
 * 
 * The list includes the following items:
 * - Botania's Mana Tablet
 * - Botania's Mana Ring
 * - Botania's Greater Mana Ring
 * - Botania's Mana Mirror */
let acceptedManaSources = [
    "botania:mana_tablet",
    "botania:mana_ring",
    "botania:mana_ring_greater",
    "botania:mana_mirror"
];
/**
 * Items with custom mana costs in the Curios inventory.
 * Only includes items without a default mana cost.
 * Maps for managing mana costs of items.
 * @type {Map<string, number>} */
let CuriosManaRequiredItems = new Map();

/**
 * Default mana costs for items.
 * Only includes items without a custom mana cost.
 * Maps for managing mana costs of items.
 * @type {Map<string, number>} */
let DefaultManaRequiredItems = new Map();

/** Mana items that are affected by the player having discount.
 * Typically, this is through armour sets that lower mana cost.
 * Currently, I am not motivated to allow defintion of items that total up to a discount.
 * @type {Map<string, boolean>} */
let ManaDiscountable = new Map();

/**
 * Mana Cost Reference Guide
 * 
 * Base Unit: MBU (Mana Bottle Unit)
 * - 1 MBU = 1 Mana Bottle = 5000 mana
 * - At 10 mana/tick, it takes 500 ticks (25 seconds) to drain 1 MBU
 * 
 * Botania Item Mana Costs:
 * 1. Storage Items:
 *    - Mana Ring: Stores 500,000 mana (100 MBU)
 *    - Mana Tablet: Stores 500,000 mana (100 MBU)
 * 
 * 2. Tools and Weapons:
 *    - Terra Blade: 100 mana per hit (0.02 MBU)
 *    - Manasteel Tools: ~60 mana per block broken (0.012 MBU)
 * 
 * 3. Rods:
 *    - Rod of the Lands: 75 mana per block placed (0.015 MBU)
 *    - Rod of the Skies: 50 mana per tick while active (0.01 MBU/tick, 1 MBU/5 seconds)
 * 
 * 4. Armor:
 *    - Terrasteel Armor: Repairs 1 damage every 20 ticks, costing 10 mana per repair (0.002 MBU)
 * 
 * Custom Items:
 * - Just Potion Rings: 20 mana per tick (0.004 MBU/tick, 1 MBU/12.5 seconds)
 */
// Set mana cost for Just Potion Rings
CuriosManaRequiredItems.set("justpotionrings:ring", 20); // 20 mana/tick, 400 mana/second, 0.08 MBU/second
CuriosManaRequiredItems.set("thaumatics:necklace", 20); // 20 mana/tick, 400 mana/second, 0.08 MBU/second

// Set whether the item's mana cost can be discounted
ManaDiscountable.set("justpotionrings:ring", true);


/**
 * Player Tick Event Handler
 * This event runs every tick for each player, managing mana costs for items in both inventory and Curios slots.
 * It calculates the total mana cost, drains mana from available sources, and handles cases where mana is insufficient.
 */
PlayerEvents.tick(event => {
    let player = event.player;
        // Get all items from both main inventory and Curios
        let mainItems = player.inventory.getAllItems();
        let curiosItems = [];
        
        // Deprecated
        // let curiosCapability = CuriosApi.getCuriosHelper().getCuriosHandler(player).orElse(null);
        let curiosCapability = CuriosApi.getCuriosInventory(player).orElse(null);
        if (curiosCapability) {
            curiosCapability.getCurios().forEach((identifier, stacksHandler) => {
                if (stacksHandler instanceof ICurioStacksHandler) {
                    try {
                        let stacks = stacksHandler.getStacks();
                        for (let i = 0; i < stacksHandler.getSlots(); i++) {
                            let item = stacks.getStackInSlot(i);
                            if (!item.isEmpty()) {
                                curiosItems.push(item);
                            }
                        }
                    } catch (e) {
                        if (noMoManaWithDiscountsDebug) console.log(`Error accessing stacks for ${identifier}: ${e}`);
                    }
                }
            });
        }
        
        // Give all items nbt if they don't have it
        let newArray = mainItems.concat(curiosItems);
        newArray.forEach(item => {
            try {
              item.nbt.putString("inventorytype", "");
            } catch (error) {
                mainItems = mainItems.filter(item => item.hasNBT());
                curiosItems = curiosItems.filter(item => item.hasNBT());
            }

            if (item.nbtString.includes("inventorytype")) {
                item.nbt.remove("inventorytype");
            }
        })

        // Mark which inventory the item is from
        // Activate potion rings in the main inventory
        mainItems.forEach(item => { 
            item.nbt.putString("inventorytype", "main");

            if (CuriosManaRequiredItems.has(String(item.getId()))) {
              changeItemActivationState(player, item, true);
            }
        })
        
        curiosItems.forEach(item => {
            item.nbt.putString("inventorytype", "curios");
            
        })

        // Activate potion rings in the mouse
        if (player.getMouseItem().id === "justpotionrings:ring") {
          changeItemActivationState(player, player.getMouseItem(), true);
        }

        // Calculate mana costs separately
        let curiosManaCost = calculateTotalManaCost(player, curiosItems);
        let inventoryManaCost = calculateTotalManaCost(player, mainItems);
        let totalManaCost = curiosManaCost + inventoryManaCost;
        
        if (noMoManaWithDiscountsDebug) {
          console.log(`Curios Mana Cost: ${curiosManaCost}`);
          console.log(`Inventory Mana Cost: ${inventoryManaCost}`);
          console.log(`Total Mana Cost: ${totalManaCost}`);
        }
        
        if (totalManaCost > 0) {
            let manaPaid = drainManaFromItems(player, mainItems.concat(curiosItems), totalManaCost);
            if (noMoManaWithDiscountsDebug) console.log(`Mana paid: ${manaPaid}, Total cost: ${totalManaCost}`);
        } else {
            if (noMoManaWithDiscountsDebug) console.log("No items requiring mana found.");
        }
});

/**
 * @param {Internal.Player} player - The player who owns the item.
 * @param {Internal.ItemStack} itemStack - The item stack to modify.
 * @param {boolean} activate - Whether to activate (true) or deactivate (false) the item.
 * @returns {boolean} - Returns true if the operation was successful, false otherwise.
 */
function changeItemActivationState(player, itemStack, activate) {
    if (noMoManaWithDiscountsDebug) console.log("Calculating total mana cost");

    if (!itemStack || itemStack.isEmpty()) {
        if (noMoManaWithDiscountsDebug) console.log("Invalid item stack provided.");
        return false;
    }

    // Switch statement removed for a if statement to allow scoped variables

    let itemStackID = itemStack.getId();
    // Check if the item is a potion ring
    if (itemStackID === "justpotionrings:ring") {
        let nbt = itemStack.getNbt();
        if (!nbt) {
            if (noMoManaWithDiscountsDebug) console.log("Item has no NBT data.");
            return false;
        }

        let effect = nbt.getString("effect");
        if (!effect) {
            if (noMoManaWithDiscountsDebug) console.log("Item has no effect data.");
            return false;
        }

        // Check if the effect is already in the desired state
        let isCurrentlyActive = !effect.endsWith("__");
        if (isCurrentlyActive === activate) {
            if (noMoManaWithDiscountsDebug) console.log(`Item is already in the desired state: ${activate ? "active" : "inactive"}`);
            return true;
        }

        let newEffect = effect;
        let inventorytype = nbt.getString("inventorytype");

        // If the item is in the main inventory, always set the effect to active
        if (inventorytype !== "curios") {
            // Ensure the effect is always active if not in the Curios inventory
            newEffect = newEffect.replace("__", "");
        } else {
            // Modify the effect string based on the activate parameter for Curios inventory
            if (activate) {
                newEffect = newEffect.replace("__", "");
            } else {
                newEffect += "__";
            }
        }
        
        // Update the effect NBT tag with the new effect string
        nbt.putString("effect", newEffect);

        if (noMoManaWithDiscountsDebug) console.log(`Changed activation state of ${itemStack.getId()} to ${activate ? "active" : "inactive"}`);
        return true;
    }
    else if (itemStackID === "thaumatics:necklace") {
        let nbt = itemStack.getNbt();
        if (!nbt) {
            if (noMoManaWithDiscountsDebug) console.log("Item has no NBT data.");
            return false;
        }

        let hasEnabledNbt = nbt.contains("enabled");
        if (!hasEnabledNbt) {
            if (noMoManaWithDiscountsDebug) console.log("Item has no enabled data.");
            return false;
        }

        let enabledBoolean = nbt.getBoolean("enabled");
        // Check if enabled is already in the desired state
        if (enabledBoolean === activate) {
            if (noMoManaWithDiscountsDebug) console.log(`Item is already in the desired state: ${activate ? "active" : "inactive"}`);
            return true;
        }

        let newEnabledBoolean = enabledBoolean;
        let inventorytype = nbt.getString("inventorytype");

        // If the item is in the main inventory, always set the effect to active
        if (inventorytype !== "curios") {
            // Ensure the effect is always active if not in the Curios inventory
            newEnabledBoolean = true;
        } else {
            // Modify the effect string based on the activate parameter for Curios inventory
            if (activate) {
                newEnabledBoolean = true;
            } else {
                newEnabledBoolean = false;
            }
        }
        
        // Update the effect NBT tag with the new effect string
        nbt.putBoolean("enabled", newEnabledBoolean);

        if (noMoManaWithDiscountsDebug) console.log(`Changed activation state of ${itemStack.getId()} to ${activate ? "active" : "inactive"}`);
        return true;
    }
    else {
        if (noMoManaWithDiscountsDebug) console.log("Item has no activation logic.");
        return false;
    }
}

// TODO: SOUL CRUSH AND DREAD BIND CALCULATION

/**
 * Calculates the total mana cost for a list of items.
 * @param {Internal.Player} player - The player that has the items
 * @param {Array<ItemStack>} items - The list of item stacks to check.
 * @returns {number} The total mana cost for all items.
 */
function calculateTotalManaCost(player, items) {
  let totalCost = 0;
  items.forEach(item => {
      let itemId = String(item.getId());
      let inventoryType = item.nbt.getString("inventorytype");
      let cost = 0;
      if (inventoryType === "curios") {
          cost = CuriosManaRequiredItems.get(itemId) || 0;
      } else {
          cost = DefaultManaRequiredItems.get(itemId) || 0;
      }

      let discount = ManaItemHelp.getFullDiscountForTools(player, item)

      if (ManaDiscountable.get(itemId) && discount > 0) {
            if (noMoManaWithDiscountsDebug) console.log(`Discount for ${player.username} is ${discount}`)
            cost = Math.max(0, Math.floor(cost - (discount * cost)));
      }

      totalCost += cost;
      if (noMoManaWithDiscountsDebug && cost > 0) console.log(`${itemId} in ${inventoryType} has a mana cost of ${cost}`);
  });
  return totalCost;
}

// TODO: MANA ADDITION

// /**
// * Attempts to drain the required amount of mana from available items.
// * @param {Internal.Player} player - The player who has the items.
// * @param {Array<ItemStack>} items - The list of items that will gain mana.
// * @param {number} totalCost - The total amount of mana to add.
// * @returns {number} The amount of mana successfully drained.
// */
// function addManaToItems(player, items, totalCost) {
//   if (totalCost === 0) {
//       return true; // No mana to add
//   }

//   let manaSourceItems = items.filter(stack => acceptedManaSources.includes(String(stack.getId())));
//   let manaAdded = false;

//   for (let sourceStack of manaSourceItems) {
//       let sourceId = String(sourceStack.getId());
//       if (NoMoManaWithDiscountsDebuglogs) console.log(`Attempting to add ${totalCost} mana to ${sourceId}`);
//       try {
//           let remainingMana = addMana(player, sourceStack, totalCost);
//           if (NoMoManaWithDiscountsDebuglogs) console.log(`Remaining mana after drain: ${remainingMana}`);
//           if (remainingMana >= 0) {
//               manaAdded = true;
//               if (NoMoManaWithDiscountsDebuglogs) console.log(`Successfully added ${totalCost} mana to ${sourceId}`);
//               break;
//           }
//       } catch (e) {
//           if (NoMoManaWithDiscountsDebuglogs) console.log(`Issue draining mana from ${sourceId}: ${e}`);
//       }
//   }
//   return manaAdded;
// }



/**
* Attempts to drain the required amount of mana from available items.
* @param {Internal.Player} player - The player who has the items.
* @param {Array<ItemStack>} items - The list of items to be drained.
* @param {number} totalCost - The total amount of mana to drain.
* @returns {number} The amount of mana successfully drained.
*/
function drainManaFromItems(player, items, totalCost) {
  if (totalCost === 0) {
      return true; // No mana needed
  }

  let manaSourceItems = items.filter(stack => acceptedManaSources.includes(String(stack.getId())));
  let manaPaid = false;

  for (let sourceStack of manaSourceItems) {
      let sourceId = String(sourceStack.getId());
      if (noMoManaWithDiscountsDebug) console.log(`Attempting to drain ${totalCost} mana from ${sourceId}`);
      try {
          let remainingMana = drainMana(player, sourceStack, totalCost);
          if (noMoManaWithDiscountsDebug) console.log(`Remaining mana after drain: ${remainingMana}`);
          if (remainingMana >= 0) {
              manaPaid = true;
              if (noMoManaWithDiscountsDebug) console.log(`Successfully drained ${totalCost} mana from ${sourceId}`);
              break;
          }
      } catch (e) {
          if (noMoManaWithDiscountsDebug) console.log(`Issue draining mana from ${sourceId}: ${e}`);
      }
  }

  if (!manaPaid) {
      if (noMoManaWithDiscountsDebug) console.log(`Failed to drain total mana cost of ${totalCost}, no valid mana source found or not enough mana.`);
      // Deactivate items that require mana
      items.forEach(item => {
          if (CuriosManaRequiredItems.has(String(item.getId())) || DefaultManaRequiredItems.has(String(item.getId()))) {
              changeItemActivationState(player, item, false);
          }
      });
  } else {
      // Activate items as mana is available
      items.forEach(item => {
          if (CuriosManaRequiredItems.has(String(item.getId())) || DefaultManaRequiredItems.has(String(item.getId()))) {
              changeItemActivationState(player, item, true);
          }
      });
  }

  return manaPaid;
}

/**
 * Drains a given amount of mana from a mana source.
 * @param {Internal.Player} player - The player who has the items.
 * @param {Internal.ItemStack} stack - The mana source item stack.
 * @param {number} cost - The amount of mana to drain.
 * @returns {number} - Returns the amount of mana left in the item, or -1 for errors.
 */
function drainMana(player, stack, cost) {
    // Ensure the item is an accepted mana source.
    if (acceptedManaSources.indexOf(stack.id) === -1) {
      if (noMoManaWithDiscountsDebug) console.log(`Stack ID ${stack.id} is not a valid mana source.`);
      return -1;
    }

    if (stack.nbtString.indexOf("creative") !== -1) {
      if (noMoManaWithDiscountsDebug) console.log(`Stack ID ${stack.id} is creative. ${stack.nbtString}`);
      return 0;
    }
  
    if (noMoManaWithDiscountsDebug) console.log(`Attempting to drain ${cost} mana from stack ID ${stack.id}.`);
  
    // If this is a Mana Mirror, drain mana from the linked mana pool.
    if (stack.id === "botania:mana_mirror") {
      // Validate that the mirror contains position and dimension data.
      let posNBT = stack.nbt ? stack.nbt.getCompound("pos") : null;
      if (!posNBT || !posNBT.contains("pos") || !posNBT.contains("dimension")) {
        if (noMoManaWithDiscountsDebug) console.log("Invalid Mana Mirror: Missing position or dimension data.");
        return -2;
      }
  
      // Extract the position and dimension.
      let posArray = posNBT.getIntArray("pos");
      let dimension = posNBT.getString("dimension");
  
      // Get the block entity (mana pool) at the linked position.
      let level = Utils.getServer().getLevel(dimension);
      if (!level) {
        if (noMoManaWithDiscountsDebug) console.log(`Invalid dimension: ${dimension}`);
        return -2;
      }
      let poolEntity = level.getBlock(posArray[0], posArray[1], posArray[2]);
      if (!poolEntity) {
        if (noMoManaWithDiscountsDebug) console.log("No block entity found at the Mana Mirror's linked position.");
        return -2;
      }
  
      // Check if the mana pool has enough mana.
      let currentMana = poolEntity.entityData.getInt("mana");
      if (currentMana) {
        let remaningMana = Math.max(currentMana - cost, 0)
        poolEntity.setEntityData({ mana: remaningMana })
        if (noMoManaWithDiscountsDebug) console.log(`Drained ${cost} mana from Mana Pool at ${posArray} in dimension ${dimension}.`);
        return remaningMana;
      } else {
        if (noMoManaWithDiscountsDebug) console.log("Not enough mana in Mana Mirror.");
        return -1;
      }
    }
    // Default case: drain mana directly from the item.
    else {
      if (stack.nbt && stack.nbt.contains("mana")) {
        let currentMana = stack.nbt.getInt("mana");
        if (currentMana) {
          let remaningMana = Math.max(currentMana - cost, 0)
          stack.nbt.putInt("mana", remaningMana);
          if (noMoManaWithDiscountsDebug) console.log(`Drained ${cost} mana from stack ID ${stack.id}.`);
          return remaningMana;
        }
      }
      if (noMoManaWithDiscountsDebug) console.log("Not enough mana in stack or missing mana data.");
      return -1;
    }
  }