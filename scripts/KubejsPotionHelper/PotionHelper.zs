#modloaded kubejs

println("KubeJS is installed");

import crafttweaker.api.item.IItemStack;
import crafttweaker.api.ingredient.IIngredient;

// Add the brewing recipe
brewing.addRecipe(<item:minecraft:potion>.withTag({Potion: "kubejs:emberwine"}), <item:minecraft:gold_nugget>, <item:kubejs:fermented_heart>);

