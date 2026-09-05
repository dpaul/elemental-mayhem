const fs = require('fs');

const CONFUSION_ABILITIES = {
  Fire: {
    name: 'Heat Mirage Daze (Confuse)',
    desc: 'Generates shimmering thermal illusions that deal heat damage and leave the target disoriented and Confused.',
  },
  Water: {
    name: 'Vortex Vertigo (Confuse)',
    desc: 'Swirls dizzying tidal currents that crush the foe and plunge them into swirling Confusion.',
  },
  Earth: {
    name: 'Tremor Disorientation (Confuse)',
    desc: 'Rumbles tectonic shocks beneath the target, cracking the earth and throwing them into stumbling Confusion.',
  },
  Wind: {
    name: 'Gale Vertigo (Confuse)',
    desc: 'Whips up a howling cyclone that spins the target relentlessly into dizzy Confusion.',
  },
  Undead: {
    name: 'Haunting Delirium (Confuse)',
    desc: 'Unleashes wailing wraiths that terrorize the victim with ghostly hallucinations and Confusion.',
  },
  Life: {
    name: 'Pollen Haze (Confuse)',
    desc: 'Releases intoxicating floral blooms that bewilder cognitive instincts into euphoric Confusion.',
  },
  Neutral: {
    name: 'Static Bewilderment (Confuse)',
    desc: 'Emits a wave of discordant energy that scrambles neural balance into erratic Confusion.',
  },
  Sky: {
    name: 'Hypoxic Daze (Confuse)',
    desc: 'Siphons atmospheric oxygen into a thin vacuum, plunging the foe into altitude Confusion.',
  },
  Ice: {
    name: 'Brainfreeze Stupor (Confuse)',
    desc: 'Fires a piercing needle of subzero frost that numbs synaptic reflexes into frozen Confusion.',
  },
  Magma: {
    name: 'Sulfuric Delirium (Confuse)',
    desc: 'Erupts toxic volcanic fumes and molten spray that choke the target into dizzy Confusion.',
  },
  Crystal: {
    name: 'Prismatic Hallucination (Confuse)',
    desc: 'Flashes hypnotic refracting light that splits perception into dizzying kaleidoscopic Confusion.',
  },
  Lightning: {
    name: 'Synapse Scramble (Confuse)',
    desc: 'Sends erratic high-frequency arcs through the enemy nervous system, inducing twitching Confusion.',
  },
  Thunder: {
    name: 'Deafening Concussion (Confuse)',
    desc: 'Detonates an ear-splitting acoustic shock that shatters equilibrium into staggering Confusion.',
  },
  Storm: {
    name: 'Tempest Disarray (Confuse)',
    desc: 'Blasts conflicting gale gusts and rain squalls that throw the target into turbulent Confusion.',
  },
  Metal: {
    name: 'Magnetic Reversal (Confuse)',
    desc: 'Inverts ferrous resonance in the target, spinning their magnetic orientation into Confusion.',
  },
  Magnetism: {
    name: 'Polarity Inversion (Confuse)',
    desc: 'Flips localized magnetic poles violently, disrupting all sense of direction into Confusion.',
  },
  Sound: {
    name: 'Infrasound Vertigo (Confuse)',
    desc: 'Emits a nauseating resonant frequency that destabilizes the inner ear into pure Confusion.',
  },
  Force: {
    name: 'Kinetic Disorientation (Confuse)',
    desc: 'Warps inertial vectors around the target, tumbling their movement into chaotic Confusion.',
  },
  Energy: {
    name: 'Quantum Daze (Confuse)',
    desc: 'Entangles target cognition across divergent eigenstates, inducing profound mental Confusion.',
  },
  Electricity: {
    name: 'Neuro-Shock Arc (Confuse)',
    desc: 'Zaps synaptic pathways with chaotic voltage pulses, sending the target into stumbling Confusion.',
  },
  Pressure: {
    name: 'Barometric Bends (Confuse)',
    desc: 'Rapidly drops barometric pressure around the victim, inducing painful vertigo and Confusion.',
  },
  Vibration: {
    name: 'Harmonic Scramble (Confuse)',
    desc: 'Oscillates target tissues at conflicting frequencies, shaking their senses into wild Confusion.',
  },
  Radiation: {
    name: 'Gamma Daze (Confuse)',
    desc: 'Floods the target with ionizing gamma flashes that induce cognitive disorientation and Confusion.',
  },
  Momentum: {
    name: 'Whiplash Vertigo (Confuse)',
    desc: 'Abruptly stops and twists kinetic momentum, tossing the target into dizzying Confusion.',
  },
  Glass: {
    name: 'Kaleidoscopic Mirage (Confuse)',
    desc: 'Surrounds the target in revolving mirrored shards that splinter reality into dizzy Confusion.',
  },
  Matter: {
    name: 'Molecular Disarray (Confuse)',
    desc: 'Destabilizes the atomic cohesion of the target area, confusing physical reflexes and senses.',
  },
  Nature: {
    name: 'Psychotropic Spores (Confuse)',
    desc: 'Puffs hallucinogenic jungle spores that plunge the victim into wandering, dreamlike Confusion.',
  },
  Poison: {
    name: 'Neurotoxin Delirium (Confuse)',
    desc: 'Injects a fast-acting psychoactive venom that scrambles motor control into erratic Confusion.',
  },
  Acid: {
    name: 'Caustic Fumes (Confuse)',
    desc: 'Releases blinding chemical vapors that burn eyes and scramble thoughts into disoriented Confusion.',
  },
  Love: {
    name: 'Bewitching Infatuation (Confuse)',
    desc: 'Enchants the victim with blinding romantic obsession, leaving them helpless in love-struck Confusion.',
  },
  Blood: {
    name: 'Hemorrhagic Vertigo (Confuse)',
    desc: 'Manipulates cerebral circulation to trigger sudden dizzy spells and delirious Confusion.',
  },
  Soul: {
    name: 'Astral Disconnect (Confuse)',
    desc: 'Briefly wrenches the target soul from its mortal vessel, leaving it wandering in spectral Confusion.',
  },
  Spirit: {
    name: 'Phantom Bewilderment (Confuse)',
    desc: 'Summons eerie spirits that swarm and whisper conflicting illusions, inflicting wild Confusion.',
  },
  Light: {
    name: 'Blinding Strobe (Confuse)',
    desc: 'Flashes a searing stroboscopic burst of brilliance that leaves the target stunned and Confused.',
  },
  Darkness: {
    name: 'Shadow Hallucination (Confuse)',
    desc: 'Envelops the target in paranoid darkness where phantoms lurk, inducing terrified Confusion.',
  },
  Void: {
    name: 'Existential Vertigo (Confuse)',
    desc: 'Opens a fissure to the fathomless void, exposing target mind to sanity-shattering Confusion.',
  },
  Chaos: {
    name: 'Bedlam Pandemonium (Confuse)',
    desc: 'Infuses target thoughts with wild, unpredictable entropy that drives them into reckless Confusion.',
  },
  Order: {
    name: 'Axiomatic Overload (Confuse)',
    desc: 'Forces infinite geometric logic into the foe brain, locking cognition into paralyzed Confusion.',
  },
  Time: {
    name: 'Temporal Paradox Loop (Confuse)',
    desc: 'Desynchronizes target perception into overlapping timelines, causing time-slipping Confusion.',
  },
  Space: {
    name: 'Spatial Distortion (Confuse)',
    desc: 'Folds local dimensions so up becomes down and forward becomes backward in complete Confusion.',
  },
  Death: {
    name: 'Thanatopic Dementia (Confuse)',
    desc: 'Channels chills of the netherworld to numb mortal reason, leaving the victim in ghostly Confusion.',
  },
  Gravity: {
    name: 'Gravitational Inversion (Confuse)',
    desc: 'Reverses gravitational pull on the target, sending them tumbling upside down in dizzy Confusion.',
  },
  Heat: {
    name: 'Heat Stroke Delirium (Confuse)',
    desc: 'Blasts scorching dry winds that overheat the brain, inducing feverish hallucinations and Confusion.',
  },
  Cold: {
    name: 'Hypothermic Mirage (Confuse)',
    desc: 'Submerges the foe in lethal hypothermic numbness, producing paradoxical warm hallucinations and Confusion.',
  },
};

