var profilesKey = 'darksouls3_profiles';
var stateKey = 'darksouls3_state';

(function($) {
    'use strict';

    var defaultProfiles = {
        'current': 'Default Profile'
    };
    defaultProfiles[profilesKey] = {
        'Default Profile': {
            checklistData: {}
        }
    };
    var profiles = $.jStorage.get(profilesKey, defaultProfiles);

    var stateStorage = $.jStorage.get(stateKey, {
        collapsed: {},
        current_tab: '#tabPlaythrough',
        hide_completed: false
    });

    var filter_categ = ["f_quest", "f_estus", "f_wpn", "f_armor", "f_ring", "f_mat", "f_misc"];
    var filter_bools = [false, false, false, false, false, false, false];

    jQuery(document).ready(function($) {

        $('ul li li[data-id], ul li[data-id]').each(function(index) {
            if ($(this).attr('data-id')) {
                addCheckbox(this);
            }
        });

        // Open external links in new tab
        $("a[href^='http']").attr('target','_blank');

        populateProfiles();

        $('input[type="checkbox"]').click(function() {
            var id = $(this).attr('id');
            var isChecked = profiles[profilesKey][profiles.current].checklistData[id] = $(this).prop('checked');
            //_gaq.push(['_trackEvent', 'Checkbox', (isChecked ? 'Check' : 'Uncheck'), id]);
            if (isChecked === true) {
              $('[data-id="'+id+'"] label').addClass('stroked');

              if ($("#toggleHideCompleted").data("hidden") === true) {
                $('[data-id="'+id+'"] label').parent().hide();
              }
            } else {
              $('[data-id="'+id+'"] label').removeClass('stroked');
            }
            $(this).parent().parent().find('li > label > input[type="checkbox"]').each(function() {
                var id = $(this).attr('id');
                profiles[profilesKey][profiles.current].checklistData[id] = isChecked;
                $(this).prop('checked', isChecked);
            });
            $.jStorage.set(profilesKey, profiles);
            calculateTotals();
        });

        $('#profiles').change(function(event) {
            profiles.current = $(this).val();
            $.jStorage.set(profilesKey, profiles);
            populateChecklists();
            //_gaq.push(['_trackEvent', 'Profile', 'Change', profiles.current]);
        });

        $('#profileAdd').click(function() {
            $('#profileModalTitle').html('Add Profile');
            $('#profileModalName').val('');
            $('#profileModalAdd').show();
            $('#profileModalUpdate').hide();
            $('#profileModalDelete').hide();
            $('#profileModal').modal('show');
            //_gaq.push(['_trackEvent', 'Profile', 'Add']);
        });

        $('#profileEdit').click(function() {
            $('#profileModalTitle').html('Edit Profile');
            $('#profileModalName').val(profiles.current);
            $('#profileModalAdd').hide();
            $('#profileModalUpdate').show();
            if (canDelete()) {
                $('#profileModalDelete').show();
            } else {
                $('#profileModalDelete').hide();
            }
            $('#profileModal').modal('show');
            //_gaq.push(['_trackEvent', 'Profile', 'Edit', profiles.current]);
        });

        $('#profileModalAdd').click(function(event) {
            event.preventDefault();
            var profile = $.trim($('#profileModalName').val());
            if (profile.length > 0) {
                if (typeof profiles[profilesKey][profile] == 'undefined') {
                    profiles[profilesKey][profile] = { checklistData: {} };
                }
                profiles.current = profile;
                $.jStorage.set(profilesKey, profiles);
                populateProfiles();
                populateChecklists();
            }
            //_gaq.push(['_trackEvent', 'Profile', 'Create', profile]);
        });

        $('#profileModalUpdate').click(function(event) {
            event.preventDefault();
            var newName = $.trim($('#profileModalName').val());
            if (newName.length > 0 && newName != profiles.current) {
                profiles[profilesKey][newName] = profiles[profilesKey][profiles.current];
                delete profiles[profilesKey][profiles.current];
                profiles.current = newName;
                $.jStorage.set(profilesKey, profiles);
                populateProfiles();
            }
            $('#profileModal').modal('hide');
            //_gaq.push(['_trackEvent', 'Profile', 'Update', profile]);
        });

        $('#profileModalDelete').click(function(event) {
            event.preventDefault();
            if (!canDelete()) {
                return;
            }
            if (!confirm('Are you sure?')) {
                return;
            }
            delete profiles[profilesKey][profiles.current];
            profiles.current = getFirstProfile();
            $.jStorage.set(profilesKey, profiles);
            populateProfiles();
            populateChecklists();
            $('#profileModal').modal('hide');
            //_gaq.push(['_trackEvent', 'Profile', 'Delete']);
        });
        /*
        *  The only stipulation with this method is that it will only work with
        *  HTML5 ready browsers, should be the vast majority now...
        */
        $('#profileExport').click(function(){
          var filename = "profiles.json";
          var text = JSON.stringify(profiles);
          var element = document.createElement('a');
          element.setAttribute('href', 'data:text/plain;charset=utf-8,' +
            encodeURIComponent(text));
          element.setAttribute('download', filename);
          element.style.display = 'none';
          document.body.appendChild(element);
          element.click();
          document.body.removeChild(element);
        });

        $('#profileImport').click(function(){
          $('#fileInput').trigger('click');
        });
        /* Will reject if an incorrect file or no file is selected */
        $('input#fileInput').change(function(){
          var fileInput = document.getElementById('fileInput');
          if(!fileInput.files || !fileInput.files[0] || !/\.json$/.test(fileInput.files[0].name)){
            return;
          }
          var fr = new FileReader();
          fr.readAsText(fileInput.files[0]);
          fr.onload = dataLoadCallback;
        });

        $("#toggleHideCompleted").click(function() {
            var hidden = $(this).data("hidden");
            if (hidden === true) {
                $(this).text("Hide completed");
            } else {
                $(this).text("Show completed");
            }
            $(this).data("hidden", !hidden);
            $(this).button('toggle');
            toggleCompletedCheckboxes(!hidden);
            stateStorage.hide_completed = !hidden;
            $.jStorage.set(stateKey, stateStorage);
        });

        $("#togglefilter_quest").click(function() {
            filter_bools[0] = toggleFilterButton($(this), filter_bools[0], "\u2611 Quests", "\u2610 Quests");
            toggleFilteredClasses("f_quest");
        });
        $("#togglefilter_estus").click(function() {
            filter_bools[1] = toggleFilterButton($(this), filter_bools[1], "\u2611 Estus", "\u2610 Estus");
            toggleFilteredClasses("f_estus");
        });
        $("#togglefilter_weapon").click(function() {
            filter_bools[2] = toggleFilterButton($(this), filter_bools[2], "\u2611 Weapons", "\u2610 Weapons");
            toggleFilteredClasses("f_wpn");
        });
        $("#togglefilter_armor").click(function() {
            filter_bools[3] = toggleFilterButton($(this), filter_bools[3], "\u2611 Armors", "\u2610 Armors");
            toggleFilteredClasses("f_armor");
        });
        $("#togglefilter_ring").click(function() {
            filter_bools[4] = toggleFilterButton($(this), filter_bools[4], "\u2611 Rings", "\u2610 Rings");
            toggleFilteredClasses("f_ring");
        });
        $("#togglefilter_materials").click(function() {
            filter_bools[5] = toggleFilterButton($(this), filter_bools[5], "\u2611 Materials", "\u2610 Materials");
            toggleFilteredClasses("f_mat");
        });
        $("#togglefilter_misc").click(function() {
            filter_bools[6] = toggleFilterButton($(this), filter_bools[6], "\u2611 Misc", "\u2610 Misc");
            toggleFilteredClasses("f_misc");
        });

        calculateTotals();

    });

    function dataLoadCallback(arg){
      var jsonProfileData = JSON.parse(arg.currentTarget.result);
      profiles = jsonProfileData;
      $.jStorage.set(profilesKey, profiles);
      populateProfiles();
      populateChecklists();
      $('#profiles').trigger("change");
      location.reload();
    }

    function populateProfiles() {
        $('#profiles').empty();
        $.each(profiles[profilesKey], function(index, value) {
            $('#profiles').append($("<option></option>").attr('value', index).text(index));
        });
        $('#profiles').val(profiles.current);
    }

    function populateChecklists() {
        $('input[type="checkbox"]').prop('checked', false);
        $.each(profiles[profilesKey][profiles.current].checklistData, function(index, value) {
            $('#' + index).prop('checked', value);
        });
        calculateTotals();
    }

    function calculateTotals() {
        $('[id$="_overall_total"]').each(function(index) {
            var type = this.id.match(/(.*)_overall_total/)[1];
            var overallCount = 0, overallChecked = 0;
            $('[id^="' + type + '_totals_"]').each(function(index) {
                var regex = new RegExp(type + '_totals_(.*)');
                var regexFilter = new RegExp('^playthrough_(.*)');
                var i = parseInt(this.id.match(regex)[1]);
                var count = 0, checked = 0;
                for (var j = 1; ; j++) {
                    var checkbox = $('#' + type + '_' + i + '_' + j);
                    if (checkbox.length === 0) {
                        break;
                    }
                    if (checkbox.is(':hidden') && checkbox.prop('id').match(regexFilter) && canFilter(checkbox.closest('li'))) {
                        continue;
                    }
                    count++;
                    overallCount++;
                    if (checkbox.prop('checked')) {
                        checked++;
                        overallChecked++;
                    }
                }
                if (checked == count) {
                    this.innerHTML = $('#' + type + '_nav_totals_' + i)[0].innerHTML = 'DONE';
                    $(this).removeClass('in_progress').addClass('done');
                    $($('#' + type + '_nav_totals_' + i)[0]).removeClass('in_progress').addClass('done');
                } else {
                    this.innerHTML = $('#' + type + '_nav_totals_' + i)[0].innerHTML =  checked + '/' + count;
                    $(this).removeClass('done').addClass('in_progress');
                    $($('#' + type + '_nav_totals_' + i)[0]).removeClass('done').addClass('in_progress');
                }
            });
            if (overallChecked == overallCount) {
                this.innerHTML = 'DONE';
                $(this).removeClass('in_progress').addClass('done');
            } else {
                this.innerHTML = overallChecked + '/' + overallCount;
                $(this).removeClass('done').addClass('in_progress');
            }
        });
    }

    function addCheckbox(el) {
        var lines = $(el).html().split('\n');
        lines[0] = '<div class="checkbox"><label><input type="checkbox" id="' + $(el).attr('data-id') + '">' + lines[0] + '</label></div>';
        $(el).html(lines.join('\n'));
        if (profiles[profilesKey][profiles.current].checklistData[$(el).attr('data-id')] === true) {
            $('#' + $(el).attr('data-id')).prop('checked', true);
            $('label', $(el)).addClass('stroked');
        }
    }

    function canDelete() {
        var count = 0;
        $.each(profiles[profilesKey], function(index, value) {
            count++;
        });
        return (count > 1);
    }

    function getFirstProfile() {
        for (var profile in profiles[profilesKey]) {
            return profile;
        }
    }

    function toggleCompletedCheckboxes(hide) {
        $("li .checkbox .stroked").parentsUntil("ul").each(function() {
            if (hide === true) {
                $(this).hide();
            } else {
                var regexFilter = new RegExp('^playthrough_(.*)');
                if ($(this).is('li') && $(this).closest('li').attr('data-id').match(regexFilter) && canFilter($(this).closest('li'))) {
                    return;
                }
                $(this).show();
            }
        });
    }

    function toggleFilterButton(button, f_hidden, shown_txt, hidden_txt) {
        if (f_hidden) {
            button.text(shown_txt);
        } else {
            button.text(hidden_txt);
        }
        button.button('toggle');
        return !f_hidden;
    }

    function canFilter(entry) {
        var regexFilter = new RegExp('^f_(.*)');
        if (entry.hasClass('') === true) {
            return true;
        }
        var classList = entry.attr('class').split(/\s+/);
        for (var i = 0; i < classList.length; i++) {
            if (!classList[i].match(regexFilter)) {
                continue;
            }
            var filterIndex = $.inArray(classList[i] , filter_categ);
            if(filterIndex !== -1) {
                if(!filter_bools[filterIndex]) {
                    return false;
                }
            }
        }
        return true;
    }

    function toggleFilteredClasses(str) {
        $("li." + str).each(function() {
            if(canFilter($(this))) {
                $(this).hide();
            } else {
                $(this).show();
            }
        });
        calculateTotals();
    }

    /*
     * ----------------------------------
     * Search and highlight functionality
     * ----------------------------------
     */
    $(function() {
        var jets = [new Jets({
            searchTag: '#playthrough_search',
            contentTag: '#playthrough_list ul'
        }), new Jets({
            searchTag: '#item_search',
            contentTag: '#item_list ul'
        }), new Jets({
            searchTag: '#weapons_search',
            contentTag: '#weapons_list ul'
        }), new Jets({
            searchTag: '#armors_search',
            contentTag: '#armors_list ul'
        })];

        $('#playthrough_search').keyup(function() {
            $('#playthrough_list').unhighlight();
            $('#playthrough_list').highlight($(this).val());
        });
        $('#item_search').keyup(function() {
            $('#item_list').unhighlight();
            $('#item_list').highlight($(this).val());
        });
        $('#weapons_search').keyup(function() {
            $('#weapons_list').unhighlight();
            $('#weapons_list').highlight($(this).val());
        });
        $('#armors_search').keyup(function() {
            $('#armors_list').unhighlight();
            $('#armors_list').highlight($(this).val());
        });
    });

    /*
     * -------------------------
     * Back to top functionality
     * -------------------------
     */
    $(function() {
        var offset = 220;
        var duration = 500;
        $(window).scroll(function() {
            if ($(this).scrollTop() > offset) {
                $('.back-to-top').fadeIn(duration);
            } else {
                $('.back-to-top').fadeOut(duration);
            }
        });

        $('.back-to-top').click(function(event) {
            event.preventDefault();
            $('html, body').animate({scrollTop: 0}, duration);
            return false;
        });
    });

    /*
     * ------------------------------------------
     * Restore tabs/hidden sections functionality
     * ------------------------------------------
     */
     $(function() {
        // restore collapsed state on page load
        $.each(stateStorage.collapsed, function(key, val) {
            if (val) {
                $('a[href="' + key + '"]').click();
            }
        });

        if (stateStorage.current_tab) {
            $('.nav.navbar-nav li a[href="' + stateStorage.current_tab + '"]').click();
        }

        if (typeof stateStorage.hide_completed !== 'undefined' &&
            stateStorage.hide_completed !== null && stateStorage.hide_completed === true) {
            $("#toggleHideCompleted").click();
        }

        // register on click handlers to store state
        $('a[href$="_col"]').on('click', function(el) {
            var collapsed_key = $(this).attr('href');
            var saved_tab_state = !!stateStorage.collapsed[collapsed_key];

            stateStorage.collapsed[$(this).attr('href')] = !saved_tab_state;

            $.jStorage.set(stateKey, stateStorage);
        });

        $('.nav.navbar-nav li a').on('click', function(el) {
            stateStorage.current_tab = $(this).attr('href');

            $.jStorage.set(stateKey, stateStorage);
        });
     });
})( jQuery );
