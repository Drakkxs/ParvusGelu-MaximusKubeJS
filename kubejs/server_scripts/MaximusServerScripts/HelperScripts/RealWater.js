/// priority: 0
// For some reason in toughasnails, flowing water can't be drank.
// It is not the best way to do it, but it is a way to do it.
let realWaterDebug = false; // Want some debug?

// If someone right clicks water, they should be able to drink it even if it's flowing water.
PlayerEvents.tick(event => {
    let player = event.player;
    if (player.age % 10 !== 0) return; // Only check every 5 ticks for performance
    
    let ThirstInstance = ThirstHelper.getThirst(player)
    let playerReach = null;
    try {
        playerReach = player.getAttributeValue('forge:entity_reach');
    } catch (error) {
        playerReach = 5;
    }

    let rayTraceResult = player.rayTrace(Math.ceil(playerReach * 10) / 10);
    if (rayTraceResult && rayTraceResult.block) {
        let block = rayTraceResult.block;
        let blockStringId = block.id.toString();
        if (blockStringId.includes("minecraft") && blockStringId.includes("water")) {
            if (player.isCrouching() && Client.rightClickDelay != 0) {
                realSwig(event, ThirstInstance, 3, 3);

                // Adjust chance and boost of random bonus hydration
                if (Math.random() < (0.1 + 0.05)) {
                    realSwig(event, ThirstInstance, 1, 1);
                }
            }
        }
    }
});

function realSwig(event, instance, thirst, hydration) {

    if (!instance) return;
    let ThirstInstance = instance;
    let calcThirst = ThirstInstance.getThirst() + thirst;
    let calcHydration = ThirstInstance.getHydration() + hydration;
    ThirstInstance.setThirst(Math.max(0, Math.min(20, calcThirst)));
    ThirstInstance.setHydration(Math.max(0, Math.min(20, calcHydration)));
  
    if (realWaterDebug) {
      console.log(`Player thirst: ${ThirstInstance.getThirst()}`);
      console.log(`Player hydration: ${ThirstInstance.getHydration()}`);
      console.log(`Player exhaustion: ${ThirstInstance.getExhaustion()}`);
      console.log(`Is player thirsty? ${ThirstInstance.isThirsty()}`);
    }
}