const filePath = 'src/constants/classes.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Find each class and replace ability index 5
for (const [elem, info] of Object.entries(CONFUSION_ABILITIES)) {
  const elemRegex = new RegExp(`(\\n  ${elem}:\\s*\\{[\\s\\S]*?abilities:\\s*\\[)([\\s\\S]*?)(\\n    \\],\\n  \\},)`);
  const match = content.match(elemRegex);
  if (!match) {
    console.error('Could not find class block for:', elem);
    continue;
  }

  const prefix = match[1];
  const abilitiesBlock = match[2];
  const suffix = match[3];

  // Split abilities by `{\n`
  // An ability starts with `      {\n` and ends with `      },\n`
  const abilityRegex = /      \{\n([\s\S]*?)\n      \},/g;
  const abilities = [...abilitiesBlock.matchAll(abilityRegex)];
  
  if (abilities.length !== 10) {
    console.warn(`Element ${elem} has ${abilities.length} abilities instead of 10!`);
  }

  const newAbilityText = `      {
        id: '${elem.toLowerCase()}_confusion',
        name: '${info.name}',
        element: '${elem}',
        icon: '🌀',
        apCost: 2,
        cooldown: 1,
        currentCooldown: 0,
        range: 5,
        aoeRadius: 0,
        targeting: 'SingleUnit',
        baseDamage: 24,
        appliesStatus: 'Confused',
        statusDuration: 2,
        description: '${info.desc}',
        level: 1,
      },`;

  // Replace ability 5 (index 5)
  const targetAbilityMatch = abilities[5];
  if (!targetAbilityMatch) {
    console.error('No ability at index 5 for:', elem);
    continue;
  }

  const targetFull = targetAbilityMatch[0];
  const newAbilitiesBlock = abilitiesBlock.replace(targetFull, newAbilityText);
  content = content.replace(prefix + abilitiesBlock + suffix, prefix + newAbilitiesBlock + suffix);
  console.log(`Updated ${elem} ability 5 to ${info.name}`);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated all 44 element classes with Confusion moves!');
