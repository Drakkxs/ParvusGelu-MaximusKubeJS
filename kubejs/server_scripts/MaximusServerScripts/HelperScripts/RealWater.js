/// priority: 0
/// requires: toughasnails
// For some reason in toughasnails, flowing water can't be drank.
// It is not the best way to do it, but it is a way to do it.
let debuglogs = false; // Want some debug?

// If someone right clicks water, they should be able to drink it even if it's flowing water.
PlayerEvents.tick(event => {
    let player = event.player;
    if (player.age % 10 !== 0) return; // Only check every 5 ticks for performance
    
    let ThirstInstance = ThirstHelper.getThirst(player)

    let rayTraceResult = player.rayTrace(5); // 5 block reach
    if (rayTraceResult && rayTraceResult.block) {
        let block = rayTraceResult.block;
        let blockStringId = block.id.toString();
        if (blockStringId.includes("minecraft") && blockStringId.includes("water")) {
            if (player.isCrouching() && Client.rightClickDelay != 0) {
                realswig(event, ThirstInstance, 3, 3);

                // Adjust chance and boost of random bonus hydration
                if (Math.random() < (0.1 + 0.05)) {
                    realswig(event, ThirstInstance, 1, 0);
                    realswig(event, ThirstInstance, 0, 1);
                }
            }
        }
    }
});
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