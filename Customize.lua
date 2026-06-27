Customize = {}

-- General
Customize.Command           = 'shotmaker'
Customize.MenuCommand       = 'wardrobe'
Customize.AceRestricted     = false          -- true = ACE permission required (see README)
Customize.RoutingBucket     = 999

Customize.ScreenshotQuality = 0.92          -- 0.0–1.0 (webp/jpg only)
Customize.ScreenshotFormat  = 'png'         -- 'png' | 'webp' | 'jpg'
Customize.TransparentBg     = true          -- chroma key removal (png only)
Customize.ScreenshotWidth   = 512
Customize.ScreenshotHeight  = 512

Customize.StudioCoords      = vector3(0.0, 0.0, -150.0)
Customize.StudioHeading     = 180.0

Customize.WaitAfterApply    = 500           -- ms
Customize.WaitAfterCapture  = 300           -- ms
Customize.TextureLoadWait   = 600           -- ms
Customize.CaptureAllTextures = false        -- true = all textures, false = texture 0 only

-- Which ped genders to capture clothing/props/overlays/tattoos for. Many items are
-- gender-specific (different drawable counts, ~59 gender-exclusive tattoos), so a full
-- catalog needs both. When set to capture more than one, the freemode ped model is
-- swapped between passes automatically and each gender is written to shots/<gender>/.
-- Your own character's model + outfit is saved and restored afterwards.
--   'both'    = capture male AND female in one run (default)
--   'current' = only the gender you currently are
--   'male' / 'female' = force a single gender
-- (Vehicles/objects are gender-independent and always captured once.)
Customize.CaptureGenders    = 'both'

-- Batch / Performance
Customize.BatchSize         = 10
Customize.BatchPauseWait    = 2000          -- ms
Customize.GCInterval        = 20
Customize.LatentRate        = 8000000       -- bytes/sec for capture upload (latent event throttle).
                                            -- 8 MB/s is plenty for 512x512; raise for 4K source frames
                                            -- (e.g. 16000000 = 16 MB/s) if uploads bottleneck the queue.

-- Chroma Key Screen
Customize.ChromaKeyColor    = 'magenta'          -- 'green' | 'magenta'

Customize.GreenScreen = {
    width       = 8.0,
    depth       = 8.0,
    height      = 8.5,
    floorOffset = -3.0,
}

-- Head Chroma Mask — covers the ped's head with chroma color so the server
-- can wipe it out for accessory/torso shots (configured per category via
-- the `hideHead = true` flag). Each entry is a sphere centered on SKEL_Head
-- plus its own offsets, sized by sizeX/Y/Z, and optionally rotated by
-- rotX/rotY/rotZ (degrees).
--
-- Stack multiple entries to cover head + jaw + neck independently — small
-- spheres tucked exactly where they're needed beat one big sphere that has
-- to compromise between clipping clothing or leaving skin visible.
--
-- Rotation is around the marker center. With unequal sizeX/Y/Z (ellipsoid)
-- you can tilt the shape — e.g. rotX > 0 pitches the sphere's long axis
-- downward, which is useful for following the slope of the neck under the
-- chin without expanding into the chest area.
Customize.HeadMask = {
    { offsetX = 0.0, offsetY = 0.0, offsetZ = 0.136, sizeX = 0.12, sizeY = 0.15, sizeZ = 0.315 },
}

-- Auto-set screen color from preset (do not edit manually)
Customize.GreenScreen.color = Customize.ChromaKeyColor == 'magenta'
    and { r = 255, g = 0, b = 255 }
    or  { r = 0,   g = 177, b = 64 }

-- Studio Lights
Customize.StudioLights = {
    { offset = vector3(0.0, 2.5, 1.0),  range = 8.0, intensity = 3.0 },
    { offset = vector3(-2.5, 0.0, 1.0), range = 5.0, intensity = 2.0 },
    { offset = vector3(2.5, 0.0, 1.0),  range = 5.0, intensity = 2.0 },
    { offset = vector3(0.0, -1.5, 1.0), range = 4.0, intensity = 1.5 },
    { offset = vector3(0.0, 0.0, 3.0),  range = 6.0, intensity = 2.5 },
}

