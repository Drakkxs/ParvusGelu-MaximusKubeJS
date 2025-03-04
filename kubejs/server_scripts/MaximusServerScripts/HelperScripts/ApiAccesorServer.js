/// priority: 10
// It is not the best way to do it, but it is a way to do it.

const ForgeRegistries = Java.loadClass('net.minecraftforge.registries.ForgeRegistries');
const MobEffect = Java.loadClass('net.minecraft.world.effect.MobEffect')
const MobEffectInstance = Java.loadClass('net.minecraft.world.effect.MobEffectInstance')
const EntityGetter = Java.loadClass('net.minecraft.world.level.EntityGetter')
const TargetingCondtions = Java.loadClass('net.minecraft.world.entity.ai.targeting.TargetingConditions')
// Curios mod integration
const CuriosApi = Java.loadClass('top.theillusivec4.curios.api.CuriosApi');
const ICurioStacksHandler = Java.loadClass('top.theillusivec4.curios.api.type.inventory.ICurioStacksHandler');
// Botania mod integration
const ManaItemHandler = Java.loadClass('vazkii.botania.api.mana.ManaItemHandler')
const ManaItemHelp = ManaItemHandler.INSTANCE
const IOriginContainer = Java.loadClass('io.github.edwinmindcraft.origins.api.capabilities.IOriginContainer');
const ApoliAPI = Java.loadClass('io.github.edwinmindcraft.apoli.api.ApoliAPI');
const ThirstHelper = Java.loadClass('toughasnails.api.thirst.ThirstHelper');
const PotionBuilder = Java.loadClass('dev.latvian.mods.kubejs.misc.PotionBuilder');
const RangedAttribute = Java.loadClass('net.minecraft.world.entity.ai.attributes.RangedAttribute')
const serverLevel = Java.loadClass('net.minecraft.server.level.ServerLevel');
const UUID = Java.loadClass('java.util.UUID');
const EntityTypes = Java.loadClass('net.minecraft.world.entity.EntityType')