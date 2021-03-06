angular.module('unibuddyTimetable.exporter', [
        'colorAllocator'
    ])


    // TODO(TobiasWooldridge): This shouldn't be a constant.
    .constant("timezone", "Australia/Adelaide")

    .factory('gcalExporter', function(calendarClient, moment, timezone, colorAllocator) {
        function recurrenceUntil(until) {
            return "RRULE:FREQ=WEEKLY;UNTIL=" + until.format("YYYYMMDDTHHmmss\\Z");
        }

        function mTime(date, time, timezone) {
            var offset = moment(date).tz(timezone).format("Z");
            return moment(date + " " + time + " " + offset).tz(timezone);
        }

        function gcalTime(date, time, timezone) {
            return { timeZone: timezone, dateTime: mTime(date, time, timezone).format() };
        }

        function stringifyRoom(room) {
            if (!room) {
                return "";
            }

            return room.name + " (" + room.fullName + ")";
        }

        function createGcalEntriesForTopic(topic) {
            var entries = [];

            angular.forEach(topic.classes, function (classType) {
                if (!classType.activeClassGroup) {
                    return true;
                }

                // and for each class activity
                angular.forEach(classType.activeClassGroup.activities, function (activity) {
                    var summary = classType.name + " - " + topic.name + " (" + topic.code + ")";

                    var entry = {
                        summary: summary,
                        start: gcalTime(activity.firstDay, activity.timeStartsAt, timezone),
                        end: gcalTime(activity.firstDay, activity.timeEndsAt, timezone),
                        location : stringifyRoom(activity.room)
                    };

                    if (activity.firstDay != activity.lastDay) {
                        entry.recurrence = [ recurrenceUntil(mTime(activity.lastDay, activity.timeEndsAt, timezone)) ];
                    }

                    entries.push(entry);
                });
            });

            return entries;
        }

        function createGcalEntriesForTopics(topics) {
            var entries = [];

            angular.forEach(topics, function(topic) {
                entries = entries.concat(createGcalEntriesForTopic(topic));
            });

            return entries;
        }

        function addEntryToCalendar(calendar, entry, callback) {
            calendarClient.createEvent(calendar.id, entry, callback);
        }

        function addEntriesToCalendar(calendar, entries, percentageCallback) {
            var addedEntries = 0;

            angular.forEach(entries, function (entry) {
                addEntryToCalendar(calendar, entry, function() {
                    addedEntries++;

                    if (percentageCallback) {
                        percentageCallback(100 * addedEntries / entries.length);
                    }
                });
            });
        }



        var gcalExporter = {};

        gcalExporter.authorize = calendarClient.authorizeUser;

        gcalExporter.createCalendar = function createCalendar(name, callback) {
            calendarClient.createCalendar(name, callback);
        };

        gcalExporter.exportTopicsToCalendar = function exportTopicsToCalendar(calendar, topics, percentageCallback) {
            var entries = createGcalEntriesForTopics(topics);
            addEntriesToCalendar(calendar, entries, percentageCallback);
        };

        gcalExporter.listCalendars = calendarClient.listCalendars;

        return gcalExporter;
    })
;