-- Camera Presets (fov, zPos, rotation, dist, defaultAngleH, defaultCamZ, defaultRoll)
Customize.CameraPresets = {
    hair            = { fov = 25.0, zPos = 0.72,  rotation = vector3(0.0, 0.0, 0.0),   dist = 1.2, defaultAngleH = 180.0,  defaultCamZ = 0.0,  defaultRoll = 0.0 },
    face_overlay    = { fov = 18.0, zPos = 0.68,  rotation = vector3(0.0, 0.0, 0.0),   dist = 1.2, defaultAngleH = 180.0,  defaultCamZ = 0.0,  defaultRoll = 0.0 },
    chest_overlay   = { fov = 28.1, zPos = 0.28,  rotation = vector3(0.0, 0.0, 0.0),   dist = 1.2, defaultAngleH = 178.9,  defaultCamZ = 0.06, defaultRoll = 0.0 },
    mask            = { fov = 25.1, zPos = 0.66,  rotation = vector3(0.0, 0.0, 0.0),   dist = 1.2, defaultAngleH = 180.6,  defaultCamZ = 0.0,  defaultRoll = 0.0 },
    arms_gloves     = { fov = 89.4, zPos = 0.07,  rotation = vector3(0.0, 0.0, 0.0),   dist = 0.6, defaultAngleH = 180.6,  defaultCamZ = 0.09, defaultRoll = 0.0 },
    legs            = { fov = 60.0, zPos = -0.46, rotation = vector3(0.0, 0.0, 0.0),   dist = 1.2, defaultAngleH = 179.9,  defaultCamZ = 0.1,  defaultRoll = 0.0 },
    shoes           = { fov = 19.0, zPos = -0.96, rotation = vector3(0.0, 0.0, 0.0),   dist = 1.3, defaultAngleH = 180.3,  defaultCamZ = 0.77, defaultRoll = 0.0 },
    accessories     = { fov = 24.0, zPos = 0.3,   rotation = vector3(0.0, 0.0, 0.0),   dist = 1.2, defaultAngleH = 180.0,  defaultCamZ = 0.0,  defaultRoll = 0.0 },
    body            = { fov = 37.7, zPos = 0.31,  rotation = vector3(0.0, 0.0, 0.0),   dist = 1.3, defaultAngleH = 180.0,  defaultCamZ = 0.0,  defaultRoll = 0.0 },
    decals          = { fov = 56.4, zPos = 0.27,  rotation = vector3(0.0, 0.0, 0.0),   dist = 0.9, defaultAngleH = 0.0,    defaultCamZ = 0.0,  defaultRoll = 0.0 },
    tops            = { fov = 34.7, zPos = 0.22,  rotation = vector3(0.0, 0.0, 0.0),   dist = 1.4, defaultAngleH = 180.0,  defaultCamZ = 0.0,  defaultRoll = 0.0 },
    hats            = { fov = 21.2, zPos = 0.72,  rotation = vector3(0.0, 0.0, 0.0),   dist = 1.2, defaultAngleH = 180.0,  defaultCamZ = 0.0,  defaultRoll = 0.0 },
    glasses         = { fov = 5.0,  zPos = 0.7,   rotation = vector3(0.0, 0.0, 0.0),   dist = 2.5, defaultAngleH = 180.0,  defaultCamZ = 0.0,  defaultRoll = 0.0 },
    ears            = { fov = 20.0, zPos = 0.68,  rotation = vector3(0.0, 0.0, 0.0),   dist = 1.0, defaultAngleH = 180.9,  defaultCamZ = 0.0,  defaultRoll = 0.0 },
    watches         = { fov = 17.8, zPos = -0.19, rotation = vector3(0.0, 0.0, 275.0), dist = 1.0, defaultAngleH = -85.0,  defaultCamZ = 0.45, defaultRoll = 0.0 },
    bracelets       = { fov = 21.7, zPos = -0.19, rotation = vector3(0.0, 0.0, 0.0),   dist = 1.0, defaultAngleH = -275.6, defaultCamZ = 0.5,  defaultRoll = 0.0 },
    vehicle         = { fov = 40.0, zPos = 0.81,  rotation = vector3(0.0, 0.0, 0.0),   dist = 8.0, defaultAngleH = 399.4,  defaultCamZ = 1.82, defaultRoll = 0.0 },
    object          = { fov = 35.0, zPos = 0.42,  rotation = vector3(0.0, 0.0, 0.0),   dist = 3.7, defaultAngleH = 211.8,  defaultCamZ = 0.83, defaultRoll = 0.0 },
    -- Tattoo zones (starting points — fine-tune live with the studio camera + "Save Camera Angle").
    -- Torso shows the front by default; drag to rotate for back tattoos. Arms/legs are angled to each side.
    tattoo_torso    = { fov = 37.7, zPos = 0.31,  rotation = vector3(0.0, 0.0, 0.0),   dist = 1.3, defaultAngleH = 180.0,  defaultCamZ = 0.0,  defaultRoll = 0.0 },
    tattoo_arm_left = { fov = 45.0, zPos = 0.22,  rotation = vector3(0.0, 0.0, 0.0),   dist = 0.9, defaultAngleH = 135.0,  defaultCamZ = 0.1,  defaultRoll = 0.0 },
    tattoo_arm_right= { fov = 45.0, zPos = 0.22,  rotation = vector3(0.0, 0.0, 0.0),   dist = 0.9, defaultAngleH = 225.0,  defaultCamZ = 0.1,  defaultRoll = 0.0 },
    tattoo_leg_left = { fov = 45.0, zPos = -0.45, rotation = vector3(0.0, 0.0, 0.0),   dist = 1.2, defaultAngleH = 150.0,  defaultCamZ = 0.1,  defaultRoll = 0.0 },
    tattoo_leg_right= { fov = 45.0, zPos = -0.45, rotation = vector3(0.0, 0.0, 0.0),   dist = 1.2, defaultAngleH = 210.0,  defaultCamZ = 0.1,  defaultRoll = 0.0 },
    tattoo_head     = { fov = 28.0, zPos = 0.55,  rotation = vector3(0.0, 0.0, 0.0),   dist = 1.2, defaultAngleH = 180.0,  defaultCamZ = 0.0,  defaultRoll = 0.0 },
    -- Rear torso view (defaultAngleH 0 = opposite of the 180 front shot). Used by the torso
    -- auto front/back pass; tune this to frame back tattoos nicely.
    tattoo_back     = { fov = 37.7, zPos = 0.31,  rotation = vector3(0.0, 0.0, 0.0),   dist = 1.3, defaultAngleH = 0.0,    defaultCamZ = 0.0,  defaultRoll = 0.0 },
}

