//priority: 0
//requires: gateways
// Using this script, you can play custom themes for gateways!

/** Immediately Invoked Function Expression (IIFE)
 * This pattern is used to encapsulate the code within a local scope.
 * It prevents polluting the global namespace and avoids conflicts with other scripts.
 */
(() => {

    /** Varible Landscape */
    
    /**
     * Want some debug?
     * - Whether or not to show debug logs.
     * - This boolean is used to enable or disable the debug mode of the script.
     * - This shouldn't be enabled in production, it will spam the console with logs
     */
    let debug = false;

    /**
     * A map of gateway UUIDs to an array of player UUIDs that the gateway is currently playing to.
     * This is used to keep track of which players are currently listening to a gateway's theme.
     * The key is the gateway's UUID, and the value is an array of UUIDs of the players that the gateway is playing to.
     * @type {Map<Internal.UUID, Internal.UUID[]>}
     */
    let listeners = new Map();

    /**
     * A map of active gateway UUIDs to their gateway type.
     * This is used to keep track of which gateways are currently active.
     * @type {Map<Internal.UUID, string>}
     */
    let activeGateways = new Map();

    /**
     * A map of gateway themes. Matches the gateway type to the themes.
     * The position of the themes should match to the wave number.
     * Zero is first, one is second, etc.
     * 
     * SilentRandom: a placeholder theme that allows a gateway to spawn without a theme. Include this theme if you want a chance for the gateway to spawn without a theme.
     * SilentWave: a placeholder wave theme that won't be picked up by the random theme function. Include this if you want wave based themes.
     */
    let gateThemes = new Map([
        
        ["gateways:basic/enderman", [
            "minecraft:music_disc.cat", 
            "minecraft:music_disc.pigstep", 
            "minecraft:music_disc.mellohi", 
            "minecraft:music_disdc.blocks", 
            "minecraft:music_disc.chirp", 
            "minecraft:music_disc.far"
        ]],

        ["gateways:basic/blaze", [
            "minecraft:music_disc.pigstep"
        ]],

        ["gateways:basic/sdlime", [
            "minecraft:music_disc.mellohi"
        ]],

        ["gateways:emerald_grove", [
            "minecraft:music_disc.blocks"
        ]],

        ["gateways:overworldian_nights", [
            "minecraft:music_disc.chirp"
        ]],

        ["gateways:hellishd_fortress", [
            "minecraft:music_disc.far"
        ]]
    ]);

    /** End Varible Landscape */
    
    /** Class Landscape */

    /** 
     * By loading the gateway class we get access to the methods available for gate entites.
     * * We can use this class to create gateway entities, and check if they are a gateway.
     * * * By checking entities against this class, it requires that the loaded class be up to date.
     * * Thanks to probeJS, the methods this class has implented on Internal.Entity are shown to us.
     * * We can use JSdoc to type a variable to see both the methods of Internal.Entity and the gateway entity.
     * * You can see this in the object that is returned from getGateObject, at the properties entityG and entityV.
     */
    let GatewayEntityClass = Java.loadClass('dev.shadowsoffire.gateways.entity.GatewayEntity');
    
    /**
     * This is a registry of gateways.
     * We use this to check for vaild gateways to play themes on.
     */
    let GatewayRegistryClass = Java.loadClass('dev.shadowsoffire.gateways.gate.GatewayRegistry');
    
    /**
     * Returns an array of all the gate types in the game.
     * This function uses the GatewayRegistryClass to dynamically retrieve the list of gate types.
     * It's a convenient way to get the list of gate types without having to hardcode them.
     * @return {string[]} An array of all the gate types in the game.
     */
    function InternalGateTypes() {
        /**
         * The instance of the GatewayRegistryClass.
         * We use this to access the keys of the registry, which are the gate types.
         * @type {GatewayRegistryClass}
         */
        let registry = GatewayRegistryClass.INSTANCE;

        /**
         * The array of gate types.
         * This is retrieved from the keys of the registry.
         * @type {string[]}
         */
        let gateTypes = registry.getKeys();

        return gateTypes;
    }

    /**
     * Load the ForgeRegistries class to access various registries in Forge.
     * This will allow us to interact with different game elements like sounds, items, etc.
     */
    let ForgeRegistries = Java.loadClass('net.minecraftforge.registries.ForgeRegistries');

    /**
     * Access the sound events registry from ForgeRegistries.
     * This registry contains all sound events available in the game.
     */
    let SoundRegistryClass = ForgeRegistries.SOUND_EVENTS;

    /**
     * This class pertains to record items (i.e music dics)
     * We use it to retrive the length of sounds without having to provided manual tick durations.
     */
    let RecordItem = Java.loadClass('net.minecraft.world.item.RecordItem');

    /** End Class Landscape */

    /**
     * Checks if the given gateway ID is registered in the gateway registry.
     * This prevents crashes from a invalid resource location.
     * @param {string[]} gatewayId - The string ID of the gateway to check.
     * @param {boolean} [demo] - This demo flags stops the output of the error message to avoid confusing users.
     * @returns True if the gateway is registered, false otherwise.
     * @see {@link https://github.com/Shadows-of-Fire/GatewaysToEternity/blob/fa1ae6a73b1afe43d40b62711c6269e0cd232a7d/src/main/java/dev/shadowsoffire/gateways/command/GatewayCommand.java#L43C1-L44C1 | Source}
     */
    function isRegisteredGateway(gatewayId, demo) {
        /** 
         * Check if the gateway ID is an array, and if it is, map it to a new array. 
         * If it is not an array, then map it to an array with one element.
         * We do this because map is not a method of non-array objects.
        */
        return Array.from(gatewayId).map(id => {
            try {
                // Check to make sure the given gateway ID is valid
                if (!ResourceLocation.isValidResourceLocation(id)) throw new Error("Invalid Gateway Resource Location");
                // Get the holder for the given gateway ID
                let holder = GatewayRegistryClass.INSTANCE.holder(id);
                // Check if the holder is bound
                if (debug && !holder.isBound()) console.warn(`Gateway ${id} is not registered`);
                return holder.isBound();
            } catch (e) {
                // Log an error if the gateway fails to register
                if (debug && !demo) {
                    console.log(`Gateway ${id} immediately failed to register`);
                    console.warn(e);
                }
                return false;
            }
        });
    }

    /**
     * Checks if a given sound is registered in the sound registry.
     * This prevents crashes from a invalid resource location.
     * @param {string[]} soundId - The string ID of the sound to check.
     * @param {boolean} [demo] - This demo flags stops the output of the error message to avoid confusing users.
     * @returns True if the sound is registered, false otherwise.
     */
    function isRegisteredSound(soundId, demo) {
        return Array.from(soundId).map(id => {
            try {
                // Check to make sure the given sound ID is valid
                if (!ResourceLocation.isValidResourceLocation(id)) throw new Error("Invalid Sound Resource Location");
                // Get the holder for the given sound ID
                let holder = SoundRegistryClass.getHolder(id);
                // Check if the holder is bound
                if (debug && !holder.isPresent()) console.warn(`Sound ${id} is not registered`);
                return holder.isPresent();
            } catch (e) {
                // Log an error if the sound fails to register
                if (debug && !demo) {
                    console.log(`Sound ${id} immediately failed to register`);
                    console.warn(e);
                }
                return false;
            }
        });
    }

    /**
     * This function is used to test the gateway validation.
     * It makes sure that the first holder is bound, and the second is not.
     * If the first holder is bound and the second is not, then the validation is working.
     * Otherwise, it is not working.
     */
    function testGateTypeValidation() {
        let testValidGateway = 'gateways:basic/blaze';
        let testInvalidGateway = 'gateways:basic/blaze ';

        if (!isRegisteredGateway([testValidGateway],1)[0] || isRegisteredGateway([testInvalidGateway],1)[0]) {
            console.warn('Gateway Validation is NOT working!');
        }
    }

    /**
     * This function is used to test the sound registration.
     * It makes sure that the valid sound is registered correctly.
     * The valid sound should be present in the sound registry.
     * The invalid sound should not be present in the sound registry.
     * If the valid sound is not registered or the invalid sound is registered, log a warning.
     */
    function testSoundRegistration() {
        /**
         * Test a valid sound ID to ensure it is registered correctly.
         * This sound ID should be present in the sound registry.
         */
        let testValidSound = 'minecraft:music_disc.cat';

        /**
         * Test an invalid sound ID to ensure it is not mistakenly registered.
         * The trailing space makes this ID invalid.
         */
        let testInvalidSound = 'minecraft:music_disc.cat ';

        /**
         * Validate sound registration.
         * If the valid sound is not registered or the invalid sound is registered, log a warning.
         */
        if (!isRegisteredSound([testValidSound],1)[0] || isRegisteredSound([testInvalidSound],1)[0]) {
            console.warn('Sound Validation is NOT working!');
        }
    }

    /** 
     * An object containing gateway events.
     * These events are added by the Gateways mod and can be used to handle various gateway lifecycle events.
     * The events are exposed to us thanks to probeJS, allowing for better code completion and type checking.
     */
    let GatewaysEvents = {
        /**
         * GateEvent is the base event for all gateway events.
         */
        GateEvent: Java.loadClass('dev.shadowsoffire.gateways.event.GateEvent'),
        /**
         * GateEvent$Completed is fired when a Gateway is successfully completed.
         */
        Completed: Java.loadClass('dev.shadowsoffire.gateways.event.GateEvent$Completed'),
        /**
         * GateEvent$Failed is fired when a gateway is failed for any reason.
         */
        Failed: Java.loadClass('dev.shadowsoffire.gateways.event.GateEvent$Failed'),
        /**
         * GateEvent$Opened is fired when a Gateway is opened.
         * * When a gateway is spawned there is a countdown before it is opened.
         * * This event is triggered when the countdown is over.
         */
        Opened: Java.loadClass('dev.shadowsoffire.gateways.event.GateEvent$Opened'),
        /**
         * GateEvent$WaveEnd is fired when a wave is completed, but before the current wave counter is incremented.
         */
        WaveEnd: Java.loadClass('dev.shadowsoffire.gateways.event.GateEvent$WaveEnd'),
        /**
         * The event class for when a wave entity is spawned.
         * * This event is triggered when a wave entity is spawned.
         */
        WaveEntitySpawned: Java.loadClass('dev.shadowsoffire.gateways.event.GateEvent$WaveEntitySpawned'),
    }

    /**
     * Validates all gate types to ensure all gateways are registered.
     * If any gateways are unregistered, logs their IDs.
     * Also validates all gate themes to ensure all themes are registered.
     * If any themes are unregistered, logs their IDs, and the gate type they belong to.
     */
    function testGateMapRegistration() {
        /**
         * Validates all gate types to ensure all gateways are registered.
         * If any gateways are unregistered, logs their IDs.
         */
        let unregisteredGateTypes = Array.from(gateThemes.keys()).filter(key => !isRegisteredGateway([key])[0]);
        if (unregisteredGateTypes.length > 0) {
            console.warn(`The following gate types are not registered: ${unregisteredGateTypes.join(", ")}`);
        }

        /** 
         * Validates all gate themes to ensure all themes are registered.
         * If any themes are unregistered, logs their IDs, and the gate type they belong to.
         */
        let unregisteredThemes = Array.from(gateThemes.entries()).filter(([gateType, theme]) => !isRegisteredSound(theme)[0]);
        if (unregisteredThemes.length > 0) {
            console.warn(`The following themes are not registered: ${unregisteredThemes.map(([gateType, theme]) => `${theme} (gate type: ${gateType})`).join(", ")}`);
        }

        if (debug) {
            console.log(`Internally registered gate types: ${InternalGateTypes()}`);
        }
    }

    /**
     * Runs a series of tests to validate various aspects of the script.
     * This is run when the script is first loaded, and after the /reload command is ran to check for new gateways.
     * Validation will not run outisde of debug mode to avoid re-checking a working script. 
     * If we know the script is working, we don't need to validate it.
     * The tests check for the following:
     * - That the server is running.
     * - That all gate types are registered.
     * - That all gate themes are registered.
     */
    function testAllCore() {
        // A series of tests to validate the gateways.
        if (debug) {
            // Check if the server is running.            
            if (!Utils.getServer()) {
                console.warn('The server is not running. Datapacks are likely not loaded, Gateways are made with datapacks. Skipping Validation.');
                return;
            }
            // Check if all gate types are registered.
            testGateTypeValidation();

            // Check if all gate themes are registered.
            testSoundRegistration();

            // Check if gate map registration
            testGateMapRegistration();
        }
    }testAllCore();

    /**
     * Retrieves the leash range for a specified gateway entity.
     * @param {Internal.Entity & Internal.GatewayEntity} gatewayEntity - The gateway entity to retrieve the leash range from
     * @returns {number} The leash range of the gateway entity
     */
    function getLeashRange(gatewayEntity) {
        return gatewayEntity.gateway.rules().leashRange();
    }

    /**
     * Finds all gateways within a certain range of a given entity.
     * @param {Internal.Entity & Internal.GatewayEntity} entity The entity to search for gateways around
     * @returns {Internal.GatewayEntity[]} An array of gateway entities found within range
     */
    function getNearbyGateways(entity) {
        let range = getLeashRange(entity);
        let nearbyEntities = entity.level.getEntitiesWithin(entity.boundingBox.inflate(range ** 2));
        let gateways = nearbyEntities.filter(e => e instanceof GatewayEntityClass);
        return gateways;
    }

    /**
     * Retrieves all players within range of a gateway entity.
     * @param {Internal.Entity & Internal.GatewayEntity} gatewayEntity The gateway entity to retrieve players for
     * @returns {string[]} An array of player UUID strings
     */
    function getGatePlayers(gatewayEntity) {
        let leashRange = getLeashRange(gatewayEntity);
        let players = gatewayEntity.level.getEntitiesWithin(gatewayEntity.boundingBox.inflate(leashRange ** 2)).filter(entity => entity.isPlayer());
        return players.map(player => player.getStringUuid());
    }

    /**
     * Gets the type of a gateway entity.
     * @param {Internal.Entity & Internal.GatewayEntity} entity The gateway entity to get the type of
     * @returns {string} The type of the gateway, normalized to lowercase.
     */
    function getGateType(entity) {
        return entity.nbt.getString("gate").normalize();
    }

    /**
     * Gets a random theme from the gateThemes map
     * @param {Internal.Entity & Internal.GatewayEntity} entity The gateway entity to get the theme for
     * @returns {string} The theme, or undefined if no theme is found
     */
    function getRandomTheme(entity) {
        // Attempt to find a random gateway theme
        let randomTheme = gateThemes.get(getGateType(entity))[Math.floor(Math.random() * gateThemes.get(getGateType(entity)).length)];
        return randomTheme;
        
    }

    /**
     * Stops a gateway theme
     * @param {Internal.Entity & Internal.GatewayEntity} gateway The gateway entity to stop the theme for
     * @returns {Internal.UUID} The UUID of the gateway on success
     */
    function stopTheme(gateway) {
        let gatewayUUID = gateway.getStringUuid();
        let server = gateway.getServer();
        if (debug) console.log(`Stopper: Server is ${server}`);

        if (debug) console.log(`Stopper: Stopping theme for ${gatewayUUID}`);

        // Get the players that are currently listening to the gateway or nearby players
        
        let playerListeners = listeners.get(gatewayUUID) || listeners.set(gatewayUUID, getGatePlayers(gateway, "Stopper")).get(gatewayUUID);
        if (debug) console.log(`Stopper: Player listeners for ${gatewayUUID} are ${playerListeners}`);

        // Get the theme that is currently playing or its initial theme
        let currentTheme = gateway.persistentData.getString("gate.theme").normalize();

        if (debug) console.log(`Stopper: Theme to stop for ${gatewayUUID} is ${currentTheme}`);

        // Stop the theme for the listeners
        playerListeners.forEach((player) => {
            if (debug) console.log(`Stopper: Stopping sound for player ${player}`);
            server.runCommandSilent(`/execute as ${player} run stopsound @s * ${currentTheme}`);
        });

        // Cleanup
        if (listeners.delete(gatewayUUID)) {
            if (debug) console.log(`Stopper: Cleanup successful for ${gatewayUUID}`);
            return gatewayUUID;
        }

        if (debug) console.log(`Stopper: Cleanup failed for ${gatewayUUID}`);
        return null;
    }

    /**
     * Plays a random theme for the given gateway entity.
     * @param {Internal.Entity & Internal.GatewayEntity} entity The gateway entity to play the theme for
     * @returns {Internal.UUID} The UUID of the gateway on success
     */
    function playTheme(entity) {
        let gatewayUUID = entity.getStringUuid();
        let gatetype = getGateType(entity);

        // Stop the theme of this gateway and nearby ones.
        getNearbyGateways(entity).forEach(gateway => stopTheme(gateway));
        
        // Get the themes for the gateway type
        let themes = gateThemes.get(gatetype);
        if (themes === undefined) {
            if (debug) console.log(`ThemePlayer: No themes found for gateway type: ${gatetype}`);
            return null;
        }
        
        // Choose a random theme
        let theme = getRandomTheme(entity);

        // Get the leash range from the gateway rules
        let leashRange = getLeashRange(entity);


        // Get the entities within range of the sound
        // We use it here to avoid targeting players that are too far away, out of sight, invisible, etc.
        let nearbyPlayers = getGatePlayers(entity, "ThemePlayer for " + gatetype);
        if (!nearbyPlayers) {
            if (debug) console.log(`ThemePlayer: No players found within leash range for gateway: ${gatetype}`);
            return null;
        }

        // Update the player listeners and the now playing
        listeners.set(gatewayUUID, nearbyPlayers);
        if (debug) console.log(`ThemePlayer: Set listeners for gateway: ${gatetype} to: ${listeners.get(gatewayUUID)}`);

        if (listeners.get(gatewayUUID) === undefined) {
            if (debug) console.log(`ThemePlayer: Failed to set listeners or nowPlaying for gateway: ${gatetype}`);
            return null;
        }

        // Play the theme for the players
        entity.playSound(theme, leashRange, 1);
        
        if (debug) console.log(`ThemePlayer: Playing theme: ${theme} at volume: ${leashRange} for gateway: ${gatetype}`);

        return gatewayUUID;
    }

    /**
     * Event listeners for Forge are registered once during startup.
     * To ensure flexibility, we define a global function for each event.
     * These functions execute when their respective events are triggered.
     * 
     * Each function is wrapped in a try-catch block to prevent server crashes due to unhandled exceptions.
     * 
     * The global object is prefixed with "parvus" to ensure uniqueness, but that is a name of my choice.
     * You may choose a different prefix that suits your project or personal style.
     */
    global.parvusGateWayEvents = {
        
        /**
         * Called when a GateEvent is triggered.
         * @param {Internal.GateEvent} event The event being triggered.
         * @returns {void}
         */
        GateEvent: function (event) {try{
            
        }catch(err){console.log(err)}
        },
    
        /**
         * Called when a GateEvent$Completed is triggered.
         * @param {Internal.GateEvent$Completed} event The event being triggered.
         * @returns {void}
         */
        Completed: function (event) {try{

            console.log(`CompletedEvent: Stopped theme for ${stopTheme(event.getEntity())}`);

        }catch(err){console.log(err)}
        },
    
        /**
         * Called when a GateEvent$Failed is triggered.
         * @param {Internal.GateEvent$Failed} event The event being triggered.
         * @returns {void}
         */
        Failed: function (event) {try{

            console.log(`FailedEvent: Stopped theme for ${stopTheme(event.getEntity())}`);
            
        }catch(err){console.log(err)}
        },
    
        /**
         * Called when a GateEvent$Opened is triggered.
         * @param {Internal.GateEvent$Opened} event The event being triggered.
         * @returns {void}`
         */
        Opened: function (event) {try{


        }catch(err){console.log(err)}
        },
    
        /**
         * Called when a GateEvent$WaveEnd is triggered.
         * @param {Internal.GateEvent$WaveEnd} event The event being triggered.
         * @returns {void}
         */
        WaveEnd:function (event) {try{

            playTheme(event.getEntity());

        }catch(err){console.log(err)}
        },
    
        /**
         * Called when a GateEvent$WaveEntitySpawned is triggered.
         * This every time a wave entity is spawned.
         * @param {Internal.GateEvent$WaveEntitySpawned} event The event being triggered.
         * @returns {void}
         */
        WaveEntitySpawned: function (event) {try{
            
            // Example: Retrive the gateway that spawned the wave entity
            // let gatewayUUID = event.getEntity().getUuid().toString();
            // if (debug) console.log(`Retriving gateway UUID: ${gatewayUUID}`);

            // It's not a good idea to try and play a theme from this event, as it may be called multiple times.

        }catch(err){console.log(err)}
        },
    
        /**
         * Called when a net.minecraftforge.event.entity.EntityLeaveLevelEvent is triggered.
         * This is hopefully going to be used to detect when a gateways entity leaves the level.
         * It is called for the ServerLevel and ClientLevel so it ends up being called twice.
         * @param {Internal.EntityLeaveLevelEvent} event The event being triggered.
         * @returns {void}
         */
        LeaveLevel: function (event) {try{
            // Ensure not client
            if (event.level.isClientSide()) return;

            // If the entity is not a gateway entity, return
            if (!(event.getEntity() instanceof GatewayEntityClass)) return;
            
            // If the gateway has already been stopped, return
            if (event.getEntity().persistentData.hasUUID("gateway.remove")) {
                return;
            }

            let entity = event.getEntity();
            let reason = event.getEntity().removalReason;

            let gateUUID = entity.getStringUuid();

            // Stop the theme for the gateway
            stopTheme(entity);

            // Remove the gateway from the active gateways
            activeGateways.delete(gateUUID);

            // Mark the gateway as removed
            entity.persistentData.putUUID("gateway.remove", gateUUID);

            // Remove the entity as it was intended
            entity.remove(reason);

        }catch(err){console.log(err)}
        },
    
        /**
         * Called when a net.minecraftforge.event.entity.EntityJoinLevelEvent is triggered.
         * This detects when a gateways entity joins the level, or when it is loaded from a save.
         * It is called for the ServerLevel and ClientLevel so it ends up being called twice.
         * @param {Internal.EntityJoinLevelEvent} event The event being triggered.
         * @returns {void}
         */
        JoinLevel: function (event) {try{

            // Ensure not client
            if(event.level.isClientSide()) return;

            // If the entity is not a gateway entity, return
            if (!(event.getEntity() instanceof GatewayEntityClass)) return;
            let entity = event.getEntity();
            let gateUUID = entity.getStringUuid();
            // Add the gateway to the active gateways
            activeGateways.set(gateUUID, getGateType(entity));

            // Spawn gateway entites with a random theme
            if (entity.persistentData.getString("gate.theme") == "") {
            entity.persistentData.putString("gate.theme", getRandomTheme(entity));
            }

            // Intialize the persistent data
            entity.persistentData.getString("gate.theme") || entity.persistentData.putString("gate.theme", getRandomTheme(entity));

            // Cancel the event if the gateway was not added
            event.setCanceled(activeGateways.get(gateUUID) == undefined);

            // Play the theme for the gateway
            playTheme(entity)

        }catch(err){console.log(err)}
        },

        /**
         * Called when a player joins the server or when the reload command is ran, before tags and crafting recipes are sent to the client.
         * This event is used to send datapack data to clients.
         * {@link https://lexxie.dev/forge/1.20.1/net/minecraftforge/event/OnDatapackSyncEvent.html | Source}
         * @param {Internal.OnDatapackSyncEvent} event The event being triggered.
         * @returns {void}
         */
        OnDatapackSyncEvent: function (event) {try{

            if (event.getPlayers().length) {

                testAllCore();
            }

        }catch(err){console.log(err)}
        }
    }

    /** Register a silent sound event */
    StartupEvents.registry('minecraft:sound_event', event => {
        event.create("kubejs:silent_sound").createObject();
    });
    
    ForgeEvents.onEvent(GatewaysEvents.GateEvent, event => global.parvusGateWayEvents.GateEvent(event));
    ForgeEvents.onEvent(GatewaysEvents.Completed, event => global.parvusGateWayEvents.Completed(event));
    ForgeEvents.onEvent(GatewaysEvents.Failed, event => global.parvusGateWayEvents.Failed(event));
    ForgeEvents.onEvent(GatewaysEvents.Opened, event => global.parvusGateWayEvents.Opened(event));
    ForgeEvents.onEvent(GatewaysEvents.WaveEnd, event => global.parvusGateWayEvents.WaveEnd(event));
    ForgeEvents.onEvent(GatewaysEvents.WaveEntitySpawned, event => global.parvusGateWayEvents.WaveEntitySpawned(event));
    ForgeEvents.onEvent('net.minecraftforge.event.entity.EntityLeaveLevelEvent', event => global.parvusGateWayEvents.LeaveLevel(event));
    ForgeEvents.onEvent('net.minecraftforge.event.entity.EntityJoinLevelEvent', event => global.parvusGateWayEvents.JoinLevel(event));
    ForgeEvents.onEvent('net.minecraftforge.event.OnDatapackSyncEvent', event => global.parvusGateWayEvents.OnDatapackSyncEvent(event));
    
})();