/*
 * ADHD Flow Widget — Shared Utilities
 * Copyright © 2026 jmenichole (J Chapman). All rights reserved.
 * Author: jmenichole <j.chapman7@yahoo.com>
 * GitHub: https://github.com/jmenichole
 *
 * Unauthorized copying, distribution, or modification of this software is prohibited.
 * This software is proprietary and confidential.
 */

/* js/util.js — Shared helpers (loaded before all other modules) */
'use strict';

/**
 * Escape a value for safe interpolation into innerHTML.
 * Coerces non-strings to string and escapes the five significant HTML chars.
 * Use this for ANY user-, calendar-, or AI-derived content rendered via innerHTML.
 */
function escapeHtml(value) {
    const str = value == null ? '' : String(value);
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Expose globally for the non-bundled script environment.
window.escapeHtml = escapeHtml;
