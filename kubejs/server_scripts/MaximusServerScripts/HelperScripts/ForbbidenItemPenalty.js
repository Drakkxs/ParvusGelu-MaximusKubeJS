/// priority: 0
// If you hold a forbidden item, things will happen
// It is not the best way to do it, but it is a way to do it.
let forbiddenItemPenaltyDebug = true; // Want some debug?
ServerEvents.tags('item', event => {
    event.add('kubejs:forbidden_items', [
        'kubejs:fermented_heart'
        // You can add more items that fit the theme
    ]);
});
let enforcers = [];

// Function to add enforcers and assign goals
function addEnforcersAndAssignGoals() {
    // Iterate over each entity type in the registry
    for (let type of ForgeRegistries.ENTITY_TYPES) {
        // Create an instance of the entity
        let entity = type.create(Utils.server.getLevel("minecraft:overworld"));

        // Check if the entity is valid, alive, not a player, and not already an enforcer
        if (entity && entity.isAlive() && !entity.isPlayer() && !enforcers.includes(entity.type)) {
            // Add the entity type to the enforcers list
            enforcers.push(entity.type);
            console.log(`Added ${entity.type} to list of enforcers`);
        }
    }

    // All enforcers have been added
    console.log('All enforcers have been added.');
}

// Call the function to add enforcers and assign goals
addEnforcersAndAssignGoals()
console.log('Enforcer setup complete.');
for (let type of enforcers) {
    EntityJSEvents.addGoalSelectors(`${type}`, event => addForbiddenItemAttackAI(event));
    console.log(`Assigned forbidden item attack AI to ${type}`);
}

/**
 * Adds a custom AI goal to the mob that makes it attack any entity that is holding a forbidden item.
 * @param {Internal.AddGoalSelectorsEventJS<any>} event
 */
