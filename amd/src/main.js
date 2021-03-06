define(
    ['jquery', 'core/ajax', 'core/notification', 'core/str', 'core/templates', 'core/url'],
    function($, AJAX, NOTIFICATION, STR, TEMPLATES, URL) {
    return {
        searchid: 0, // Ensures that only the last search is shown.
        loadpositions: {},
        confirmRemoval: function(url) {
            STR.get_strings([
                    {'key' : 'removal:title', component: 'block_edupublisher' },
                    {'key' : 'removal:text', component: 'block_edupublisher' },
                    {'key' : 'yes' },
                    {'key': 'no'}
                ]).done(function(s) {
                    NOTIFICATION.confirm(s[0], s[1], s[2], s[3], function() {
                        top.location.href = url;
                    });
                }
            ).fail(NOTIFICATION.exception);
        },
        cancelPackageForm: function(url) {
            STR.get_strings([
                    {'key' : 'removal:title', component: 'block_edupublisher' },
                    {'key' : 'removal:text', component: 'block_edupublisher' },
                    {'key' : 'yes' },
                    {'key': 'no'}
                ]).done(function(s) {
                    NOTIFICATION.confirm(s[0], s[1], s[2], s[3], function() {
                        top.location.href = url;
                    });
                }
            ).fail(NOTIFICATION.exception);
        },
        exportCourseWarning: function() {
            var active = $('#id_exportcourse').is(':checked');
            if (!active) {
                STR.get_strings([
                        {'key' : 'exportcourse', component: 'block_edupublisher' },
                        {'key' : 'exportcourse_help', component: 'block_edupublisher' },
                        {'key' : 'yes' },
                        {'key': 'no'}
                    ]).done(function(s) {
                        NOTIFICATION.confirm(s[0], s[1], s[2], s[3], function() {}, function() { $('#id_exportcourse').prop('checked', true); });
                    }
                ).fail(NOTIFICATION.exception);
            }
        },
        preparePackageForm: function(channels) {
            console.log('MAIN.preparePackageForm(channels)', channels);
            require(["jquery"], function($) {
                if (typeof channels !== 'undefined') {
                    channels = channels.split(',');
                    for (var a = 0; a < channels.length; a++) {
                        if (channels[a] == 'default') continue;
                        // The former one is the checkbox, the latter on the div.
                        if (!$('div[role="main"] #id_' + channels[a] + '_publishas').is(":checked")) {
                            $('div[role="main"] #id_' + channels[a] + '_publish_as').css("display", "none");
                        } else if($('div[role="main"] input[name="id"]').val() > 0) {
                            // If id greater 0 and already active disable this box.
                            $('div[role="main"] #id_' + channels[a] + '_publishas').attr('disabled', 'disabled');
                        }
                    }
                }
            });
        },
        search: function(uniqid, courseid, sectionid) {
            var MAIN = this;
            console.log('MAIN.search(uniqid, courseid, sectionid)', uniqid, courseid, sectionid);

            MAIN.watchValue({
                courseid: courseid,
                sectionid: sectionid,
                target: '#' + uniqid + '-search',
                uniqid: uniqid,
                run: function() {
                    var o = this;
                    require(['block_edupublisher/main'], function(MAIN) {
                        MAIN.searchid++;
                        var searchid = MAIN.searchid;
                        console.log('Doing search via ajax for', $(o.target).val(), MAIN.searchid, searchid);
                        AJAX.call([{
                            methodname: 'block_edupublisher_search',
                            args: { search: $(o.target).val() },
                            done: function(result) {
                                if (MAIN.searchid != searchid) {
                                    console.log(' => Got response for searchid ', searchid, ' but it is not the current search', MAIN.searchid);
                                } else {
                                    console.log('Result', result);
                                    //$('ul#' + o.uniqid + '-results').empty().html(result);

                                    var result = JSON.parse(result);
                                    console.log('Received', result);
                                    $('ul#' + o.uniqid + '-results').empty();

                                    var counts = Object.keys(result.relevance);
                                    var stagesrelevances = [0, 1, 2];
                                    var stagesprinted = [false, false, false];
                                    if (counts.length === 0) {
                                        STR.get_strings([
                                                {'key' : 'search:enter_term', component: 'block_edupublisher' },
                                            ]).done(function(s) {
                                                $('ul#' + o.uniqid + '-results').append($('<li>').append('<a href="#">').append('<h3>').html(s[0]));
                                            }
                                        ).fail(NOTIFICATION.exception);
                                    } else if (counts.length === 1) {
                                        // All are the same relevant
                                        var stagesrelevances = [0, 0, counts[0], counts[0] + 1];
                                    } else if (counts.length === 2) {
                                        // All are the only two relevant stages
                                        var max = Math.round(counts[counts.length - 1]);
                                        var stagesrelevances = [0, 0, max / 2, max];
                                    } else {
                                        // We divide into three fields
                                        var max = Math.round(counts[counts.length - 1]);
                                        var stagesrelevances = [0, max / 3, max / 3 * 2, max];
                                    }
                                    var position = 0;
                                    for(var a = counts.length - 1; a >= 0; a--) {
                                        var relevance = counts[a];
                                        var ids = result.relevance[relevance];
                                        if (ids.length == 0) continue;

                                        var stage = -1;
                                        for (var b = 0; b < stagesrelevances.length; b++) {
                                            console.log('Compare ', b, 'of ', stagesrelevances, ' to ', relevance)
                                            if (relevance >= stagesrelevances[b]) {
                                                stage = b;
                                            }
                                            console.log('=> Stage is ', stage);
                                        }

                                        if (stage > -1 && !stagesprinted[stage]) {
                                            MAIN.searchTemplate(o.uniqid, position++, 'block_edupublisher/search_li_divider', { stage0: (stage == 0), stage1: (stage == 1), stage2: (stage == 2), stage3: (stage == 3) });
                                            stagesprinted[stage] = true;
                                        }

                                        for (var b = 0; b < ids.length; b++) {
                                            var item = result.packages[ids[b]];
                                            item.importtocourseid = o.courseid;
                                            item.importtosectionid = o.sectionid;
                                            item.showpreviewbutton = true;
                                            console.log('Call list-template for item ', item.id);
                                            MAIN.searchTemplate(o.uniqid, position++, 'block_edupublisher/search_li', item);
                                        }
                                    }
                                }
                            },
                            fail: NOTIFICATION.exception
                        }]);
                    });
                }
            }, 200);
        },
        /**
         * Print all items that are loaded in listpositions.
         */
        searchPrint: function(uniqid) {
            var MAIN = this;
            var ok = true;
            var positions = Object.keys(MAIN.loadpositions[uniqid]);
            for (var a = 0; a < positions.length; a++) {
                var position = positions[a];
                if (!MAIN.loadpositions[uniqid][position]) ok = false;
            };
            if (ok) {
                // Everything was loaded!
                for (var a = 0; a < positions.length; a++) {
                    var position = positions[a];
                    TEMPLATES.appendNodeContents('ul#' + uniqid + '-results',
                        MAIN.loadpositions[uniqid][position].html,
                        MAIN.loadpositions[uniqid][position].js
                    );
                };
            }
        },
        /**
         * Loads a specific template.
         */
        searchTemplate: function(uniqid, position, template, o) {
            console.log('Call template', template, ' for object ', o);
            var MAIN = this;
            if (typeof MAIN.loadpositions[uniqid] === 'undefined') {
                MAIN.loadpositions[uniqid] = [];
            }
            MAIN.loadpositions[uniqid][position] = false;
            TEMPLATES
                .render(template, o)
                .then(function(html, js) {
                    console.log('Received a template', template, ' for object', o);
                    MAIN.loadpositions[uniqid][position] = { html: html, js: js };
                    MAIN.searchPrint(uniqid);
                    //templates.appendNodeContents('ul#' + o.uniqid + '-results', html, js);
                }).fail(function(ex) {
                    console.error(ex);
                });
        },
        triggerActive: function(packageid, type, sender){
            var self = this;
            console.log({packageid: packageid, type: type, to: $(sender).is(':checked') ? 1 : 0 });
            AJAX.call([{
                methodname: 'block_edupublisher_trigger_active',
                args: {packageid: packageid, type: type, to: $(sender).is(':checked') ? 1 : 0 },
                done: function(result) {
                    console.log(type, result);
                    try {
                        result = JSON.parse(result);
                        var chans = Object.keys(result);
                        for (var a = 0; a < chans.length; a++) {
                            var x = chans[a].split('_');
                            var type = x[0];
                            if (parseInt(result[chans[a]]) == 1) {
                                $('#channel-' + type).addClass('channel-active').removeClass('channel-inactive');
                                $('#channel-' + type + '-active').prop('checked', true);
                            } else {
                                $('#channel-' + type).addClass('channel-inactive').removeClass('channel-active');
                                $('#channel-' + type + '-active').prop('checked', false);
                            }
                        }
                    } catch(e) {
                        console.error('Invalid response');
                    }

                    // Not necessary, ui confirms via active/inactive classes
                    //self.triggerConfirm($(sender).parent(), 1, 'success');
                },
                fail: NOTIFICATION.exception
            }]);
        },
        triggerRating: function(uniqid, packageid, to) {
            var self = this;
            console.log({packageid: packageid, to: to});
            AJAX.call([{
                methodname: 'block_edupublisher_rate',
                args: {packageid: packageid, to: to },
                done: function(result) {
                    console.log(packageid, result);
                    $('#' + uniqid + '-ratingcount').html(result.amount);
                    for (var a = 1; a <= 5; a++) {
                        //console.log('Set image of #' + uniqid + '-rating-' + a + 'to /blocks/edupublisher/pix/star_' + ((result.average >= a) ? 1 : 0) + '_' + ((result.current == a) ? 1 : 0) + '.png');
                        $('#' + uniqid + '-rating-' + a).attr('src', '/blocks/edupublisher/pix/star_' + ((result.average >= a) ? 1 : 0) + '_' + ((result.current == a) ? 1 : 0) + '.png');
                    }
                },
                fail: NOTIFICATION.exception
            }]);
        },
        triggerConfirm: function(sender, step, type) {
            var self = this;
            if (step == 1) {
                $(sender).addClass('block-edupublisher-' + type);
                setTimeout(function() { self.triggerConfirm(sender, 0, type)  }, 2000);
            } else {
                $(sender).removeClass('block-edupublisher-' + type);
            }
        },
        watchValue: function(o, interval) {
            if (this.debug > 5) console.log('MAIN.watchValue(o, interval)', o, interval);
            if (typeof interval === 'undefined') interval = 1000;
            var self = this;

            if ($(o.target).attr('data-iswatched') != '1') {
                $(o.target).attr('data-iswatched', 1);

                o.interval = setInterval(
                    function() {
                         if ($(o.target).val() == o.compareto) {
                            o.run();
                            clearInterval(o.interval);
                            $(o.target).attr('data-iswatched', 0);
                         } else {
                            o.compareto = $(o.target).val();
                         }
                    },
                    interval
                );
            }
        },
    };
});