-- Clothing Categories (componentId -> camera preset)
-- visibleComponents : component IDs that remain visible at drawable 0 (e.g. 0=head, 2=hair, 3=torso)
-- componentOverrides: override specific component drawables (e.g. {[3] = 15} sets torso to drawable 15)
-- previewDrawable   : drawable shown in preview mode (default: 0)
-- hideHead          : draw a chroma-key sphere over the head during capture (removed by bg removal)
Customize.Categories = {
    { componentId = 2,  label = 'Hair',          camera = 'hair',        visibleComponents = {0}, previewDrawable = 15 },
    { componentId = 1,  label = 'Mask',          camera = 'mask',        visibleComponents = {0, 2}, previewDrawable = 23 },
    { componentId = 3,  label = 'Arms / Gloves', camera = 'arms_gloves', visibleComponents = {}, hideHead = true },
    { componentId = 4,  label = 'Pants',         camera = 'legs',        visibleComponents = {} },
    { componentId = 5,  label = 'Bags',          camera = 'decals',      visibleComponents = {}, previewDrawable = 1, hideHead = true },
    { componentId = 6,  label = 'Shoes',         camera = 'shoes',       visibleComponents = {}, previewDrawable = 1 },
    { componentId = 7,  label = 'Accessories',   camera = 'accessories', visibleComponents = {0, 3}, componentOverrides = {[3] = 15}, hideHead = true },
    { componentId = 8,  label = 'Undershirt',    camera = 'tops',        visibleComponents = {}, hideHead = true },
    { componentId = 9,  label = 'Body Armor',    camera = 'body',        visibleComponents = {}, previewDrawable = 1, hideHead = true },
    { componentId = 10, label = 'Decals',        camera = 'decals',      visibleComponents = {3}, componentOverrides = {[3] = 15}, hideHead = true },
    { componentId = 11, label = 'Tops',          camera = 'tops',        visibleComponents = {}, hideHead = true },
}

