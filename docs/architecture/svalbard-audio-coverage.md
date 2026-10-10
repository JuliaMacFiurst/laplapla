# Svalbard narration coverage

This matrix maps every authoritative manifest block to the game state that can expose it. "Integrated" means the block is registered only while its source text is available; it does not mean the production feature flag is enabled.

Summary: **83 catalogued; 80 integrated; 3 intentionally unavailable with concrete source/game-state conflicts.** All catalogued blocks have RU/EN/HE audio paths. Desktop and mobile share semantic IDs but register their own actual reveal state.

| Block ID | Day | Scene | Availability trigger | Desktop | Mobile | Status |
|---|---|---|---|---|---|---|
| `svalbard.day01.intro.01` | day01 | intro | Paragraph revealed after Start | Integrated | Integrated | Integrated |
| `svalbard.day01.intro.02` | day01 | intro | Paragraph revealed after Start | Integrated | Integrated | Integrated |
| `svalbard.day01.intro.03` | day01 | intro | Paragraph revealed after Start | Integrated | Integrated | Integrated |
| `svalbard.day01.intro.04` | day01 | intro | Paragraph revealed after Start | Integrated | Integrated | Integrated |
| `svalbard.day01.intro.05` | day01 | intro | Paragraph revealed after Start | Integrated | Integrated | Integrated |
| `svalbard.day01.intro.06` | day01 | intro | Paragraph revealed after Start | Integrated | Integrated | Integrated |
| `svalbard.day01.intro.07` | day01 | intro | Paragraph revealed after Start | Integrated | Integrated | Integrated |
| `svalbard.day02.departure.01` | day02 | departure | Departure paragraph revealed | Integrated | Integrated | Integrated |
| `svalbard.day02.departure.02` | day02 | departure | Departure paragraph revealed | Integrated | Integrated | Integrated |
| `svalbard.day02.departure.03` | day02 | departure | Departure paragraph revealed | Integrated | Integrated | Integrated |
| `svalbard.day02.departure.04` | day02 | departure | Departure paragraph revealed | Integrated | Integrated | Integrated |
| `svalbard.day02.departure.05` | day02 | departure | Departure paragraph revealed | Integrated | Integrated | Integrated |
| `svalbard.day02.departure.06` | day02 | departure | Departure paragraph revealed | Integrated | Integrated | Integrated |
| `svalbard.day02.transport-choice.01` | day02 | transport-choice | Transport choice is visible | Integrated | Integrated | Integrated |
| `svalbard.day03.flight.intro.01` | day03 | flight-intro | Flight intro is visible | Integrated | Integrated | Integrated |
| `svalbard.day03.flight.route-explanation.01` | day03 | flight-route | Flight route/tool text is visible | Integrated | Integrated | Integrated |
| `svalbard.day03.flight.quiz-instruction.01` | day03 | flight-quiz | Flight quiz instruction is visible | Integrated | Integrated | Integrated |
| `svalbard.day03.flight-dialogue.straight-1` | day03 | flight-dialogue | Matching flight dialogue key is active | Integrated | Integrated | Integrated |
| `svalbard.day03.flight-dialogue.straight-3` | day03 | flight-dialogue | Matching flight dialogue key is active | Integrated | Integrated | Integrated |
| `svalbard.day03.flight-dialogue.straight-5` | day03 | flight-dialogue | No safe runtime trigger | Unavailable | Unavailable | Blocked: recording merges mutually exclusive straight_5 and arc_1 text |
| `svalbard.day03.flight-dialogue.arc-2` | day03 | flight-dialogue | Matching flight dialogue key is active | Integrated | Integrated | Integrated |
| `svalbard.day03.flight-dialogue.zigzag-1` | day03 | flight-dialogue | Matching flight dialogue key is active | Integrated | Integrated | Integrated |
| `svalbard.day03.flight-dialogue.zigzag-3` | day03 | flight-dialogue | No safe runtime trigger | Unavailable | Unavailable | Blocked: recording also contains non-rendered afterCorrect_1 text |
| `svalbard.day03.flight-dialogue.afterCorrect-2` | day03 | flight-dialogue | No safe runtime trigger | Unavailable | Unavailable | Blocked: current game never queues the afterCorrect state |
| `svalbard.day03.flight.mercator-explanation.01` | day03 | flight-quiz | Quiz answer has been checked | Integrated | Integrated | Integrated |
| `svalbard.day03.sail.intro.01` | day03 | sail-intro | Sail intro is visible | Integrated | Integrated | Integrated |
| `svalbard.day03.sail.route-explanation.01` | day03 | sail-route | Sail route/tool text is visible | Integrated | Integrated | Integrated |
| `svalbard.day03.sail.quiz-instruction.01` | day03 | sail-quiz | Sail quiz instruction is visible | Integrated | Integrated | Integrated |
| `svalbard.day03.sail.draw-route.01` | day03 | sail-route | Sail route/tool text is visible | Integrated | Integrated | Integrated |
| `svalbard.day03.sail-dialogue.intro-1` | day03 | sail-dialogue | Matching sail dialogue key is active | Integrated | Integrated | Integrated |
| `svalbard.day03.sail-dialogue.ice-1` | day03 | sail-dialogue | Matching sail dialogue key is active | Integrated | Integrated | Integrated |
| `svalbard.day03.sail-dialogue.ice-3` | day03 | sail-dialogue | Matching sail dialogue key is active | Integrated | Integrated | Integrated |
| `svalbard.day03.sail-dialogue.current-1` | day03 | sail-dialogue | Matching sail dialogue key is active | Integrated | Integrated | Integrated |
| `svalbard.day03.sail-dialogue.current-3` | day03 | sail-dialogue | Matching sail dialogue key is active | Integrated | Integrated | Integrated |
| `svalbard.day03.sail-dialogue.storm-1` | day03 | sail-dialogue | Matching sail dialogue key is active | Integrated | Integrated | Integrated |
| `svalbard.day03.sail-dialogue.storm-3` | day03 | sail-dialogue | Matching sail dialogue key is active | Integrated | Integrated | Integrated |
| `svalbard.day03.sail-dialogue.depth-1` | day03 | sail-dialogue | Matching sail dialogue key is active | Integrated | Integrated | Integrated |
| `svalbard.day03.sail-dialogue.final-1` | day03 | sail-dialogue | Matching sail dialogue key is active | Integrated | Integrated | Integrated |
| `svalbard.day03.sail-dialogue.final-3` | day03 | sail-dialogue | Matching sail dialogue key is active | Integrated | Integrated | Integrated |
| `svalbard.day04.takeoff.01` | day04 | takeoff | Takeoff story is visible | Integrated | Integrated | Integrated |
| `svalbard.day04.takeoff.02` | day04 | takeoff | Takeoff story is visible | Integrated | Integrated | Integrated |
| `svalbard.day04.takeoff.03` | day04 | takeoff | Takeoff story is visible | Integrated | Integrated | Integrated |
| `svalbard.day04.takeoff.hint-01` | day04 | takeoff-controls | Corresponding switch hint is open | Integrated | Integrated | Integrated |
| `svalbard.day04.takeoff.hint-02` | day04 | takeoff-controls | Corresponding switch hint is open | Integrated | Integrated | Integrated |
| `svalbard.day04.takeoff.hint-03` | day04 | takeoff-controls | Corresponding switch hint is open | Integrated | Integrated | Integrated |
| `svalbard.day04.takeoff.hint-04` | day04 | takeoff-controls | Corresponding switch hint is open | Integrated | Integrated | Integrated |
| `svalbard.day04.takeoff.hint-05` | day04 | takeoff-controls | Corresponding switch hint is open | Integrated | Integrated | Integrated |
| `svalbard.day04.takeoff.hint-06` | day04 | takeoff-controls | Corresponding switch hint is open | Integrated | Integrated | Integrated |
| `svalbard.day04.takeoff.hint-07` | day04 | takeoff-controls | Corresponding switch hint is open | Integrated | Integrated | Integrated |
| `svalbard.day04.takeoff.hint-08` | day04 | takeoff-controls | Corresponding switch hint is open | Integrated | Integrated | Integrated |
| `svalbard.day04.takeoff.hint-09` | day04 | takeoff-controls | Corresponding switch hint is open | Integrated | Integrated | Integrated |
| `svalbard.day04.takeoff.hint-10` | day04 | takeoff-controls | Corresponding switch hint is open | Integrated | Integrated | Integrated |
| `svalbard.day04.takeoff.hint-11` | day04 | takeoff-controls | Corresponding switch hint is open | Integrated | Integrated | Integrated |
| `svalbard.day04.takeoff.hint-12` | day04 | takeoff-controls | Corresponding switch hint is open | Integrated | Integrated | Integrated |
| `svalbard.day04.takeoff.hint-13` | day04 | takeoff-controls | Corresponding switch hint is open | Integrated | Integrated | Integrated |
| `svalbard.day04.takeoff.hint-14` | day04 | takeoff-controls | Corresponding switch hint is open | Integrated | Integrated | Integrated |
| `svalbard.day04.stars.intro.01` | day04 | stars-intro | Star-navigation story is visible | Integrated | Integrated | Integrated |
| `svalbard.day04.stars.intro.02` | day04 | stars-intro | Star-navigation story is visible | Integrated | Integrated | Integrated |
| `svalbard.day04.stars-dialogue.intro-1` | day04 | stars-dialogue | Matching star dialogue key is active | Integrated | Integrated | Integrated |
| `svalbard.day04.stars-dialogue.intro-3` | day04 | stars-dialogue | Matching star dialogue key is active | Integrated | Integrated | Integrated |
| `svalbard.day04.stars-dialogue.merak-1` | day04 | stars-dialogue | Matching star dialogue key is active | Integrated | Integrated | Integrated |
| `svalbard.day04.stars-dialogue.polaris-1` | day04 | stars-dialogue | Matching star dialogue key is active | Integrated | Integrated | Integrated |
| `svalbard.day04.stars-dialogue.finish-2` | day04 | stars-dialogue | Matching star dialogue key is active | Integrated | Integrated | Integrated |
| `svalbard.day04.stars.arrival.01` | day04 | arrival | Arrival/video state is visible | Integrated | Integrated | Integrated |
| `svalbard.day05.station.intro.01` | day05 | station-intro | Station intro page is active | Integrated | Integrated | Integrated |
| `svalbard.day05.station.intro.02` | day05 | station-intro | Station intro page is active | Integrated | Integrated | Integrated |
| `svalbard.day05.station.intro.03` | day05 | station-intro | Station intro page is active | Integrated | Integrated | Integrated |
| `svalbard.day05.station.intro.04` | day05 | station-intro | Station intro page is active | Integrated | Integrated | Integrated |
| `svalbard.day05.garage.intro.01` | day05 | garage | Garage subtitle is visible | Integrated | N/A: source subtitle is not rendered | Integrated on desktop only, matching actual UI |
| `svalbard.day05.garage.part-reins.01` | day05 | garage | Matching equipment popup is open | Integrated | Integrated | Integrated |
| `svalbard.day05.garage.part-harness.01` | day05 | garage | Matching equipment popup is open | Integrated | Integrated | Integrated |
| `svalbard.day05.garage.part-water.01` | day05 | garage | Matching equipment popup is open | Integrated | Integrated | Integrated |
| `svalbard.day05.garage.part-food.01` | day05 | garage | Matching equipment popup is open | Integrated | Integrated | Integrated |
| `svalbard.day05.garage.part-brake.01` | day05 | garage | Matching equipment popup is open | Integrated | Integrated | Integrated |
| `svalbard.day05.garage.part-skids.01` | day05 | garage | Matching equipment popup is open | Integrated | Integrated | Integrated |
| `svalbard.day05.garage.part-loads.01` | day05 | garage | Matching equipment popup is open | Integrated | Integrated | Integrated |
| `svalbard.day05.garage.part-dogs.01` | day05 | garage | Matching equipment popup is open | Integrated | Integrated | Integrated |
| `svalbard.day05.lab.instruction.01` | day05 | lab | Lab instruction overlay is visible | Integrated | Integrated | Integrated |
| `svalbard.day06.expedition.01` | day06 | expedition | Expedition paragraph is visible | Integrated | Integrated | Integrated |
| `svalbard.day06.expedition.02` | day06 | expedition | Expedition paragraph is visible | Integrated | Integrated | Integrated |
| `svalbard.day06.expedition.03` | day06 | expedition | Expedition paragraph is visible | Integrated | Integrated | Integrated |
| `svalbard.day06.expedition.04` | day06 | expedition | Expedition paragraph is visible | Integrated | Integrated | Integrated |
| `svalbard.day07.ending.01` | day07 | ending | Ending page is visible | Integrated | Integrated | Integrated |

## Exceptions requiring approval

1. `svalbard.day03.flight-dialogue.straight-5` must be split or regenerated because one MP3 contains text from two mutually exclusive route choices.
2. `svalbard.day03.flight-dialogue.zigzag-3` must be split or regenerated because its MP3 continues into an `afterCorrect_1` line that the game does not display.
3. `svalbard.day03.flight-dialogue.afterCorrect-2` needs an approved source-state decision: the current flight game never queues the `afterCorrect` dialogue.
4. `svalbard.day05.garage.intro.01` is available on desktop. The mobile garage currently has no matching visible subtitle, so mobile correctly does not register it.

The runtime catalog retains all four IDs above; none are silently removed from manifest coverage. The three blocked flight recordings are not exposed to avoid inaccurate narration and future-story leakage.