function addForbiddenItemAttackAI(event) {
    event.customGoal(
        'attack_forbidden_item_holder',
        10,
        mob => true,
        mob => true,
        true,
        mob => {},
        mob => mob.getNavigation().stop(),
        true,
        /** @param {Internal.Mob} mob */ mob => {
            try {
                let mobFollowRangeAttribute = mob.getAttribute('minecraft:generic.follow_range')
                let mobFollowRange = mobFollowRangeAttribute ? mobFollowRangeAttribute.getValue() : 10
                let mobAABB = mob.boundingBox.inflate(mobFollowRange)
                mob.level.getEntitiesWithin(mobAABB).forEach(
                    /** @param {Internal.Entity} entity */ entity => {
                    if (!mob.hasLineOfSight(entity) || entity.getUuid().toString() == mob.getUuid().toString()) return
                    let forgiveDeadPlayersRule = Utils.server.getGameRules().get('forgiveDeadPlayers');
                    // If the entity the mob is angry at is dead and forgive dead entities is on.
                    if ((entity == null || !entity.isAlive() && (forgiveDeadPlayersRule ? forgiveDeadPlayersRule : true))) {
                        mob.persistentData.remove('AngryAt')
                        mob.persistentData.putInt('AngerTime', 0)
                        mob.persistentData.remove('Informer')
                        mob.setTarget(null) 
                    }

                    let heldItems = entity.getHandSlots()
                    let intialAngerTime = null
                    let hasForbiddenItem = heldItems.some(item => item.hasTag("kubejs:forbidden_items"))
                    let targetEntityIsTeamate = entity.persistentData.getString('AngryAt') != mob.getUuid().toString() && !hasForbiddenItem && entity.type == mob.type
                    let targetEntityIsAnParent = false
                    if (targetEntityIsTeamate) targetEntityIsAnParent = entity.persistentData.getString('Informer') == 'Parent'
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
                      
                    // If we aren't already angry at someone we can ask a informer parent who we should be angry at
                    if ((mob.persistentData.getInt('AngerTime') <= 0 || !mob.persistentData.getString('AngryAt')) && targetEntityIsTeamate && targetEntityIsAnParent) {
                        let teamateAngerTarget = entity.persistentData.getString('AngryAt');
                        if (teamateAngerTarget) {
                            mob.persistentData.putString('AngryAt', teamateAngerTarget);
                            mob.persistentData.putString('Informer', 'Child'); // Remember who told us to be angry
                            mob.persistentData.putInt('AngerTime', entity.persistentData.getInt('AngerTime')); // Copy the anger time
                            if (forbiddenItemPenaltyDebug) {
                                console.log(`A ${mob.type} has got angry at ${teamateAngerTarget} because its teammate ${entity.getUuid()} told it to`);
                            }
                        }
                    }

                    if (mob.persistentData.getInt('AngerTime') > 0 && (mob.persistentData.getString('AngryAt') == entity.getUuid().toString())) {
                        let targetEntity = entity
                        let mobAttackAttributeInstance = mob.getAttribute('minecraft:generic.attack_damage')
                        let mobAttackAttributeValue = mobAttackAttributeInstance ? mobAttackAttributeInstance.getValue() : null
                        let mobAggressive = mob.isAggressive()
                        // For either passive or hostile we add a indicator that they are angered by a forbidden item
                        // Random chance of lava
                        if (forbiddenItemPenaltyDebug) console.log(`Spawning particle at ${mob.x}, ${mob.y}, ${mob.z}`)
                        if (Math.random() < 0.1) {
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
                        // If the mob alreays has an attack damage attribute, use that
                        let mobDamage = mobAggressive ? mobAttackAttributeValue : fixNumber((mob.bbHeight + mob.bbHeight + (mob.maxHealth / 2)) + mobAttackAttributeValue)
                        let targetEntityHitBox = fixNumber(targetEntity.bbWidth + targetEntity.bbHeight)
                        let distance = fixNumber(Math.max(0, mob.distanceToEntity(targetEntity) - targetEntityHitBox))
                        
                        // Calculate attack speed based on mob size
                        let mobAttackSpeedAttribute = mob.getAttribute('minecraft:generic.attack_speed')
                        let baseAttackSpeedSecond = mobAttackSpeedAttribute ? mobAttackSpeedAttribute.getValue() : 4 // Default to 4 if not set
                        let sizeMultiplier = mobAggressive ? 1 : Math.max(1, mobSize * 2)  // This will make size differences more impactful on passive mobs
                        let attackSpeedTicks = Math.min(50, Math.max(20, Math.floor((baseAttackSpeedSecond * sizeMultiplier) / 20)))

                        // Calculate terror radius based on mob size and the damage to warn players
                        let TerrorRadius = Math.ceil(Math.max(1, mobSize * 2 + mobDamage))

                        
                        if (mobAggressive) {
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
                                if (distance <= mobAttackRange && 
                                    mob.hasLineOfSight(targetEntity) && 
                                    mob.getY() < targetEntity.getY() &&
                                    targetSpeed > 0.1) {
                                    mob.jumpControl.jump()
                                    mob.addDeltaMovement(targetEntity.pos - mob.pos)
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
                            mob.getNavigation().moveTo(targetEntity.x, targetEntity.eyeY, targetEntity.z, mobAggressive ? 1 : currentSpeed)
                            
                            // Always look at the target
                            mob.lookControl.setLookAt(targetEntity.x, targetEntity.eyeY, targetEntity.z)
                        }
                        
                        // Log the stats
                        if (forbiddenItemPenaltyDebug) {
                            console.log(`Mob stats: 
                            Type: ${mob.type}, 
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
                            Target Entity: ${targetEntity.type},`);
                        }

                        // Check if the mob is close enough to attack
                        if (distance <= mobAttackRange && mob.hasLineOfSight(targetEntity)) {
                            if (mob.age % attackSpeedTicks == 0) {
                                if (!mob.isAggressive()) targetEntity.attack(mob.damageSources().mobAttack(mob), mobDamage)
                                if (!mob.isAggressive()) Utils.server.runCommandSilent(`playsound minecraft:entity.zombie.infect hostile @a ${mob.x} ${mob.y + mob.bbHeight / 2} ${mob.z} ${TerrorRadius} ${voicePitch}`);
                            } 
                        }

                        // Indictate anger of high damage mobs
                        if (mob.age % attackSpeedTicks == 0 && mobDamage > 5) {
                            Utils.server.runCommandSilent(`playsound minecraft:entity.warden.heartbeat hostile @a ${mob.x} ${mob.y + mob.bbHeight / 2} ${mob.z} ${TerrorRadius} ${voicePitch}`);
                        }
                    }

                    // Decrease anger time
                    mob.persistentData.putInt('AngerTime', mob.persistentData.getInt('AngerTime') - 1)
                    if (mob.persistentData.getInt('AngerTime') <= 0) {
                        mob.persistentData.remove('AngryAt')
                    }
                })
            } catch (error) {
                if (forbiddenItemPenaltyDebug) console.error(`Error in forbidden item AI for ${mob.type}: ${error}`)
            }
        }
    )
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