-- Prop Categories (propId -> camera preset)
-- anim: optional animation played during capture (dict, name, flag)
Customize.PropCategories = {
    { propId = 0, label = 'Hats',      camera = 'hats',      visibleComponents = {0, 2} },
    { propId = 1, label = 'Glasses',   camera = 'glasses',   visibleComponents = {0, 2}, previewDrawable = 2 },
    { propId = 2, label = 'Ears',      camera = 'ears',      visibleComponents = {0, 2} },
    { propId = 6, label = 'Watches',   camera = 'watches',   visibleComponents = {3}, anim = { dict = 'anim@heists@ornate_bank@grab_cash', name = 'grab', flag = 49 } },
    { propId = 7, label = 'Bracelets', camera = 'bracelets', visibleComponents = {3}, anim = { dict = 'anim@heists@ornate_bank@grab_cash', name = 'grab', flag = 49 } },
}

-- Head Overlay Categories (overlayIndex -> camera preset)
-- Uses SetPedHeadOverlay / GetPedHeadOverlayNum natives
-- colorType: 1 = hair color (eyebrows, facial hair), 2 = makeup color (makeup, blush, lipstick)
-- colorId: overlay color index (1 = black)
Customize.OverlayCategories = {
    -- Face overlays
    { overlayIndex = 0,  label = 'Blemishes',          camera = 'face_overlay',  visibleComponents = {0, 2}, colorType = 1, colorId = 1 },
    { overlayIndex = 1,  label = 'Facial Hair',        camera = 'face_overlay',  visibleComponents = {0, 2}, colorType = 1, colorId = 1 },
    { overlayIndex = 2,  label = 'Eyebrows',           camera = 'face_overlay',  visibleComponents = {0, 2}, colorType = 1, colorId = 1 },
    { overlayIndex = 3,  label = 'Ageing',             camera = 'face_overlay',  visibleComponents = {0, 2}, colorType = 1, colorId = 1 },
    { overlayIndex = 4,  label = 'Makeup',             camera = 'face_overlay',  visibleComponents = {0, 2}, colorType = 2, colorId = 1 },
    { overlayIndex = 5,  label = 'Blush',              camera = 'face_overlay',  visibleComponents = {0, 2}, colorType = 2, colorId = 1 },
    { overlayIndex = 6,  label = 'Complexion',         camera = 'face_overlay',  visibleComponents = {0, 2}, colorType = 1, colorId = 1 },
    { overlayIndex = 7,  label = 'Sun Damage',         camera = 'face_overlay',  visibleComponents = {0, 2}, colorType = 1, colorId = 1 },
    { overlayIndex = 8,  label = 'Lipstick',           camera = 'face_overlay',  visibleComponents = {0, 2}, colorType = 2, colorId = 1 },
    { overlayIndex = 9,  label = 'Moles & Freckles',   camera = 'face_overlay',  visibleComponents = {0, 2}, colorType = 1, colorId = 1 },
    -- Body overlays
    { overlayIndex = 10, label = 'Chest Hair',         camera = 'chest_overlay', visibleComponents = {0, 2, 3}, componentOverrides = {[3] = 15}, colorType = 1, colorId = 1 },
    { overlayIndex = 11, label = 'Body Blemishes',     camera = 'chest_overlay', visibleComponents = {0, 2, 3}, componentOverrides = {[3] = 15}, colorType = 1, colorId = 1 },
}

