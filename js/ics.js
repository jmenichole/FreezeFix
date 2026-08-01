/*
 * ADHD Flow Widget — iCalendar Parser Module
 * Copyright © 2026 jmenichole (J Chapman). All rights reserved.
 * Author: jmenichole <j.chapman7@yahoo.com>
 * GitHub: https://github.com/jmenichole
 * 
 * Unauthorized copying, distribution, or modification of this software is prohibited.
 * This software is proprietary and confidential.
 */

/* js/ics.js — iCalendar .ics parser & generator */
'use strict';

const ICSParser = (() => {
    function parseICS(text) {
        const events = [];
        const lines = text.split(/\r\n|\n|\r/);
        let inEvent = false;
        let current = {};

        for (let line of lines) {
            line = line.trim();
            if (line === 'BEGIN:VEVENT') {
                inEvent = true;
                current = {};
            } else if (line === 'END:VEVENT') {
                if (inEvent && current.summary) {
                    events.push(current);
                }
                inEvent = false;
            } else if (inEvent) {
                if (line.startsWith('SUMMARY:')) {
                    current.summary = line.substring(8).replace(/\\,/g, ',').replace(/\\;/g, ';');
                } else if (line.startsWith('DTSTART')) {
                    current.start = _parseDateStr(line.split(':')[1]);
                } else if (line.startsWith('DTEND')) {
                    current.end = _parseDateStr(line.split(':')[1]);
                } else if (line.startsWith('DESCRIPTION:')) {
                    current.description = line.substring(12).replace(/\\n/g, '\n').replace(/\\,/g, ',');
                }
            }
        }

        return events.map(e => {
            let dur = 30;
            if (e.start && e.end) {
                dur = Math.round((e.end - e.start) / 60000);
                if (dur <= 0 || isNaN(dur)) dur = 30;
            }
            return {
                name: e.summary || 'Calendar Event',
                category: 'work',
                priority: 3,
                duration: dur,
                scheduledStart: e.start ? e.start.toISOString() : null,
                scheduledEnd: e.end ? e.end.toISOString() : null,
                notes: e.description || 'Imported from Google Calendar',
                fromCalendar: true
            };
        });
    }

    function _parseDateStr(val) {
        if (!val) return null;
        val = val.trim();
        // YYYYMMDDTHHMMSSZ or YYYYMMDD
        if (val.length >= 8) {
            const y = parseInt(val.substring(0,4), 10);
            const m = parseInt(val.substring(4,6), 10) - 1;
            const d = parseInt(val.substring(6,8), 10);
            if (val.includes('T')) {
                const t = val.split('T')[1];
                const hh = parseInt(t.substring(0,2), 10);
                const mm = parseInt(t.substring(2,4), 10);
                const ss = parseInt(t.substring(4,6), 10) || 0;
                if (val.endsWith('Z')) {
                    return new Date(Date.UTC(y, m, d, hh, mm, ss));
                }
                return new Date(y, m, d, hh, mm, ss);
            }
            return new Date(y, m, d, 9, 0, 0);
        }
        return null;
    }

    return { parseICS };
})();
