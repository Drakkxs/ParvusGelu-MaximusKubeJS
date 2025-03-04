/// priority: 0
/// requires: irons_spellbooks
// It is not the best way to do it, but it is a way to do it.
let debuglogs = false; // Want some debug?

let player = null;
PlayerEvents.spellPreCast(event => {
    player = event.player;
})

PlayerEvents.tick(event => {

    if (player == null) return;

    console.log("Player is casting a spell");

    player = null;

})