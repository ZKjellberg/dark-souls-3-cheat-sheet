# Dark Souls 3 Cheat Sheet

To view the cheat sheet [click here](https://zkjellberg.github.io/dark-souls-3-cheat-sheet/).

This checklist was created by adopting the source code from [Dark Souls 2 Cheat Sheet](https://github.com/smcnabb/dark-souls-2-cheat-sheet/tree/gh-pages) created [Stephen McNabb](https://github.com/smcnabb)

The walkthrough is thanks to [DeathGodGarra's NPC Side Quests Guide V2](https://www.gamefaqs.com/boards/168566-dark-souls-iii/73599466)

## Contribution Guide

If you are interested in contributing to this guide, I welcome Pull Requests.

For some background on how the guide code is written, here is a sample item on the checklist.

```
<li data-id="playthrough_17_12" class="f_wpn f_armor">Kill Sword Master Saber to get the Uchigatana and Master's Attire</li>
```

The **data-id** is a unique ID used to store the user's progress. For example, ***playthrough_17_12*** was the 12th task in zone 17. You can add new elements out of order, but they must be added in ascending order.

The **class="f_wpn f_armor"** field is used for the filtering system. This task provides the user with weapon and armor, so we use ***f_wpn*** and ***f_armor***. The full list of filter classes are listed below.

| Category  | Class   |
|---        |---      |
| Quest     | f_quest |
| Etus      | f_estus |
| Weapon    | f_wpn   |
| Armor     | f_armor |
| Ring      | f_ring  |
| Materials | f_mat   |
| Misc      | f_misc  |
