/// priority: 0
// This script is designed to clear the inventory and curios of a player when they log in.
// This is to ensure that the player does not have items from a previous error session.
// It is not the best way to do it, but it is a way to do it.
let debuglogs = false; // Want some debug?

// Remember that inventory you had? Forget it.
PlayerEvents.loggedIn(event => {
    Utils.server.runCommandSilent(`/clear ${event.player.username}`);
    Utils.server.runCommandSilent(`/curios reset ${event.player.username}`);
})

PlayerEvents.chat(event => {
    let orginalMessage = event.message;
    let player = event.player;
  
    // We don't want to do anything with commands to avoid breaking them
    if (orginalMessage.startsWith("/")) return;
  
    // Date() is a constructor so we need to use new
    let hours = new Date().getHours();
    let minutes = new Date().getMinutes();

    // Wheater or not the player is an operator
    let operatorLevel = player.server.getOperatorUserPermissionLevel();
    let playerOperatorLevel = player.hasPermissions(operatorLevel);

    let permissionDisplay ="";
    if (playerOperatorLevel) {
        permissionDisplay = "[OP]";
    }

    let newMessage = `§8${hours.toString()}:${minutes.toString()} §7| §2${player.username.toString()}${permissionDisplay}§7: ${event.message.replace('&', '§')}`
    
    event.server.tell(newMessage)
    event.cancel();
  })