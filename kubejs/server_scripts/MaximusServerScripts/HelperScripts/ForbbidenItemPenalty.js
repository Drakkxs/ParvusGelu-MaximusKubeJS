/// priority: 0
// If you hold a forbidden item, things will happen
// It is not the best way to do it, but it is a way to do it.
let forbiddenItemPenaltyDebug = true; // Want some debug?


/**
 * A list of all valid enforcers
 * @type {Internal.Map$Entry<Internal.ResourceKey<Internal.EntityType<any>>, Internal.EntityType<any>>[]}
 */
let enforcers = [];

// Add forbidden items to the forbidden_items tag
ServerEvents.tags('item', event => {
    event.add('kubejs:forbidden_items', [
        'kubejs:fermented_heart'
        // You can add more items that fit the theme
    ]);
});

// Register the forbidden item attack AI to all entity types
// The ai has its own filtering
for (let ResourceKey of ForgeRegistries.ENTITY_TYPES.getKeys()) {
    // Let the ai affect all entity types
    if (forbiddenItemPenaltyDebug) console.log(`Registering forbidden item attack AI for ${ResourceKey}`);
    EntityJSEvents.addGoalSelectors(ResourceKey.toString(), event => addForbiddenItemAttackAI(event));
}

// When the server loads, filter the enforcers list the same as the ai would so we know what is affected
ServerEvents.loaded(event => {
    let server = event.server;
    // Get the first level
    let level = server.getLevel(server.levelKeys().iterator().next().location());
    if (forbiddenItemPenaltyDebug) console.log(`Got level: ${level.dimension}`);
    // Filter the enforcers list to only include valid entity types
    let enforcers = ForgeRegistries.ENTITY_TYPES.getEntries().filter(type => {
        return isTypeValidEnforcer(type.getValue(), level, null);
    });
    if (forbiddenItemPenaltyDebug) console.log(`Filtered list ${enforcers.map(enforcer => enforcer.getKey().location())} of enforcers to ${enforcers.length} valid entity types`);
});


/**
 * Checks if a given entity type is valid for use as an enforcer.
 * @param {Internal.EntityType<any>} [entityType] - The entity type to check, can be null
 * @param {Internal.Level} level - The level to check against.
 * @param {Internal.Mob} mob - The mob to check against.
 * @returns {boolean} If the entity type is valid or not.
 */
function isTypeValidEnforcer(entityType, level, mob) {
    entityType = entityType || mob.entityType;
    // Create a instance of the entity for testing
    let entity = entityType.create(level);
    // Check if the entity is valid, alive, not a player, and meets isLiving() which can filter boats
    if (!entity || !entity.isLiving() || entity.isPlayer()) return false;
    return true;
}

/**
 * Adds a custom AI goal to the mob that makes it attack any entity that is holding a forbidden item.
 * @param {Internal.AddGoalSelectorsEventJS<any>} event
 */
function addForbiddenItemAttackAI(event) {
    event.customGoal(
        'attack_forbidden_item_holder', // The name of the goal
        1, // priority — The priority of the goal
        /** @param {Internal.Mob} mob */ mob => {isTypeValidEnforcer(null, mob.level, mob)}, // canUse — Determines if the entity can use the goal
        /** @param {Internal.Mob} mob */ mob => true, // canContinueToUse — Determines if the entity can continue to use the goal, may be null
        true, // isInterruptable — If the goal may be interrupted
        /** @param {Internal.Mob} mob */ mob => {mob.persistentData.putBoolean('watching', 1)}, // start — Called when the goal is started
        /** @param {Internal.Mob} mob */ mob => {mob.getNavigation().stop();}, // stop — Called when the goal is stopped
        true, // requiresUpdateEveryTick — If the goal needs to be updated every tick
        /** @param {Internal.Mob} mob */ mob => mobGoalTick(mob) // tick — The action to perform when the goal ticks
    )
}

/**
 * @param {Internal.Mob} mob
 * This function is the core of the mob AI responsible for mob's behavior when they are angry.
 */
