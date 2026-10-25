# Dark Souls 3 Cheat Sheet

[简体中文说明](README.zh-CN.md)

The checklist supports English / Simplified Chinese switching, including all 1,953 checklist entries, the base game and both DLCs, navigation, search, profile dialogs, completion labels and import/export messages. Existing checklist IDs and saved profiles remain compatible.

To view the cheat sheet [click here](https://zkjellberg.github.io/dark-souls-3-cheat-sheet/). For local use, run `node tests/server.cjs` and open <http://127.0.0.1:8080/?lang=zh-CN> for Chinese or <http://127.0.0.1:8080/?lang=en> for English. No build step is needed. The page uses pinned CDN dependencies, so an Internet connection is required for those assets.

This checklist was created by adopting the source code from the [Dark Souls 2 Cheat Sheet](https://github.com/smcnabb/dark-souls-2-cheat-sheet/tree/gh-pages) created by [Stephen McNabb](https://github.com/smcnabb).

The walkthrough is thanks to [DeathGodGarra's NPC Side Quests Guide V2](https://www.gamefaqs.com/boards/168566-dark-souls-iii/73599466).

## Localization

Use the language selector in the navigation bar. A supported `?lang=` parameter takes priority over the saved language preference, then browser language detection is used; unsupported languages fall back to English. Chinese browser locales use Simplified Chinese. Changing language saves the preference and reloads the page so search indexes are rebuilt for the selected content.

`js/locales/zh-CN.js` contains a `text` dictionary for UI strings and an `entries` dictionary keyed by the existing `data-id` values. `js/i18n.js` applies translations before `main.js` initializes checkboxes and search. Dynamic messages call `DS3I18n.t()`. Missing translations retain the English source. Keep checklist IDs, original links, nested lists and user profile names intact when updating translations. The language preference has its own storage key and is not part of profile backups.

The Chinese checklist text was adapted from [soarqin's MIT-licensed translation](https://github.com/soarqin/dark-souls-3-cheat-sheet/blob/856c2cf62924a01cf27585b2f2d5c714cd473176/index.html), aligned with upstream commit `b854e3d1e5d914d5453fdc3a6f4b16c3f82f5d00`, and corrected for updated entries, malformed links, terminology and achievement instructions. See [third-party notices](THIRD_PARTY_NOTICES.md).

## Verification

With Node.js 20 or later:

```sh
npm ci
npx playwright install chromium
npm test
```

The browser tests cover translation coverage and original links, language selection and fallback, Chinese search, progress and profile compatibility, import/export, dynamic messages and mobile navigation. Tests load the same pinned CDN dependencies as the application and disable analytics. Set `PLAYWRIGHT_CHANNEL=chrome` to use an installed Chrome browser, or `PLAYWRIGHT_PROXY` to an HTTP proxy when required by your network.

## Contribution Guide

If you are interested in contributing to this guide, I welcome Pull Requests.

For some background on how the guide code is written, here is a sample item on the checklist:

```
<li data-id="playthrough_13_20" class="f_gem f_misc">Continue left until you can enter a room with a Large Soul of a Nameless Soldier and a Raw Gem</li>
```

The **data-id** is a unique ID used to store the user's progress. For example, ***playthrough_13_20*** is the 20th task in zone 13. New data-ids must be used in ascending order, but you can place the new entries anywhere within a zone.

The **class="f_gem f_misc"** field is used for the filtering system. This task provides the user with a gem and a consumable, so we use **f_gem** and **f_misc**. The full list of filter classes is:

| Class   | Description |
|---      |--- |
| f_boss  | Boss fights |
| f_miss  | Content that can be permanently missed |
| f_npc   | NPC side quests |
| f_estus | Estus Shards |
| f_bone  | Undead Bone Shards |
| f_tome  | Sorcery Scrolls, Pyromancy Tomes, and Divine Tomes |
| f_coal  | Coals |
| f_ash   | Umbral Ashes |
| f_gest  | Gestures |
| f_sorc  | Sorceries |
| f_pyro  | Pyromancies |
| f_mirac | Miracles |
| f_ring  | Rings |
| f_weap  | Weapons, Spell Tools, and Shields |
| f_arm   | Armor Sets or individual pieces |
| f_tit   | Titanite |
| f_gem   | Gems |
| f_cov   | Covenants |
| f_misc  | *any other items* |

If none of these filter classes match, use **class="f_none"**.

In addition to the filter classes, there is a second type of classes used to control the visibility of entries based on which playthrough the user is on:

| Class  | Description |
|---     |--- |
| h_ng+  | items hidden on NG+ and beyond, e.g., Ashen Estus Flask |
| s_ng+  | items shown on NG+ and beyond, e.g., +1 rings |
| s_ng++ | items shown on NG++ and beyond, e.g., +2 rings |
