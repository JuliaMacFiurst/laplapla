import type { Quest1Dictionary } from "./index";

export const en: Quest1Dictionary = {
  engine: {
    confirmExit:
      "Your quest progress is not saved yet.\nIf you leave now, you will have to start over. Leave the quest?",
    homeButton: "Back to maps",
    prevButton: "← Back",
    nextButton: "Next →",
  },
  miniTest: {
    question: "Question {current} of {total}",
    check: "Check",
    next: "Next ⏭️",
  },
  day1: {
    title: "Toward the Polar Shores",
    startButton: "Start the story",
    nextButton: "🚢 Begin the journey",
    blocks: [
      [
        "<em>Firewood crackles in the fireplace. Snow falls slowly outside the window. On the fluffy rug by the fire sit their friends: Roland the stout bulldog in glasses, Svensen the Yorkshire terrier tangled in a plaid blanket, little Tobias playing with an orange, and a thoughtful cat curled up on the bed in the corner.</em>",
      ],
      [
        "<em>The bulldog opens an old, slightly worn book. His voice is low and calm:</em>",
      ],
      [
        "“Long ago, my young listener, there lived a great traveler, <strong>Sir Bartholomew Wagglestone</strong>. He crossed northern snowfields and southern sands, sailed across oceans, survived hurricanes and sandstorms. And on one of his journeys he found an ancient map, a map leading to the <strong>Treasure of Time</strong>. But fate is whimsical: a storm tore the map into five pieces and scattered them across the world.”",
      ],
      [
        "<em>The Yorkshire terrier sips tea and whispers:</em>",
        "“Five pieces... that is almost like five stories!”",
      ],
      [
        "<em>The bulldog nods:</em>",
        "<strong>“Exactly, my fluffy listeners. To find the treasure, the map must be assembled again. Each piece is hidden in a new country, beyond a river, behind mountains, under the sea, and in the heart of the jungle. Only the bravest will make it through.”</strong>",
      ],
      [
        "<em>The little puppy jumps up:</em>",
        "“Let us try!”",
        "<em>The bulldog closes the book with a smile:</em>",
      ],
      [
        "<strong>“Every journey begins with the first step. At dawn tomorrow, we set out.”</strong>",
        "<em>The fire crackles softly, and for a moment the sparks seem to form the outline of an old map...</em>",
      ],
    ],
  },
  day2: {
    question: "How would you like to travel?",
    flightOption: "✈️ Fly",
    sailOption: "🚢 Go by sea",
    blocks: [
      [
        "<em>The morning is warm, but excitement hangs in the air. The room is buzzing. <strong>Roland</strong> spins an old globe, squinting through his glasses.</em>",
        "“Hmm... if Sir Bartholomew’s notes are right, the first piece of the map must be somewhere in the north... but where exactly?”",
      ],
      [
        "<em><strong>Svensen</strong> is writing a packing list.</em>",
        "“Compass, flashlight, chocolate... no, wait, two chocolates!”",
      ],
      [
        "<em><strong>Tobias</strong> knocks over a stack of maps and squeals:</em>",
        "“We are going, right? We are going right now?!”",
      ],
      [
        "<em>There is a knock at the door. Logan the raccoon captain enters with a map that smells of salt and wind.</em>",
        "<em><strong>Logan</strong>:</em>",
        "“I heard someone here is preparing for a journey and needs a guide. I have flown over fjords and sailed through storms when seagulls froze in midair!”",
        "<em>He throws the map on the table. The destination: the <strong>mysterious Spitsbergen archipelago</strong> beyond the Arctic Circle.</em>",
      ],
      [
        "<em><strong>Logan</strong> speaks again:</em>",
        "“There are two ways to get there: by sea or by air. The choice is yours, brave tails!”",
      ],
      [
        "<em>Roland frowns. Svensen freezes. Tobias has already climbed onto a suitcase.</em>",
      ],
    ],
  },
  day3Flight: {
    title: "Plotting the route",
    introBlocks: [["The raccoon puts on a flight helmet and says:", "“Roland, place the blue marker on your home!”"]],
    tips: [
      "The blue point is your home.",
      "The red point is Spitsbergen.",
      "When you choose a route, straight, curved, or zigzag, the raccoon will show which countries you will fly over and help you find the best route.",
      "Read Logan and Roland’s discussion under the map carefully and answer the questions at the bottom of the page.",
    ],
    routeButtons: {
      straight: "Straight",
      arc: "Arc",
      zigzag: "Zigzag",
    },
    speech: {
      selectType: "Raccoon: “Choose a route type.”",
      flyingOver: "Raccoon: “You are flying over: {name}”",
      overCountries: "Raccoon points with a paw: “We are flying over: <strong>{names}</strong>”",
      overOcean: "Raccoon squints: “Looks like we are flying over the ocean!”",
      drawRoute: "Raccoon: “Draw a route between the port and Spitsbergen.”",
    },
    finishTitle: "You are a future pilot! 🚀",
    finishButton: "Time for takeoff! ✈️💨 ⏭️",
  },
  day3Sail: {
    title: "Plotting the route",
    introBlocks: [["The raccoon puts on a captain’s cap and says: 🦝🌊", "“Roland, place the blue marker on the nearest port!”"]],
    tips: [
      "The blue point is the nearest seaport connected to your home.",
      "The red point is Spitsbergen.",
      "When you choose a route, the raccoon will show which seas you will sail through and help you find the best route.",
      "Read Logan and Roland’s discussion under the map carefully and answer the questions at the bottom of the page.",
    ],
    mapSpeech: {
      startPrompt:
        "Raccoon: “Mark your location on the map and build a sea route to Spitsbergen (the red pin).”",
      landError:
        "Raccoon frowns: “Your route goes over land! <button id=\"reset-route-btn\" class=\"dialog-next-btn\">Build the route again</button>”",
      rebuildRoute: "Build the route again",
      routeComplete: "Raccoon: “Route complete!”",
      continueRoute: "Raccoon: “Let’s keep going!”",
      guideToSpitsbergen: "Raccoon: “Now draw the line toward Spitsbergen!”",
      routeTooShort: "Raccoon: “The route is too short.”",
      routeThroughSeas: "Raccoon smiles: “We sailed through: <strong>{seas}</strong>”",
      resetPrompt: "Raccoon: “Draw a route between the port and Spitsbergen.”",
    },
    finishTitle: "You are a true navigator! 🌊🧭",
    finishButton: "On to adventure! ⏭️",
  },
  day4Takeoff: {
    title: "Takeoff!",
    introBlocks: [
      ["The raccoon winks: “Ready? This will be our most beautiful takeoff yet!”", "Turn the yoke and press the controls, following the instructions from the experienced pilots on the screen."],
      ["Great job, captain! Look down there... I think it is time to prepare for landing!"],
      ["We have landed! Welcome to the land of ice and arctic foxes."],
    ],
    unmuteButton: "🔊 Turn on sound",
    nextButton: "Toward adventure!",
  },
  day4StarsNav: {
    title: "Toward the North Star!",
    introBlocks: [
      [
        "<em>Yorkie Svensen stands on deck, small and fluffy...</em>",
        "<em><strong>Svensen:</strong></em> The compass is acting strangely!",
        "<em><strong>Logan:</strong></em> Real travelers do not read arrows...",
      ],
      [
        "<em><strong>Logan continues:</strong></em> If you want to know where north is, look for Polaris.",
      ],
    ],
    defaultSpeech: "Raccoon: “Click a star to learn about it!”",
    videoTitle: "North Star",
    arrivalBlock: ["We made it! Welcome to the land of ice and arctic foxes."],
    nextButton: "Toward adventure!",
    mapTranslationNotice:
      "The labels on the star map are still shown in Russian for now. An English version will be added later.",
  },
  day5Spitsbergen: {
    title: "Spitsbergen Polar Station",
    stationImageAlt: "Spitsbergen Polar Station",
    blocks: [
      [
        "You are at a scientific polar station, a place where researchers study ancient ice, track the climate, observe polar bears, explore the aurora, and even store collections of rare plants in special cold vaults.",
      ],
      [
        "This station helps us understand how our planet is changing and what must be done to protect Arctic nature. Every day, experiments are run here, measurements are taken, data is sent to international centers, and scientists carefully watch how the north lives and changes.",
      ],
      [
        "It is time for you to get ready for your own polar expedition too! The base has three departments, and each one will help you master an important part of the preparation:",
      ],
      [
        "— <strong>Thermal module</strong> — where you learn proper polar clothing.<br/>— <strong>Equipment lab</strong> — where tools and instruments are tested.<br/>— <strong>Garage</strong> — where snowmobiles and field equipment are prepared for departure.",
        "You can enter the rooms in any order. Once you complete all three stages, the expedition will begin!",
      ],
    ],
    labels: {
      heat: "Thermal module",
      lab: "Laboratory",
      labAria: "Equipment laboratory",
      garage: "Garage",
    },
    nextButton: "Forward to the polar expedition",
  },
  day5Heat: {
    title: "Thermal module",
    backButton: "Back to the research station",
    loadingCharacters: "Loading characters…",
    characterCounter: "Character {current} of {total}",
  },
  day5Garage: {
    title: "Garage",
    subtitle:
      "Inspect the harness carefully. In the snow, it is important to trust your transport and know what condition it is in.",
    startRide: "🚀 Test ride",
    warningTitle: "⚠️ The sled is in dangerous condition",
    warningText: "Some indicators are critical. In the snow, this can lead to an accident.",
    warningBack: "🔧 Return to preparation",
    warningRisk: "⚠️ Take the risk and ride",
    backButton: "Back to the research station",
    stats: {
      lowRisk: "Low risk",
      highRisk: "High risk",
      stability: "Stability",
      stamina: "Stamina",
      speed: "Speed",
    },
    popup: {
      close: "Close",
      parts: {
        reins: "Reins",
        harness: "Harness",
        water: "Water",
        food: "Food",
        brake: "Brake",
        skids: "Runners",
        loads: "Load",
        dogs: "Dogs",
      },
      descriptions: {
        reins: "The reins pass commands to the dogs. Their condition affects how well the sled can be controlled.",
        harness: "The harness distributes the load between the dogs.",
        water: "Water is essential for the dogs' endurance on a long journey.",
        food: "Food helps the team keep up its strength.",
        brake: "The brake helps control speed on descents.",
        skids: "The runners affect glide and stability.",
        loads: "The load affects balance and speed.",
        dogs: "The dogs' condition is key to a successful run.",
      },
      choices: {
        reins: ["Check and tighten", "Leave as is"],
        harness: ["Adjust the harness", "Do not touch it"],
        water: ["Refill the water supply", "Save space"],
        food: ["Take extra food", "Carry a minimal supply"],
        brake: ["Check the brake", "Skip the check"],
        skids: ["Wax the runners", "Leave them unchanged"],
        loads: ["Redistribute the load", "Do not rearrange it"],
        dogs: ["Inspect the dogs", "Do not delay"],
      },
    },
  },
  day5Lab: {
    title: "Equipment laboratory",
    subtitle: "Here we will test tools and prepare an explorer's kit.",
    backButton: "Back to the research station",
    scoreLabel: "Score",
    gameStart: {
      title: "Laboratory mini-game",
      caption: "Collect only the items that are useful for a polar expedition!",
      button: "Start game",
    },
    gameFinal: {
      scoreTitle: "Final score",
      backpackCaption: "You are taking these items with you on the polar expedition:",
      restartButton: "Play again",
    },
  },
  day6: {
    title: "Expedition",
    nextButton: "To the Treasure of Time →",
    blocks: [
      [
        "They traveled for a long time.",
        "The sled glided softly over the crust. Snow creaked under the runners, and the dogs’ breathing merged into a steady living rhythm.",
        "Nothing extra. Only motion, cold, and the road ahead.",
      ],
      [
        "<em>There were no roads here, only direction.</em>",
        "No tracks, no signs, no familiar landmarks.",
        "In places like this, the world does not tell you the way. It watches how you choose it yourself.",
      ],
      [
        "<em>Roland narrowed his eyes at the horizon.</em>",
        "He did not raise his voice. Out here, everything important was already easy to hear.",
        "<strong>“We will not rush,” he said. “Here, the winner is not the one who moves fastest, but the one who notices best.”</strong>",
      ],
      [
        "<em>Little Tobias jumps up:</em>",
        "“I will be the first to look! Tracks, cracks, wind! And if anything seems strange, I will say it right away!”",
        "<em>Roland answers with a smile:</em>",
        "“Exactly. That is what an expedition is. One looks ahead, another looks around, and the third is not afraid to say when something feels wrong.”",
      ],
    ],
  },
  day7: {
    title: "Treasure of Time",
    videoTitle: "Spitsbergen Flight",
    backButton: "↩️ Return to the map",
    videoTranslationNotice:
      "This video does not have an English translation yet. It may be added later.",
    blocks: [
      [
        "Every expedition ends someday.",
        "But when something interesting comes to an end, it means something new is about to begin.",
        "It is time to go home, open the map, and search for new amazing places you will want to visit again.",
      ],
    ],
  },
};
