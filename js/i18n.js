(function (window, document) {
    'use strict';

    var storageKey = 'darksouls3_language';
    var locales = window.DS3Locales || {};

    function normalizeLanguage(value) {
        if (typeof value !== 'string') return null;
        if (/^zh(?:-|$)/i.test(value)) return 'zh-CN';
        if (/^en(?:-|$)/i.test(value)) return 'en';
        return null;
    }

    function chooseLanguage() {
        var requested = normalizeLanguage(new URLSearchParams(window.location.search).get('lang'));
        if (requested) return requested;
        try {
            var saved = normalizeLanguage(window.localStorage.getItem(storageKey));
            if (saved) return saved;
        } catch (error) {
            // Language selection still works when browser storage is unavailable.
        }
        var languages = window.navigator.languages || [window.navigator.language];
        for (var i = 0; i < languages.length; i++) {
            var detected = normalizeLanguage(languages[i]);
            if (detected) return detected;
        }
        return 'en';
    }

    var language = chooseLanguage();
    var locale = locales[language] || { text: {}, entries: {} };

    function t(source, parameters) {
        var translated = Object.prototype.hasOwnProperty.call(locale.text, source) ? locale.text[source] : source;
        return translated.replace(/\{(\w+)\}/g, function (match, name) {
            return parameters && Object.prototype.hasOwnProperty.call(parameters, name) ? parameters[name] : match;
        });
    }

    window.DS3I18n = { language: language, t: t };
    document.documentElement.lang = language === 'en' ? 'en-US' : language;
    document.title = t(document.title);
    var description = document.querySelector('meta[name="description"]');
    if (description) description.content = t(description.content);

    // Change only the item's own content; keep nested checklist elements and IDs.
    document.querySelectorAll('li[data-id]').forEach(function (item) {
        var content = locale.entries[item.getAttribute('data-id')];
        if (typeof content !== 'string') return;
        var nested = Array.prototype.filter.call(item.children, function (child) { return child.tagName === 'UL'; });
        nested.forEach(function (list) { item.removeChild(list); });
        item.innerHTML = content;
        nested.forEach(function (list) { item.appendChild(document.createTextNode('\n')); item.appendChild(list); });
    });

    // Translate static UI text before main.js creates checkboxes and search indexes.
    // Profiles and other user-entered text are never sent through the dictionary.
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    var node;
    while ((node = walker.nextNode())) {
        if (node.parentElement.closest('script, style, [data-id], [data-no-i18n]')) continue;
        var source = node.nodeValue.replace(/\s+/g, ' ').trim();
        if (source && Object.prototype.hasOwnProperty.call(locale.text, source)) {
            node.nodeValue = node.nodeValue.replace(/\S(?:[\s\S]*\S)?/, t(source));
        }
    }

    ['placeholder', 'aria-label', 'title'].forEach(function (attribute) {
        document.querySelectorAll('[' + attribute + ']').forEach(function (element) {
            element.setAttribute(attribute, t(element.getAttribute(attribute)));
        });
    });

    var selector = document.getElementById('language');
    if (selector) {
        selector.value = language;
        selector.addEventListener('change', function () {
            var selected = normalizeLanguage(selector.value);
            if (!selected || selected === language) return;
            try { window.localStorage.setItem(storageKey, selected); } catch (error) { /* Optional preference. */ }
            // Reload so checkbox event handlers and Jets indexes use the selected content.
            // Existing profiles, filters, current tab, theme and completion IDs are unchanged.
            var url = new URL(window.location.href);
            url.searchParams.set('lang', selected);
            window.location.assign(url.href);
        });
    }
})(window, document);