-- Tattoo Capture
-- Tattoos are ped DECORATIONS applied by (collection, overlay) hash pairs — GTA has
-- no native to list them, so the catalog is read at runtime from your tattoo/appearance
-- resource's data file. Defaults match illenium-appearance's shared/tattoos.lua, whose
-- format is: Config.Tattoos = { ZONE_X = { { name, label, hashMale, hashFemale, zone, collection }, ... } }.
-- If the file/resource is missing the loader falls back to Customize.Tattoo.Manual below.
Customize.Tattoo = {
    Enabled        = true,
    SourceResource = 'illenium-appearance',
    SourceFile     = 'shared/tattoos.lua',  -- pure-data file that sets Config.Tattoos = {...}
    SourceGlobal   = 'Tattoos',             -- read as env.Config[SourceGlobal]
    OpacityStack   = true,                  -- re-apply (opacity*10) times like illenium, so thumbnails match in-game darkness
    -- Fallback catalog if the source can't be read. Same shape as Config.Tattoos:
    -- Manual = { ZONE_TORSO = { { name='TAT_X', label='X', hashMale='...', hashFemale='...', collection='mp..._overlays' } } },
    Manual         = {},
}

-- Tattoo zones to expose (one capture sub-category each). The tattoo list per zone is
-- pulled from the source above and matched by `zone`. Each entry controls framing + how
-- the ped is stripped so the skin under the tattoo is visible:
--   visibleComponents / componentOverrides -> same semantics as Customize.Categories
--   componentOverrides[3]=15 = bare torso+arms skin (proven value used by Decals/Chest overlay).
--   Component 4 (legs) must be an override to a visible skin/underwear drawable — NEVER -1 (that hides the legs).
--   hideHead draws a chroma sphere over the head; it MUST stay false for ZONE_HEAD or head tattoos get wiped.
-- These skin drawables are ped-dependent — adjust if your base ped renders clothed.
--
-- autoPick = { camA, camB, ... }: capture each tattoo from every listed camera and let the
-- server keep whichever angle actually shows the ink (diffed against a bare-skin baseline).
-- Used for the torso, where illenium folds front AND back tattoos into one ZONE_TORSO and
-- they can't be told apart from the data. Costs one extra capture per tattoo per angle.
-- Remove autoPick to go back to a single fixed angle.
Customize.TattooCategories = {
    { zone = 'ZONE_TORSO',     label = 'Torso & Back', camera = 'tattoo_torso',     visibleComponents = {3}, componentOverrides = {[3] = 15},            hideHead = true, autoPick = { 'tattoo_torso', 'tattoo_back' } },
    { zone = 'ZONE_LEFT_ARM',  label = 'Left Arm',     camera = 'tattoo_arm_left',  visibleComponents = {3}, componentOverrides = {[3] = 15},            hideHead = true },
    { zone = 'ZONE_RIGHT_ARM', label = 'Right Arm',    camera = 'tattoo_arm_right', visibleComponents = {3}, componentOverrides = {[3] = 15},            hideHead = true },
    -- [4] = legs/pants. Set to minimal-coverage UNDERWEAR (not shorts) so the
    -- thighs/calves stay bare for leg tattoos. The right drawable differs per ped
    -- model, so it's a { male, female } pair — tune these two to your underwear item.
    { zone = 'ZONE_LEFT_LEG',  label = 'Left Leg',     camera = 'tattoo_leg_left',  visibleComponents = {3}, componentOverrides = {[3] = 15, [4] = { male = 21, female = 15 }}, hideHead = true },
    { zone = 'ZONE_RIGHT_LEG', label = 'Right Leg',    camera = 'tattoo_leg_right', visibleComponents = {3}, componentOverrides = {[3] = 15, [4] = { male = 21, female = 15 }}, hideHead = true },
    { zone = 'ZONE_HEAD',      label = 'Head / Neck',  camera = 'tattoo_head',      visibleComponents = {0}, componentOverrides = {[3] = 15},            hideHead = false },
}

-- Vehicle Categories
-- 'auto' = auto-detect all loaded vehicle models via GetAllVehicleModels()
-- Or use a manual list: { { model = 'adder', label = 'Adder' }, ... }
Customize.VehicleCategories = 'auto'

