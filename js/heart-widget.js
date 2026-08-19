/*
 * ADHD Flow Widget — Heart mini-widget launcher (main window)
 * Copyright © 2026 jmenichole (J Chapman). All rights reserved.
 * Author: jmenichole <j.chapman7@yahoo.com>
 * GitHub: https://github.com/jmenichole
 *
 * Unauthorized copying, distribution, or modification of this software is prohibited.
 * This software is proprietary and confidential.
 */

/* js/heart-widget.js — opens the floating heart mini-widget window.
   Externalized from index.html so a strict `script-src 'self'` CSP can be used. */
'use strict';

function openHeartWidget() {
    window.open('heart.html', 'ADHDHeart',
        'width=90,height=90,resizable=no,scrollbars=no,toolbar=no,menubar=no,location=no,status=no');
}

window.openHeartWidget = openHeartWidget;
