/// priority: 0
// This script is designed to clear the inventory and curios of a player when they log in.
// This is to ensure that the player does not have items from a previous error session.
// It is not the best way to do it, but it is a way to do it.
let debuglogs = false; // Want some debug?

// Remember that inventory you had? Forget it.
PlayerEvents.loggedIn(event => {
    Utils.server.runCommandSilent(`/effect clear ${event.player.username}`);
})