-- Object/Prop Categories (world objects)
-- Add or remove props as needed. Use /shotprop <model> to capture unlisted props.
Customize.ObjectCategories = {
    -- Furniture
    { model = 'prop_bench_01a',       label = 'Park Bench' },
    { model = 'prop_bench_05',        label = 'Wooden Bench' },
    { model = 'prop_table_01',        label = 'Folding Table' },
    { model = 'prop_table_03',        label = 'Picnic Table' },
    { model = 'prop_chair_01a',       label = 'Folding Chair' },
    { model = 'prop_chair_04a',       label = 'Office Chair' },
    { model = 'prop_skid_chair_01',   label = 'Plastic Chair' },
    { model = 'prop_couch_01',        label = 'Couch' },
    { model = 'prop_bed_01',          label = 'Bed' },
    -- Containers
    { model = 'prop_barrel_01a',      label = 'Barrel' },
    { model = 'prop_cs_cardbox_01',   label = 'Cardboard Box' },
    { model = 'prop_box_wood01a',     label = 'Wood Crate' },
    { model = 'prop_bin_01a',         label = 'Trash Bin' },
    { model = 'prop_dumpster_01a',    label = 'Dumpster' },
    { model = 'prop_sacktruck_02a',   label = 'Hand Truck' },
    -- Electronics
    { model = 'prop_laptop_01a',      label = 'Laptop' },
    { model = 'prop_tv_flat_01',      label = 'Flat TV' },
    { model = 'prop_monitor_02',      label = 'Monitor' },
    { model = 'prop_radio_01',        label = 'Radio' },
    { model = 'prop_cs_tablet',       label = 'Tablet' },
    -- Food & Drink
    { model = 'prop_food_bs_burger3', label = 'Burger' },
    { model = 'prop_food_cb_donuts',  label = 'Donuts' },
    { model = 'prop_cs_beer_bot_01',  label = 'Beer Bottle' },
    { model = 'ng_proc_sodacan_01a',  label = 'Soda Can' },
    { model = 'prop_pizza_box_01',    label = 'Pizza Box' },
    -- Nature
    { model = 'prop_plant_int_01a',   label = 'Plant' },
    { model = 'prop_pot_plant_01a',   label = 'Pot Plant' },
    { model = 'prop_bush_lrg_04b',    label = 'Large Bush' },
    { model = 'prop_rock_4_a',        label = 'Rock' },
    -- Industrial
    { model = 'prop_barrier_work01a', label = 'Road Barrier' },
    { model = 'prop_cone_01a',        label = 'Traffic Cone' },
    { model = 'prop_toolchest_05',    label = 'Tool Chest' },
    { model = 'prop_jerrycan_01a',    label = 'Jerry Can' },
    { model = 'prop_fire_exting_1a',  label = 'Fire Extinguisher' },
    -- Weapons & Misc
    { model = 'prop_cs_katana_01',    label = 'Katana' },
    { model = 'prop_tool_hammer',     label = 'Hammer' },
    { model = 'prop_tool_wrench',     label = 'Wrench' },
    { model = 'prop_golf_bag_01',     label = 'Golf Bag' },
    { model = 'prop_bball_01',        label = 'Basketball' },
    { model = 'prop_tennis_ball',     label = 'Tennis Ball' },
}

-- Green Screen (Vehicles) — larger for cars
Customize.VehicleGreenScreen = {
    width       = 30.0,
    depth       = 30.0,
    height      = 15.0,
    floorOffset = -3.0,
}

-- Green Screen (Objects)
Customize.ObjectGreenScreen = {
    width       = 12.0,
    depth       = 12.0,
    height      = 10.0,
    floorOffset = -3.0,
}

-- Studio Lights (Vehicles) — wider range
Customize.VehicleStudioLights = {
    { offset = vector3(0.0, 8.0, 3.0),   range = 20.0, intensity = 4.0 },
    { offset = vector3(-8.0, 0.0, 3.0),  range = 15.0, intensity = 3.0 },
    { offset = vector3(8.0, 0.0, 3.0),   range = 15.0, intensity = 3.0 },
    { offset = vector3(0.0, -5.0, 3.0),  range = 12.0, intensity = 2.5 },
    { offset = vector3(0.0, 0.0, 8.0),   range = 18.0, intensity = 3.5 },
}
