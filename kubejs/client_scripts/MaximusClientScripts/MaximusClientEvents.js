/// priority: 0
// This script is to control the client side of the Maximus ScriptPack
// It is not the best way to do it, but it is a way to do it.
let debug = false; // Want some debug?

ItemEvents.tooltip(event => {
    event.add("#kubejs:forbidden_items", [
        Component.of("Forbidden Item").red().italic(),
        Component.of("Anything to reach the sun.").italic().darkRed()
    ])
})

ClientEvents.lang('en_us', e => {
    e.add("item.minecraft.potion.effect.emberflow", ("§4Potion of Emberflow"))
    e.add("item.minecraft.splash_potion.effect.emberflow", ("§4Splash Potion of Emberflow"))
    e.add("item.minecraft.lingering_potion.effect.emberflow", ("§4Lingering Potion of Emberflow"))
})

ClientEvents.atlasSpriteRegistry("",event => {
    event.register("kubejs:emberflow","textures/item/emberflow_effect.png")
})

ItemEvents.canPickUp("kubejs:fermented_heart", event => {
    sqiush(event.player)
})

ItemEvents.crafted("kubejs:fermented_heart", event => {
    sqiush(event.player)
})

// Flag to track if the sound has been played for the current item selection
let soundplayed = false

PlayerEvents.tick(event => {
    if (event.player.mouseItem.getId() === "kubejs:fermented_heart" && !soundplayed) {
        // Play the sound effect when the player has the Fermented Heart and the sound hasn't been played yet
        sqiush(event.player)
        // Set the flag to true to prevent the sound from playing again while holding the item
        soundplayed = true
    } else if (event.player.mouseItem.getId() !== "kubejs:fermented_heart") {
        // Reset the flag when the player is not holding the Fermented Heart
        // This allows the sound to play again if they re-select the item
        soundplayed = false
    }
})

/**
 * Plays the sound effect of a Magma Cube squishing when the player does
 * something related to the Fermented Heart item.
 *
 * @param {Internal.Player} player The player to play the sound effect for.
 */
function sqiush(player) {
    // sound effect to play
    Utils.server.runCommandSilent(`/playsound minecraft:entity.magma_cube.squish block ${player.username} ${player.x} ${player.y} ${player.z} 3 2`)
}