function mobGoalTick(mob){

        /** Object to store mob data such as attack or speed */
        let mobData = {
            /**
             * This is used to determine if the mob should be boosted. 
             * Dangerous mobs like zombies or aggrossive mobs like iron golems should not be boosted
             * as attack and speed calcuations can quickly get out of hand
            */
            badToBoost: mob.isMonster() || mob.isAggressive(),
            /** The level of the mob
             * @type {Internal.ServerLevel}
             */
            level: mob.level,
        }

        /**
         * Get the bounding box of the mob, inflated by its follow range if set to genreate a AABB that is the size of the mob's follow range
         * or 10 if the follow range is null
         * @param {Internal.Mob} mob - The mob to get the bounding box of
         * @return {Internal.AABB} - The bounding box of the mob inflated by its follow range.
         */
        function mobAABB() {try{
            return mob.boundingBox.inflate(
                mob.getAttributeValue('minecraft:generic.follow_range') || 10
            )}
            catch(e){
                console.error(`Problem in mobAABB: ${e}`)
            }
        };

        /**
         * Get all living entities within the given bounding box of the mob.
         * - Does not include the mob itself or entities that the mob cannot see.
         * - Will not provide entites like boats
         * @return {Internal.Entity[]} - The array of entities within the given bounding box.
         */
        function mobGetEntitiesWithin() {try{
            let entities = mobData.level.getEntitiesWithin(mobAABB()).filter(
                entity => (
                // Filter out entities that the mob cannot see
                 mob.hasLineOfSight(entity)
                 // Filter out the mob itself
                 && entity.getUuid() != mob.getUuid()
                 // Filter out entities like boats
                 && entity.isLiving()
            ))
            return entities || []
        }
            catch(e){
                console.error(`Problem in mobGetEntitiesWithin: ${e}`)
            }
        };

        mobGetEntitiesWithin().forEach(possibleTarget => {
            mobCoreAI(possibleTarget)
        })
        
        /**
         * Determines if the entity has a forbidden item in either hand.
         * This function is now simplified to focus on entities capable of holding items in hand slots.
         * @param {Internal.Entity} entity - The entity to check if it is targetable.
         * @return {boolean} - True if the entity is holding a forbidden item, false otherwise.
         */
        function isEntityTargetable(entity) {try{
            // Check if the entity has hand slots and if any of those slots contain a forbidden item.
            if (entity.getHandSlots()) {
                return entity.getHandSlots().some(handSlotItem => (
                    handSlotItem.hasTag("kubejs:forbidden_items"))
            )};
        
            // If the entity doesn't have getHandSlots or no forbidden item is found, it's not targetable.
            return false;
            }
            catch(e){
                console.error(`Problem in isEntityTargetable: ${e}`)
            }
        }

        /**
         * Core AI function for the mob.
         * @param {Internal.Entity} targetEntity - The entity to check if it is targetable
         * @return {void}
         */
        function mobCoreAI(targetEntity) {try{
            console.log(`mobCoreAI: Is entity targetable? ${isEntityTargetable(targetEntity)}`)
        }
        catch(e){
            console.error(`Problem in mobCoreAI: ${e}`)
        }
        }

        return;

        mob.level.getEntitiesWithin(mobAABB).forEach(
            /** @param {Internal.Entity} entity */ entity => {
            if (!mob.hasLineOfSight(entity) || entity.getUuid() == mob.getUuid() || !isTypeValidEnforcer(null, mob.level, mob)) return
            let forgiveDeadPlayersRule = Utils.server.getGameRules().get('forgiveDeadPlayers');
            // If the entity the mob is angry at is dead and forgive dead entities is on.
            // OR if the mob is not angry at the entity
            if ((entity == null || !entity.isAlive() && (forgiveDeadPlayersRule ? forgiveDeadPlayersRule : true)) || !mob.persistentData.getInt('AngerTime') > 0) {
                mob.persistentData.remove('AngryAt')
                mob.persistentData.putInt('AngerTime', 0)
                mob.persistentData.remove('Informer')
                mob.setTarget(null) 
            }

            let heldItems = entity.getHandSlots()
            let intialAngerTime = null
            let hasForbiddenItem = heldItems.some(item => item.hasTag("kubejs:forbidden_items"))
            // Ensure mob remains angry at the entity
            if (hasForbiddenItem) {
                // If not already angry at someone, or anger has expired
                if (mob.persistentData.getInt('AngerTime') <= 0 || !mob.persistentData.getString('AngryAt')) {
                    // Remember new player's UUID
                    mob.persistentData.putString('AngryAt', entity.getUuid().toString())
                    mob.persistentData.putString('Informer', 'Parent') // We are the one who will tell others
                }
                // Reset anger time
                intialAngerTime = 400
                mob.persistentData.putInt('AngerTime', intialAngerTime) // 20 seconds
            }

            if (mob.persistentData.getInt('AngerTime') > 0 && (mob.persistentData.getString('AngryAt') == entity.getUuid().toString())) {
                let targetEntity = entity
                let mobAttackAttributeInstance = mob.getAttribute('minecraft:generic.attack_damage')
                let mobAttackAttributeValue = mobAttackAttributeInstance ? mobAttackAttributeInstance.getValue() : null
                let mobIsDangerousToBoost = mob.isMonster()
                // For either passive or hostile we add a indicator that they are angered by a forbidden item
                // Random chance of lava, very low for performance reasons same with sound
                let triggerRandomSync = Math.random() < 0.05
                if (forbiddenItemPenaltyDebug) console.log(`Spawning particle at ${mob.x}, ${mob.y}, ${mob.z}`)
                if (triggerRandomSync) {
                Utils.server.runCommandSilent(`particle minecraft:lava ${mob.x} ${mob.y + mob.bbHeight / 2} ${mob.z} 0 0 0 0.1 1 force`);
                }
                let mobSize = Math.max(1, fixNumber(mob.bbWidth + mob.bbHeight, 2))
                // Voice pitch depending on mob size
                let voicePitch = Math.max(0.5, Math.min(2.0, 1.0 + (mobSize / 2)));
                let baseSpeed = Math.ceil(mob.getAttribute('minecraft:generic.movement_speed').getValue() / 100)
                let maxSpeed = Math.max(1, baseSpeed * 10) // Maximum speed is ten times the base speed

                // Calculate angry speed
                let angrySpeed = fixNumber(Math.min(maxSpeed, baseSpeed * (2 / mobSize)) + 1, 3)

                // Use angrySpeed for navigation
                
                let mobAttackRange = fixNumber(Math.max(1, mob.bbWidth + mob.bbWidth))
                // If the mob is a hostile mob, use the attack it already has
                let mobDamage = mobIsDangerousToBoost ? mobAttackAttributeValue : fixNumber((mob.bbHeight + mob.bbHeight + (mob.maxHealth / 2)) + mobAttackAttributeValue)
                let targetEntityHitBox = fixNumber(targetEntity.bbWidth + targetEntity.bbHeight)
                let distance = fixNumber(Math.max(0, mob.distanceToEntity(targetEntity) - targetEntityHitBox))
                
                // Calculate attack speed based on mob size
                let mobAttackSpeedAttribute = mob.getAttribute('minecraft:generic.attack_speed')
                let baseAttackSpeedSecond = mobAttackSpeedAttribute ? mobAttackSpeedAttribute.getValue() : 4 // Default to 4 if not set
                let sizeMultiplier = mobIsDangerousToBoost ? 1 : Math.max(1, mobSize * 2)  // This will make size differences more impactful on passive mobs
                let attackSpeedTicks = Math.min(50, Math.max(20, Math.floor((baseAttackSpeedSecond * sizeMultiplier) / 20)))

                // Calculate terror radius based on mob size and the damage to warn players
                let TerrorRadius = Math.ceil(Math.max(1, mobSize * 2 + mobDamage))

                
                if (mobIsDangerousToBoost) {
                    mob.setTarget(targetEntity)
                } else {
                    mob.setTarget(targetEntity)
                
                    // Calculate target's speed (approximate)
                    let targetSpeed = targetEntity.getDeltaMovement().length()
                
                    // Calculate current speed, capped at angrySpeed
                    let currentSpeed = Math.min(angrySpeed, Math.max(1, distance))
                
                    // Very close range behavior
                    if (distance <= mobAttackRange * 1.5) {
                        // Only jump if really close, slightly below the target, and target is moving
                        // This is to prevent mobs from jumping when not needed and to make them appear more aggressive
                        let heightDifference = targetEntity.getY() - mob.getY();
                        let jumpThreshold = Math.max(0, 2 - (mobSize * 0.5)); // Smaller mobs can jump higher
                        let jumpStrength = Math.max(0, 1 - (mobSize * 0.25)); // Smaller mobs jump farther

                        // Jump if the mob is close enough, has line of sight, the target is moving, and the target is above the mob
                        if (distance <= mobAttackRange && 
                            mob.hasLineOfSight(targetEntity) && 
                            heightDifference > jumpThreshold &&
                            targetSpeed > 0.1) {
                            // Jump and move towards the target
                            mob.jumpControl.jump()
                            let jumpVector = targetEntity.pos.subtract(mob.pos).normalize().multiply(jumpStrength)
                            mob.addDeltaMovement(jumpVector)
                        }
                        
                        // Rubber-banding-like behavior
                        if (targetSpeed > 0.1) {
                            // If target is moving, match their speed but don't exceed angrySpeed
                            currentSpeed = Math.min(angrySpeed, Math.max(currentSpeed, targetSpeed))
                        } else {
                            // If target is relatively still, slow down but not too much
                            currentSpeed = Math.max(baseSpeed, currentSpeed * 0.9)
                        }
                    }
                
                    // Ensure speed is within bounds
                    currentSpeed = Math.min(angrySpeed, Math.max(baseSpeed, currentSpeed))
                
                    // Move to the player
                    mob.getNavigation().moveTo(targetEntity.x, targetEntity.eyeY, targetEntity.z, mobIsDangerousToBoost ? 1 : currentSpeed)
                    
                    // Always look at the target
                    mob.lookControl.setLookAt(targetEntity.x, targetEntity.eyeY, targetEntity.z)
                }
                
                // Log the stats
                if (forbiddenItemPenaltyDebug) {
                    console.log(`Mob stats: 
                    Type: ${mob.type}, 
                    Mob is dangerous to boost: ${mobIsDangerousToBoost},
                    Size: ${mobSize}, 
                    True Size: ${mob.bbWidth + mob.bbHeight},
                    Attack speed: ${attackSpeedTicks} ticks, 
                    Base Attack speed: ${baseAttackSpeedSecond},
                    Base speed: ${baseSpeed}, 
                    Angry speed: ${angrySpeed},
                    Max speed: ${maxSpeed},
                    Distance to player: ${distance}, 
                    Attack range: ${mobAttackRange}, 
                    Attack damage: ${mobDamage},
                    Terror Radius: ${TerrorRadius},
                    Target Entity: ${targetEntity.type},
                    Target Entity Health: ${targetEntity.getHealth()},
                    Anger Time: ${mob.persistentData.getInt('AngerTime')}`);
                }

                // Check if the mob is close enough to attack
                if (distance <= mobAttackRange && mob.hasLineOfSight(targetEntity)) {
                    if (mob.age % attackSpeedTicks == 0) {
                        if (!mob.isAggressive()) targetEntity.attack(mob.damageSources().mobAttack(mob), mobDamage)
                        if (!mob.isAggressive()) Utils.server.runCommandSilent(`playsound minecraft:entity.zombie.infect hostile @a ${mob.x} ${mob.y + mob.bbHeight / 2} ${mob.z} ${TerrorRadius} ${voicePitch}`);

                        // Increase the mob's anger time
                        // Being in combat will make the mob more angry
                        mob.persistentData.putInt('AngerTime', mob.persistentData.getInt('AngerTime') + intialAngerTime);

                        // Notify allies of the fight
                        Utils.server.getLevel(mob.level.dimension).getEntitiesWithin(mobAABB).forEach(entity => {
                            
                             

                        })
                    }
                }

                // Indictate dangerous enforcers through sound
                if (mob.age % attackSpeedTicks == 0 && mobDamage > fixNumber(targetEntity.getHealth() / 2, 1) && triggerRandomSync) {
                    Utils.server.runCommandSilent(`playsound minecraft:entity.warden.heartbeat hostile @a ${mob.x} ${mob.y + mob.bbHeight / 2} ${mob.z} ${TerrorRadius} ${voicePitch}`);
                }
            }

            // Decrease anger every tick
            mob.persistentData.putInt('AngerTime', mob.persistentData.getInt('AngerTime') - 1)
            if (mob.persistentData.getInt('AngerTime') <= 0 && mob.age & 1 == 0) {
                mob.persistentData.remove('AngryAt')
            }
        })
}
/**
 * Better toFixed() because i'm lazy
 * 
 * @param {number} number
 * @param {number} [fractionalDigits] - defaults to 2
 * @returns {number}
 */
function fixNumber(number, fractionalDigits) {
    fractionalDigits = fractionalDigits || 2;
    return +(number).toFixed(fractionalDigits);
}